import re
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.basededatos import get_db
from app import models
from app.schemas import (
    OrganizacionRespuesta,
    OrganizacionEditarPerfil,
)
from app.utils.jwt import requiere_gestionar_organizacion

# R10.3 — este router se queda con lo que es de la ORGANIZACIÓN (nombre,
# logo, color): solo lo puede tocar un ADMIN_ORG, o el camino viejo
# (Organizacion — admin de plataforma, u organizaciones cliente todavía sin
# migrar a Usuario por R10.4, que siempre tuvieron este acceso sin
# restricción). Lo que es de la CUENTA propia (correo, password) se movió a
# cuenta.py — mismo prefix "/organizaciones", cero cambios de URL para el
# frontend (Perfil.jsx, AdminConfig.jsx).
router = APIRouter(prefix="/organizaciones", tags=["Organizaciones"])

CARPETA_LOGOS = Path("uploads/logos")
CARPETA_LOGOS.mkdir(parents=True, exist_ok=True)
EXTENSIONES_VALIDAS = {".png", ".jpg", ".jpeg"}
TAMANO_MAX = 2 * 1024 * 1024


def _correo_disponible(db: Session, correo: str, excluir_organizacion_id: int) -> bool:
    """
    Mismo chequeo cruzado de R10.2 (usuarios.py): el correo de una
    Organizacion también tiene que ser único contra `usuarios.correo`, o un
    Usuario nuevo con ese mismo correo le robaría el login (POST /auth/login
    busca primero en `usuarios`).
    """
    en_usuarios = db.query(models.Usuario).filter(models.Usuario.correo == correo).first()
    if en_usuarios:
        return False
    en_organizaciones = (
        db.query(models.Organizacion)
        .filter(
            models.Organizacion.correo == correo,
            models.Organizacion.id != excluir_organizacion_id,
        )
        .first()
    )
    return en_organizaciones is None


@router.put(
    "/perfil", response_model=OrganizacionRespuesta, summary="Editar nombre y correo de la organización"
)
def editar_perfil(
    datos: OrganizacionEditarPerfil,
    db: Session = Depends(get_db),
    organizacion: models.Organizacion = Depends(requiere_gestionar_organizacion),
):
    """
    Actualiza nombre y/o correo de la organización (R10.3: solo ADMIN_ORG o
    el camino viejo — antes era "cualquiera con sesión", ahora nombre/correo
    de la organización quedan del lado de quien administra la organización).
    - Valida que el nuevo correo no esté en uso por otra Organizacion NI por
      ningún Usuario (ver _correo_disponible).
    - Solo actualiza los campos que llegaron (los None no se tocan).
    """
    if datos.correo is not None:
        if not _correo_disponible(db, datos.correo, organizacion.id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El correo ya está en uso",
            )
        organizacion.correo = datos.correo

    if datos.nombre is not None:
        organizacion.nombre = datos.nombre

    db.commit()
    db.refresh(organizacion)
    return organizacion


# ── Logo ─────────────────────────────────────────────────────────────────

@router.post("/logo", summary="Subir logo de la organización")
def subir_logo(
    archivo: UploadFile = File(...),
    db: Session = Depends(get_db),
    organizacion: models.Organizacion = Depends(requiere_gestionar_organizacion),
):
    ext = Path(archivo.filename).suffix.lower()
    if ext not in EXTENSIONES_VALIDAS:
        raise HTTPException(400, "Formato no válido. Usa PNG o JPG.")

    contenido = archivo.file.read()
    if len(contenido) > TAMANO_MAX:
        raise HTTPException(400, "El archivo excede el tamaño máximo de 2 MB.")

    # organizacion.id: mismo valor de siempre para el camino viejo (antes era
    # usuario_actual.id, que YA era el organizacion_id) — los logos ya
    # subidos siguen siendo válidos, no hace falta migrar archivos.
    nombre_archivo = f"{organizacion.id}{ext}"
    ruta = CARPETA_LOGOS / nombre_archivo
    ruta.write_bytes(contenido)

    organizacion.logo_ruta = str(ruta)
    db.commit()

    return {"mensaje": "Logo subido correctamente.", "logo_ruta": str(ruta)}


@router.delete("/logo", summary="Eliminar logo de la organización")
def eliminar_logo(
    db: Session = Depends(get_db),
    organizacion: models.Organizacion = Depends(requiere_gestionar_organizacion),
):
    if organizacion.logo_ruta:
        ruta = Path(organizacion.logo_ruta)
        if ruta.exists():
            ruta.unlink()
    organizacion.logo_ruta = None
    db.commit()
    return {"mensaje": "Logo eliminado."}


@router.get("/logo", summary="Obtener logo de la organización")
def obtener_logo(
    organizacion: models.Organizacion = Depends(requiere_gestionar_organizacion),
):
    if not organizacion.logo_ruta or not Path(organizacion.logo_ruta).exists():
        raise HTTPException(404, "No hay logo configurado.")
    return FileResponse(organizacion.logo_ruta)


# ── Color institucional ──────────────────────────────────────────────────

class ColorInput(BaseModel):
    color: str

@router.put("/color", summary="Cambiar color institucional")
def cambiar_color(
    datos: ColorInput,
    db: Session = Depends(get_db),
    organizacion: models.Organizacion = Depends(requiere_gestionar_organizacion),
):
    color = datos.color.strip()
    if not re.match(r'^#[0-9a-fA-F]{6}$', color):
        raise HTTPException(400, "Formato inválido. Usa formato hex: #7030A0")

    organizacion.color_institucional = color
    db.commit()
    return {"mensaje": "Color actualizado.", "color": color}
