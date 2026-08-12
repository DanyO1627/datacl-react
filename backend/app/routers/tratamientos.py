from pathlib import Path
from typing import Optional
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.basededatos import get_db
from app.utils.jwt import obtener_usuario_actual
from app import models
from app.schemas import (
    TratamientoCrear,
    TratamientoEditar,
    TratamientoRespuesta,
    TratamientoListado,
    CampoRatRespuesta,
    VersionTratamientoResumen,
    VersionTratamientoDetalle,
)
from app.services import tratamientos_service as svc

router = APIRouter(prefix="/tratamientos", tags=["Tratamientos"])

# Imagen del proceso asociado (R8.2), mismo patrón de validación que el
# logo de organizaciones.py, carpeta hermana dentro del mismo volumen de R8.0.
CARPETA_PROCESOS = Path("uploads/procesos")
CARPETA_PROCESOS.mkdir(parents=True, exist_ok=True)
EXTENSIONES_VALIDAS = {".png", ".jpg", ".jpeg"}
TAMANO_MAX = 2 * 1024 * 1024  # 2 MB


@router.post(
    "",
    response_model=TratamientoRespuesta,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar nuevo tratamiento RAT",
)
def crear_tratamiento(
    datos: TratamientoCrear,
    db: Session = Depends(get_db),
    usuario: models.Organizacion = Depends(obtener_usuario_actual),
):
    return svc.crear_tratamiento(db, datos, usuario.id)


@router.get("", response_model=list[TratamientoListado])
def listar_tratamientos(
    nivel_riesgo: Optional[str] = None,
    estado: Optional[str] = None,
    usuario=Depends(obtener_usuario_actual),
    db: Session = Depends(get_db),
):
    return svc.listar_tratamientos(db, usuario.id, nivel_riesgo, estado)


@router.get("/{tratamiento_id}", response_model=TratamientoRespuesta)
def obtener_tratamiento(
    tratamiento_id: int,
    usuario=Depends(obtener_usuario_actual),
    db: Session = Depends(get_db),
):
    tratamiento = svc.obtener_tratamiento_por_id(db, tratamiento_id, usuario.id)
    if not tratamiento:
        raise HTTPException(status_code=404, detail="Tratamiento no encontrado.")
    return tratamiento


@router.put("/{tratamiento_id}", response_model=TratamientoRespuesta)
def editar_tratamiento(
    tratamiento_id: int,
    datos: TratamientoEditar,
    usuario=Depends(obtener_usuario_actual),
    db: Session = Depends(get_db),
):
    tratamiento = svc.editar_tratamiento(db, tratamiento_id, datos, usuario.id)
    if not tratamiento:
        raise HTTPException(status_code=404, detail="Tratamiento no encontrado.")
    return tratamiento


@router.post("/{tratamiento_id}/evaluar", response_model=TratamientoRespuesta)
def evaluar_tratamiento(
    tratamiento_id: int,
    usuario=Depends(obtener_usuario_actual),
    db: Session = Depends(get_db),
):
    tratamiento = svc.evaluar_riesgo(db, tratamiento_id, usuario.id)
    if not tratamiento:
        raise HTTPException(status_code=404, detail="Tratamiento no encontrado.")
    return tratamiento


@router.delete("/{tratamiento_id}")
def eliminar_tratamiento(
    tratamiento_id: int,
    usuario=Depends(obtener_usuario_actual),
    db: Session = Depends(get_db),
):
    eliminado = svc.eliminar_tratamiento(db, tratamiento_id, usuario.id)
    if not eliminado:
        raise HTTPException(status_code=404, detail="Tratamiento no encontrado.")
    return {"mensaje": "Tratamiento eliminado correctamente.", "id": tratamiento_id}


@router.get("/{tratamiento_id}/campos", response_model=list[CampoRatRespuesta])
def obtener_campos_rat(
    tratamiento_id: int,
    usuario=Depends(obtener_usuario_actual),
    db: Session = Depends(get_db),
):
    tratamiento = svc.obtener_tratamiento_por_id(db, tratamiento_id, usuario.id)
    if not tratamiento:
        raise HTTPException(status_code=404, detail="Tratamiento no encontrado.")
    return (
        db.query(models.CampoRat)
        .filter(models.CampoRat.tratamiento_id == tratamiento_id)
        .all()
    )


