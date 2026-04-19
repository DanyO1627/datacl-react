from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.basededatos import get_db
from app.utils.jwt import obtener_usuario_actual
from app.utils.riesgo import calcular_probabilidad, calcular_impacto, determinar_nivel_riesgo
from app import models
from app.schemas import TratamientoCrear, TratamientoEditar, TratamientoRespuesta, TratamientoListado, CampoRatRespuesta

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
    probabilidad = calcular_probabilidad(datos)
    impacto      = calcular_impacto(datos)
    nivel_riesgo = determinar_nivel_riesgo(probabilidad, impacto)

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
        estado                   = "PENDIENTE",
        probabilidad             = probabilidad,
        impacto                  = impacto,
        nivel_riesgo             = nivel_riesgo,
        fecha_evaluacion         = datetime.now(),
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

    tratamiento.probabilidad     = calcular_probabilidad(tratamiento)
    tratamiento.impacto          = calcular_impacto(tratamiento)
    tratamiento.nivel_riesgo     = determinar_nivel_riesgo(tratamiento.probabilidad, tratamiento.impacto)
    tratamiento.fecha_evaluacion = datetime.now()

    db.commit()
    db.refresh(tratamiento)
    return tratamiento


@router.post("/{tratamiento_id}/evaluar", response_model=TratamientoRespuesta)
def evaluar_tratamiento(
    tratamiento_id: int,
    usuario=Depends(obtener_usuario_actual),
    db: Session = Depends(get_db)
):
    """Recalcula probabilidad, impacto y nivel_riesgo de un tratamiento existente."""
    tratamiento = db.query(models.Tratamiento).filter(
        models.Tratamiento.id == tratamiento_id,
        models.Tratamiento.organizacion_id == usuario.id
    ).first()

    if not tratamiento:
        raise HTTPException(status_code=404, detail="Tratamiento no encontrado.")

    tratamiento.probabilidad     = calcular_probabilidad(tratamiento)
    tratamiento.impacto          = calcular_impacto(tratamiento)
    tratamiento.nivel_riesgo     = determinar_nivel_riesgo(tratamiento.probabilidad, tratamiento.impacto)
    tratamiento.fecha_evaluacion = datetime.now()

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




@router.get("/{tratamiento_id}/campos", response_model=list[CampoRatRespuesta])
def obtener_campos_rat(
    tratamiento_id: int,
    usuario=Depends(obtener_usuario_actual),
    db: Session = Depends(get_db)
):
    """
    Devuelve todos los campos_rat de un tratamiento
    Primero verifica que el tratamiento pertenece a la organización del token
    Si no hay campos devuelve lista vacía (no error)
    """
    # Verificar que el tratamiento existe Y pertenece al usuario del token
    tratamiento = db.query(models.Tratamiento).filter(
        models.Tratamiento.id == tratamiento_id,
        models.Tratamiento.organizacion_id == usuario.id
    ).first()

    if not tratamiento:
        raise HTTPException(status_code=404, detail="Tratamiento no encontrado.")

    # Devolver los campos — si no hay, SQLAlchemy devuelve lista vacía automáticamente
    return db.query(models.CampoRat).filter(
        models.CampoRat.tratamiento_id == tratamiento_id
    ).all()