from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from passlib.context import CryptContext

from app.basededatos import get_db
from app import models
from app.schemas import (
    OrganizacionRespuesta,
    OrganizacionEditarPerfil,
    OrganizacionCambiarPassword,
)
from app.utils.jwt import obtener_usuario_actual

router = APIRouter(prefix="/organizaciones", tags=["Organizaciones"])

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