from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from passlib.context import CryptContext

from app.basededatos import get_bd
from app import models
from app.schemas import OrganizacionRegistro, OrganizacionRespuesta

# El router agrupa todos los endpoints de autenticación bajo el prefijo /auth
router = APIRouter(prefix="/auth", tags=["Autenticación"])

# Contexto de hashing — le dice a passlib que use BCrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


@router.post(
    "/registro",
    response_model=OrganizacionRespuesta,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar nueva organización"
)
def registro(datos: OrganizacionRegistro, db: Session = Depends(get_bd)):
    """
    Crea una nueva organización en DataCL.
    - Verifica que el correo no esté registrado
    - Verifica que el RUT no esté registrado
    - Hashea la contraseña con BCrypt
    - Guarda en MySQL y devuelve los datos sin password
    """

    # Verificar correo duplicado
    correo_existente = db.query(models.Organizacion).filter(
        models.Organizacion.correo == datos.correo
    ).first()
    if correo_existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El correo ya está registrado"
        )

    # Verificar RUT duplicado
    rut_existente = db.query(models.Organizacion).filter(
        models.Organizacion.rut == datos.rut
    ).first()
    if rut_existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El RUT ya está registrado"
        )

    # Hashear la contraseña — nunca se guarda en texto plano
    password_hasheada = pwd_context.hash(datos.password)

    # Crear el objeto ORM (aún no está en la BD)
    nueva_org = models.Organizacion(
        nombre=datos.nombre,
        rut=datos.rut,
        correo=datos.correo,
        password=password_hasheada,
        rol="ORGANIZACION"
    )

    # Guardar en MySQL
    db.add(nueva_org)       # agrega a la sesión
    db.commit()             # confirma y escribe en la BD
    db.refresh(nueva_org)   # recarga el objeto con el id generado por MySQL

    return nueva_org        # FastAPI convierte esto a JSON usando OrganizacionRespuesta