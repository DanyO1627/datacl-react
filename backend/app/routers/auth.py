from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from passlib.context import CryptContext

from app.basededatos import get_db
from app import models
from app.schemas import OrganizacionRegistro, OrganizacionRespuesta, OrganizacionLogin, TokenRespuesta
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
    response_model=TokenRespuesta,
    summary="Iniciar sesión"
)
def login(datos: OrganizacionLogin, db: Session = Depends(get_db)):
    """
    Recibe correo y contraseña.
    Devuelve un token JWT si las credenciales son correctas.
    """
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
    response_model=OrganizacionRespuesta,
    summary="Obtener perfil actual"
)
def mi_perfil(usuario_actual=Depends(obtener_usuario_actual)):
    """
    Devuelve los datos de la organización autenticada.
    Requiere token JWT válido en el header Authorization.
    """
    return usuario_actual