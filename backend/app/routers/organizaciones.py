import re
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from pydantic import BaseModel

from app.basededatos import get_db
from app import models
from app.schemas import (
    OrganizacionRespuesta,
    OrganizacionEditarPerfil,
    OrganizacionCambiarPassword,
)
from app.utils.jwt import obtener_usuario_actual

router = APIRouter(prefix="/organizaciones", tags=["Organizaciones"])

CARPETA_LOGOS = Path("uploads/logos")
CARPETA_LOGOS.mkdir(parents=True, exist_ok=True)
EXTENSIONES_VALIDAS = {".png", ".jpg", ".jpeg"}
TAMANO_MAX = 2 * 1024 * 1024

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


@router.put(
    "/perfil", response_model=OrganizacionRespuesta, summary="Editar nombre y correo"
)
def editar_perfil(
    datos: OrganizacionEditarPerfil,
    db: Session = Depends(get_db),
    usuario_actual: models.Organizacion = Depends(obtener_usuario_actual),
):
    """
    Actualiza nombre y/o correo de la organización autenticada.
    - Valida que el nuevo correo no esté en uso por otra organización
    - Solo actualiza los campos que llegaron (los None no se tocan)
    """
    if datos.correo is not None:
        # Verificar que el correo no lo use OTRA organización
        # El id != usuario_actual.id evita que falle si el usuario manda su mismo correo
        correo_en_uso = (
            db.query(models.Organizacion)
            .filter(
                models.Organizacion.correo == datos.correo,
                models.Organizacion.id != usuario_actual.id,
            )
            .first()
        )
        if correo_en_uso:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El correo ya está en uso por otra organización",
            )
        usuario_actual.correo = datos.correo

    if datos.nombre is not None:
        usuario_actual.nombre = datos.nombre

    db.commit()
    db.refresh(usuario_actual)
    return usuario_actual


@router.put("/password", summary="Cambiar contraseña")
def cambiar_password(
    datos: OrganizacionCambiarPassword,
    db: Session = Depends(get_db),
    usuario_actual: models.Organizacion = Depends(obtener_usuario_actual),
):
    """
    Cambia la contraseña de la organización autenticada.
    """

    # Verificar contraseña actual
    if not pwd_context.verify(datos.password_actual, usuario_actual.password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La contraseña actual es incorrecta",
        )

    # Verificar que no sea igual
    if pwd_context.verify(datos.password_nueva, usuario_actual.password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La nueva contraseña debe ser diferente a la actual",
        )

    # Hashear nueva contraseña
    nueva_password = pwd_context.hash(datos.password_nueva)
    usuario_actual.password = nueva_password

    db.commit()

    return {"mensaje": "Contraseña actualizada correctamente"}


# ── Logo ─────────────────────────────────────────────────────────────────

@router.post("/logo", summary="Subir logo de la organización")
def subir_logo(
    archivo: UploadFile = File(...),
    db: Session = Depends(get_db),
    usuario_actual: models.Organizacion = Depends(obtener_usuario_actual),
):
    ext = Path(archivo.filename).suffix.lower()
    if ext not in EXTENSIONES_VALIDAS:
        raise HTTPException(400, "Formato no válido. Usa PNG o JPG.")

    contenido = archivo.file.read()
    if len(contenido) > TAMANO_MAX:
        raise HTTPException(400, "El archivo excede el tamaño máximo de 2 MB.")

    nombre_archivo = f"{usuario_actual.id}{ext}"
    ruta = CARPETA_LOGOS / nombre_archivo
    ruta.write_bytes(contenido)

    usuario_actual.logo_ruta = str(ruta)
    db.commit()

    return {"mensaje": "Logo subido correctamente.", "logo_ruta": str(ruta)}


@router.delete("/logo", summary="Eliminar logo de la organización")
def eliminar_logo(
    db: Session = Depends(get_db),
    usuario_actual: models.Organizacion = Depends(obtener_usuario_actual),
):
    if usuario_actual.logo_ruta:
        ruta = Path(usuario_actual.logo_ruta)
        if ruta.exists():
            ruta.unlink()
    usuario_actual.logo_ruta = None
    db.commit()
    return {"mensaje": "Logo eliminado."}


@router.get("/logo", summary="Obtener logo de la organización")
def obtener_logo(
    usuario_actual: models.Organizacion = Depends(obtener_usuario_actual),
):
    if not usuario_actual.logo_ruta or not Path(usuario_actual.logo_ruta).exists():
        raise HTTPException(404, "No hay logo configurado.")
    return FileResponse(usuario_actual.logo_ruta)


# ── Color institucional ──────────────────────────────────────────────────

class ColorInput(BaseModel):
    color: str

@router.put("/color", summary="Cambiar color institucional")
def cambiar_color(
    datos: ColorInput,
    db: Session = Depends(get_db),
    usuario_actual: models.Organizacion = Depends(obtener_usuario_actual),
):
    color = datos.color.strip()
    if not re.match(r'^#[0-9a-fA-F]{6}$', color):
        raise HTTPException(400, "Formato inválido. Usa formato hex: #7030A0")

    usuario_actual.color_institucional = color
    db.commit()
    return {"mensaje": "Color actualizado.", "color": color}