from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.basededatos import get_db
from app.utils.jwt import obtener_usuario_actual
from app import models
from app.schemas import (
    SesionAnalisisCrear,
    SesionAnalisisRespuesta,
    ActualizarEstadoSesion,
)

router = APIRouter(prefix="/sesiones", tags=["Sesiones"])


def _to_response(s: models.SesionAnalisis) -> SesionAnalisisRespuesta:
    return SesionAnalisisRespuesta(
        id=s.id,
        organizacion_id=s.organizacion_id,
        nombre=s.nombre,
        fuente=s.fuente,
        motor_bd=s.motor_bd,
        columnas_json=s.columnas_json,
        estado=s.estado,
        creado_en=s.creado_en,
        num_actividades=len(s.sesiones_actividad),
    )


@router.post("", response_model=SesionAnalisisRespuesta, status_code=status.HTTP_201_CREATED)
def crear_sesion(
    datos: SesionAnalisisCrear,
    db: Session = Depends(get_db),
    usuario: models.Organizacion = Depends(obtener_usuario_actual),
):
    sesion = models.SesionAnalisis(
        organizacion_id=usuario.id,
        nombre=datos.nombre,
        fuente=datos.fuente,
        motor_bd=datos.motor_bd,
        columnas_json=datos.columnas_json,
    )
    db.add(sesion)
    db.commit()
    db.refresh(sesion)
    return _to_response(sesion)


@router.get("", response_model=list[SesionAnalisisRespuesta])
def listar_sesiones(
    db: Session = Depends(get_db),
    usuario: models.Organizacion = Depends(obtener_usuario_actual),
):
    sesiones = (
        db.query(models.SesionAnalisis)
        .options(joinedload(models.SesionAnalisis.sesiones_actividad))
        .filter(models.SesionAnalisis.organizacion_id == usuario.id)
        .order_by(models.SesionAnalisis.creado_en.desc())
        .all()
    )
    return [_to_response(s) for s in sesiones]


@router.get("/{sesion_id}", response_model=SesionAnalisisRespuesta)
def obtener_sesion(
    sesion_id: int,
    db: Session = Depends(get_db),
    usuario: models.Organizacion = Depends(obtener_usuario_actual),
):
    sesion = db.query(models.SesionAnalisis).filter(
        models.SesionAnalisis.id == sesion_id,
        models.SesionAnalisis.organizacion_id == usuario.id,
    ).first()
    if not sesion:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    return _to_response(sesion)


@router.patch("/{sesion_id}/estado", response_model=SesionAnalisisRespuesta)
def actualizar_estado(
    sesion_id: int,
    datos: ActualizarEstadoSesion,
    db: Session = Depends(get_db),
    usuario: models.Organizacion = Depends(obtener_usuario_actual),
):
    sesion = db.query(models.SesionAnalisis).filter(
        models.SesionAnalisis.id == sesion_id,
        models.SesionAnalisis.organizacion_id == usuario.id,
    ).first()
    if not sesion:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    sesion.estado = datos.estado
    db.commit()
    db.refresh(sesion)
    return _to_response(sesion)


@router.delete("/{sesion_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_sesion(
    sesion_id: int,
    db: Session = Depends(get_db),
    usuario: models.Organizacion = Depends(obtener_usuario_actual),
):
    sesion = db.query(models.SesionAnalisis).filter(
        models.SesionAnalisis.id == sesion_id,
        models.SesionAnalisis.organizacion_id == usuario.id,
    ).first()
    if not sesion:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    db.delete(sesion)
    db.commit()
