from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.basededatos import get_db
from app import models
from app.schemas import TratamientoCrear, TratamientoRespuesta
from app.utils.jwt import obtener_usuario_actual

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
    Crea un nuevo tratamiento RAT asociado a la organización autenticada
    - Requiere token JWT válido
    - El organizacion_id se obtiene del token, no del body — el usuario no puede crear tratamientos de otra organización
    - El estado siempre empieza como PENDIENTE sin importar lo que mande el frontend
    """
    nuevo_tratamiento = models.Tratamiento(
        organizacion_id          = usuario_actual.id,  # viene del JWT, no del body
        nombre                   = datos.nombre,
        finalidad                = datos.finalidad,
        base_legal               = datos.base_legal,
        datos_sensibles          = datos.datos_sensibles,
        destinatarios            = datos.destinatarios,
        plazo_conservacion       = datos.plazo_conservacion,
        medidas_seguridad        = datos.medidas_seguridad,
        sale_extranjero          = datos.sale_extranjero,
        decisiones_automatizadas = datos.decisiones_automatizadas,
        estado                   = "PENDIENTE"  # siempre PENDIENTE al crear  (explícito, no dependemos del default)
    )

    db.add(nuevo_tratamiento)
    db.commit()
    db.refresh(nuevo_tratamiento)
    return nuevo_tratamiento