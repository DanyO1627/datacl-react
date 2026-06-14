from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
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
    # Mismo chequeo de pertenencia que en el listado, antes de ir a buscar la versión que busca
    tratamiento = svc.obtener_tratamiento_por_id(db, tratamiento_id, usuario.id)
    if not tratamiento:
        raise HTTPException(status_code=404, detail="Tratamiento no encontrado.")
    version = svc.obtener_version_por_numero(db, tratamiento_id, numero)
    if not version:
        raise HTTPException(status_code=404, detail="Versión no encontrada.")
    return version
