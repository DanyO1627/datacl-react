from typing import Union

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from passlib.context import CryptContext

from app.basededatos import get_db
from app import models
from app.schemas import (
    OrganizacionRegistro,
    OrganizacionRespuesta,
    OrganizacionLogin,
    TokenRespuesta,
    TokenRespuestaUsuario,
    UsuarioMeRespuesta,
)
from app.utils.jwt import crear_token, obtener_usuario_actual

router = APIRouter(prefix="/auth", tags=["Autenticación"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


@router.post(
    "/registro",
    response_model=OrganizacionRespuesta,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar nueva organización"
)
def registro(datos: OrganizacionRegistro, db: Session = Depends(get_db)):
    """
    Crea una nueva organización en DataCL.
    - Verifica que el correo no esté registrado
    - Verifica que el RUT no esté registrado
    - Hashea la contraseña con BCrypt
    - Guarda en MySQL y devuelve los datos sin password
    """
    correo_existente = db.query(models.Organizacion).filter(
        models.Organizacion.correo == datos.correo
    ).first()
    if correo_existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El correo ya está registrado"
        )

    rut_existente = db.query(models.Organizacion).filter(
        models.Organizacion.rut == datos.rut
    ).first()
    if rut_existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El RUT ya está registrado"
        )

    password_hasheada = pwd_context.hash(datos.password)

    nueva_org = models.Organizacion(
        nombre=datos.nombre,
        rut=datos.rut,
        correo=datos.correo,
        password=password_hasheada,
        rol="ORGANIZACION"
    )

    db.add(nueva_org)
    db.commit()
    db.refresh(nueva_org)
    return nueva_org


@router.post(
    "/login",
    response_model=Union[TokenRespuestaUsuario, TokenRespuesta],
    summary="Iniciar sesión"
)
def login(datos: OrganizacionLogin, db: Session = Depends(get_db)):
    """
    Recibe correo y contraseña. Devuelve un token JWT si las credenciales
    son correctas.

    R10.1 - dos caminos:
    - Si el correo existe en `usuarios`, loguea por ahí (devuelve
      TokenRespuestaUsuario, con la persona + su organización + permisos).
    - Si no, cae al código de siempre sin tocar una línea: busca en
      `organizaciones` (admin de plataforma, y organizaciones cliente
      todavía no migradas a R10.4).
    """
    usuario = (
        db.query(models.Usuario)
        .options(joinedload(models.Usuario.organizacion))
        .filter(models.Usuario.correo == datos.correo)
        .first()
    )

    if usuario is not None:
        if not usuario.activo:
            raise HTTPException(status_code=401, detail="Usuario desactivado")

        if not pwd_context.verify(datos.password, usuario.password):
            raise HTTPException(status_code=401, detail="Credenciales incorrectas")

        token = crear_token({
            "usuario_id": usuario.id,
            "organizacion_id": usuario.organizacion_id,
            "rol": usuario.rol,
            "correo": usuario.correo,
        })

        permisos = db.query(models.PermisoUsuario).filter(
            models.PermisoUsuario.usuario_id == usuario.id
        ).first()

        return TokenRespuestaUsuario(
            access_token=token,
            token_type="bearer",
            usuario=UsuarioMeRespuesta(
                id=usuario.id,
                nombre=usuario.nombre,
                correo=usuario.correo,
                rol=usuario.rol,
                debe_cambiar_password=usuario.debe_cambiar_password,
                organizacion=usuario.organizacion,
                permisos=permisos,
            ),
        )

    # ── Camino viejo, sin cambios ──
    organizacion = db.query(models.Organizacion).filter(
        models.Organizacion.correo == datos.correo
    ).first()

    if organizacion is None:
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")

    password_valida = pwd_context.verify(datos.password, organizacion.password)
    if not password_valida:
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")

    token = crear_token({
        "id": organizacion.id,
        "correo": organizacion.correo,
        "rol": organizacion.rol
    })

    return TokenRespuesta(
        access_token=token,
        token_type="bearer",
        organizacion=organizacion
    )


@router.get(
    "/me",
    response_model=Union[UsuarioMeRespuesta, OrganizacionRespuesta],
    summary="Obtener perfil actual"
)
def mi_perfil(
    usuario_actual=Depends(obtener_usuario_actual),
    db: Session = Depends(get_db),
):
    """
    Devuelve los datos de la cuenta autenticada: un Usuario (R10.1, con su
    organización y permisos anidados) o, en el camino viejo, la Organizacion
    directa (admin de plataforma / organizaciones sin migrar a R10.4).
    Requiere token JWT válido en el header Authorization.
    """
    if isinstance(usuario_actual, models.Usuario):
        permisos = db.query(models.PermisoUsuario).filter(
            models.PermisoUsuario.usuario_id == usuario_actual.id
        ).first()
        return UsuarioMeRespuesta(
            id=usuario_actual.id,
            nombre=usuario_actual.nombre,
            correo=usuario_actual.correo,
            rol=usuario_actual.rol,
            debe_cambiar_password=usuario_actual.debe_cambiar_password,
            organizacion=usuario_actual.organizacion,
            permisos=permisos,
        )

    return usuario_actual