@router.get("/{tratamiento_id}/versiones", response_model=list[VersionTratamientoResumen])
def listar_versiones_tratamiento(
    tratamiento_id: int,
    usuario=Depends(obtener_usuario_actual),
    db: Session = Depends(get_db),
):
    # Primero se verifica que el tratamiento sea de la organización logueada
    # (devuelve none si no existe o es de otra org) para evitar que cualquiera acceda a cualquiera.
    tratamiento = svc.obtener_tratamiento_por_id(db, tratamiento_id, usuario.id)
    if not tratamiento:
        raise HTTPException(status_code=404, detail="Tratamiento no encontrado.")
    return svc.obtener_versiones(db, tratamiento_id)


@router.get("/{tratamiento_id}/versiones/{numero}", response_model=VersionTratamientoDetalle)
def obtener_version_tratamiento(
    tratamiento_id: int,
    numero: int,
    usuario=Depends(obtener_usuario_actual),
    db: Session = Depends(get_db),
):
    # Misma revisión de pertenencia que en el listado, antes de ir a buscar la versión que busca
    tratamiento = svc.obtener_tratamiento_por_id(db, tratamiento_id, usuario.id)
    if not tratamiento:
        raise HTTPException(status_code=404, detail="Tratamiento no encontrado.")
    version = svc.obtener_version_por_numero(db, tratamiento_id, numero)
    if not version:
        raise HTTPException(status_code=404, detail="Versión no encontrada.")
    return version


# Imagen del proceso asociado R8.2
# A diferencia del logo de organizaciones.py (siempre del usuario logueado),
# acá hay que verificar que el tratamiento sea de la organización que llama
# antes de dejarla subir/ver/borrar la imagen, porque si no, cualquiera podría
# tocar la imagen de un tratamiento ajeno adivinando el id.

@router.post("/{tratamiento_id}/imagen-proceso", summary="Subir imagen del proceso asociado")
def subir_imagen_proceso(
    tratamiento_id: int,
    archivo: UploadFile = File(...),
    usuario=Depends(obtener_usuario_actual),
    db: Session = Depends(get_db),
):
    tratamiento = svc.obtener_tratamiento_por_id(db, tratamiento_id, usuario.id)
    if not tratamiento:
        raise HTTPException(status_code=404, detail="Tratamiento no encontrado.")

    ext = Path(archivo.filename).suffix.lower()
    if ext not in EXTENSIONES_VALIDAS:
        raise HTTPException(400, "Formato no válido. Usa PNG o JPG.")

    contenido = archivo.file.read()
    if len(contenido) > TAMANO_MAX:
        raise HTTPException(400, "El archivo excede el tamaño máximo de 2 MB.")

    nombre_archivo = f"{tratamiento_id}{ext}"
    ruta = CARPETA_PROCESOS / nombre_archivo
    ruta.write_bytes(contenido)

    if tratamiento.detalle_extendido is None:
        tratamiento.detalle_extendido = models.DetalleRatExtendido(
            tratamiento_id=tratamiento.id, imagen_proceso=str(ruta)
        )
    else:
        tratamiento.detalle_extendido.imagen_proceso = str(ruta)
    db.commit()

    return {"mensaje": "Imagen subida correctamente.", "imagen_proceso": str(ruta)}


@router.delete("/{tratamiento_id}/imagen-proceso", summary="Eliminar imagen del proceso asociado")
def eliminar_imagen_proceso(
    tratamiento_id: int,
    usuario=Depends(obtener_usuario_actual),
    db: Session = Depends(get_db),
):
    tratamiento = svc.obtener_tratamiento_por_id(db, tratamiento_id, usuario.id)
    if not tratamiento:
        raise HTTPException(status_code=404, detail="Tratamiento no encontrado.")

    if tratamiento.detalle_extendido and tratamiento.detalle_extendido.imagen_proceso:
        ruta = Path(tratamiento.detalle_extendido.imagen_proceso)
        if ruta.exists():
            ruta.unlink()
        tratamiento.detalle_extendido.imagen_proceso = None
        db.commit()

    return {"mensaje": "Imagen eliminada."}


@router.get("/{tratamiento_id}/imagen-proceso", summary="Obtener imagen del proceso asociado")
def obtener_imagen_proceso(
    tratamiento_id: int,
    usuario=Depends(obtener_usuario_actual),
    db: Session = Depends(get_db),
):
    tratamiento = svc.obtener_tratamiento_por_id(db, tratamiento_id, usuario.id)
    if not tratamiento:
        raise HTTPException(status_code=404, detail="Tratamiento no encontrado.")

    ruta_str = tratamiento.detalle_extendido.imagen_proceso if tratamiento.detalle_extendido else None
    if not ruta_str or not Path(ruta_str).exists():
        raise HTTPException(status_code=404, detail="No hay imagen de proceso configurada.")
    return FileResponse(ruta_str)
