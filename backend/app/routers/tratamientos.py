from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.basededatos import get_db
from app.utils.jwt import obtener_usuario_actual
from app import models
from app.schemas import TratamientoListado, TratamientoEditar, TratamientoCrear

router = APIRouter(prefix="/tratamientos", tags=["tratamientos"])


@router.post("", response_model=TratamientoListado, status_code=201)
def crear_tratamiento(
    datos: TratamientoCrear,
    usuario=Depends(obtener_usuario_actual),
    db: Session = Depends(get_db)
):
    nuevo = models.Tratamiento(
        organizacion_id=usuario.id,
        tipo=datos.tipo,
        estado="PENDIENTE",
        nivel_riesgo=datos.nivel_riesgo or "BAJO",
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo


@router.get("", response_model=list[TratamientoListado])
def listar_tratamientos(
    nivel_riesgo: Optional[str] = None,
    estado: Optional[str] = None,
    usuario=Depends(obtener_usuario_actual),
    db: Session = Depends(get_db)
):
    """
    Devuelve los tratamientos de la organización autenticada.
    Nunca devuelve tratamientos de otras organizaciones.
    Filtros opcionales: nivel_riesgo (BAJO, MEDIO, ALTO) y estado (PENDIENTE, COMPLETO).
    """
    query = db.query(models.Tratamiento).filter(
        models.Tratamiento.organizacion_id == usuario.id
    )

    if nivel_riesgo:
        query = query.filter(models.Tratamiento.nivel_riesgo == nivel_riesgo.upper())

    if estado:
        query = query.filter(models.Tratamiento.estado == estado.upper())

    return query.order_by(models.Tratamiento.fecha.desc()).all()


@router.get("/{tratamiento_id}", response_model=TratamientoListado)
def obtener_tratamiento(
    tratamiento_id: int,
    usuario=Depends(obtener_usuario_actual),
    db: Session = Depends(get_db)
):
    """Devuelve un tratamiento por id. Solo si pertenece a la organización del token."""
    tratamiento = db.query(models.Tratamiento).filter(
        models.Tratamiento.id == tratamiento_id,
        models.Tratamiento.organizacion_id == usuario.id
    ).first()

    if not tratamiento:
        raise HTTPException(status_code=404, detail="Tratamiento no encontrado.")

    return tratamiento


@router.put("/{tratamiento_id}", response_model=TratamientoListado)
def editar_tratamiento(
    tratamiento_id: int,
    datos: TratamientoEditar,
    usuario=Depends(obtener_usuario_actual),
    db: Session = Depends(get_db)
):
    """Edita un tratamiento existente. Solo si pertenece a la organización del token."""
    tratamiento = db.query(models.Tratamiento).filter(
        models.Tratamiento.id == tratamiento_id,
        models.Tratamiento.organizacion_id == usuario.id
    ).first()

    if not tratamiento:
        raise HTTPException(status_code=404, detail="Tratamiento no encontrado.")

    if datos.tipo is not None:
        tratamiento.tipo = datos.tipo
    if datos.estado is not None:
        tratamiento.estado = datos.estado.upper()
    if datos.nivel_riesgo is not None:
        tratamiento.nivel_riesgo = datos.nivel_riesgo.upper()

    db.commit()
    db.refresh(tratamiento)
    return tratamiento


@router.delete("/{tratamiento_id}")
def eliminar_tratamiento(
    tratamiento_id: int,
    usuario=Depends(obtener_usuario_actual),
    db: Session = Depends(get_db)
):
    """
    Elimina un tratamiento y sus campos_rat asociados.
    Solo se puede eliminar si pertenece a la organización del token.
    """
    tratamiento = db.query(models.Tratamiento).filter(
        models.Tratamiento.id == tratamiento_id,
        models.Tratamiento.organizacion_id == usuario.id
    ).first()

    if not tratamiento:
        raise HTTPException(status_code=404, detail="Tratamiento no encontrado.")

    # Los campos_rat se eliminan automáticamente por cascade="all, delete-orphan"
    db.delete(tratamiento)
    db.commit()

    return {"mensaje": "Tratamiento eliminado correctamente.", "id": tratamiento_id}
