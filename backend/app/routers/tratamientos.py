from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.basededatos import get_db
from app.utils.jwt import obtener_usuario_actual
from app import models
from app.schemas import TratamientoCrear, TratamientoEditar, TratamientoRespuesta, TratamientoListado

router = APIRouter(prefix="/tratamientos", tags=["Tratamientos"])


@router.post(
    "",
    response_model=TratamientoRespuesta,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar nuevo tratamiento RAT"
)
def crear_tratamiento(
    datos: TratamientoCrear,
    db: Session = Depends(get_db),
    usuario_actual: models.Organizacion = Depends(obtener_usuario_actual)
):
    """
    Crea un nuevo tratamiento RAT asociado a la organización autenticada.
    - El organizacion_id viene del JWT, no del body
    - Estado siempre PENDIENTE al crear
    """
    nuevo_tratamiento = models.Tratamiento(
        organizacion_id          = usuario_actual.id,
        nombre                   = datos.nombre,
        finalidad                = datos.finalidad,
        base_legal               = datos.base_legal,
        datos_sensibles          = datos.datos_sensibles,
        destinatarios            = datos.destinatarios,
        plazo_conservacion       = datos.plazo_conservacion,
        medidas_seguridad        = datos.medidas_seguridad,
        sale_extranjero          = datos.sale_extranjero,
        decisiones_automatizadas = datos.decisiones_automatizadas,
        estado                   = "PENDIENTE"
    )
    db.add(nuevo_tratamiento)
    db.commit()
    db.refresh(nuevo_tratamiento)
    return nuevo_tratamiento


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
    Filtros opcionales: nivel_riesgo y estado.
    """
    query = db.query(models.Tratamiento).filter(
        models.Tratamiento.organizacion_id == usuario.id
    )
    if nivel_riesgo:
        query = query.filter(models.Tratamiento.nivel_riesgo == nivel_riesgo.upper())
    if estado:
        query = query.filter(models.Tratamiento.estado == estado.upper())

    return query.order_by(models.Tratamiento.creado_en.desc()).all()


@router.get("/{tratamiento_id}", response_model=TratamientoRespuesta)
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


@router.put("/{tratamiento_id}", response_model=TratamientoRespuesta)
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

    # Solo actualizamos los campos que llegaron — los None no se tocan
    if datos.nombre is not None:
        tratamiento.nombre = datos.nombre
    if datos.finalidad is not None:
        tratamiento.finalidad = datos.finalidad
    if datos.base_legal is not None:
        tratamiento.base_legal = datos.base_legal
    if datos.datos_sensibles is not None:
        tratamiento.datos_sensibles = datos.datos_sensibles
    if datos.destinatarios is not None:
        tratamiento.destinatarios = datos.destinatarios
    if datos.plazo_conservacion is not None:
        tratamiento.plazo_conservacion = datos.plazo_conservacion
    if datos.medidas_seguridad is not None:
        tratamiento.medidas_seguridad = datos.medidas_seguridad
    if datos.sale_extranjero is not None:
        tratamiento.sale_extranjero = datos.sale_extranjero
    if datos.decisiones_automatizadas is not None:
        tratamiento.decisiones_automatizadas = datos.decisiones_automatizadas
    if datos.nivel_riesgo is not None:
        tratamiento.nivel_riesgo = datos.nivel_riesgo.upper()
    if datos.estado is not None:
        tratamiento.estado = datos.estado.upper()

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
    Solo si pertenece a la organización del token.
    """
    tratamiento = db.query(models.Tratamiento).filter(
        models.Tratamiento.id == tratamiento_id,
        models.Tratamiento.organizacion_id == usuario.id
    ).first()

    if not tratamiento:
        raise HTTPException(status_code=404, detail="Tratamiento no encontrado.")

    db.delete(tratamiento)
    db.commit()
    return {"mensaje": "Tratamiento eliminado correctamente.", "id": tratamiento_id}