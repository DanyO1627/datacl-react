from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from pydantic import BaseModel
from passlib.context import CryptContext
from jose import jwt, JWTError
from datetime import datetime, timedelta
import os

from app.basededatos import get_bd
from app import models

router = APIRouter(prefix="/auth", tags=["Autenticación"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = os.getenv("SECRET_KEY", "datacl_secret_key_2026")
ALGORITHM = "HS256"
EXPIRE_MINUTOS = 60 * 8  # 8 horas
bearer_scheme = HTTPBearer()


class LoginInput(BaseModel):
    correo: str
    password: str


class RegistroInput(BaseModel):
    nombre: str
    rut: str
    correo: str
    password: str


def verificar_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def hashear_password(password: str) -> str:
    return pwd_context.hash(password)


def crear_token(data: dict) -> str:
    payload = data.copy()
    expira = datetime.utcnow() + timedelta(minutes=EXPIRE_MINUTOS)
    payload.update({"exp": expira})
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def get_usuario_actual(
    credenciales: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_bd)
):
    try:
        payload = jwt.decode(credenciales.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        org_id = int(payload.get("sub"))
    except (JWTError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")

    org = db.query(models.Organizacion).filter(models.Organizacion.id == org_id).first()
    if not org:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario no encontrado")
    return org


@router.post("/registro", status_code=201)
def registro(datos: RegistroInput, db: Session = Depends(get_bd)):
    if db.query(models.Organizacion).filter(models.Organizacion.correo == datos.correo).first():
        raise HTTPException(status_code=400, detail="El correo ya está registrado")

    if db.query(models.Organizacion).filter(models.Organizacion.rut == datos.rut).first():
        raise HTTPException(status_code=400, detail="El RUT ya está registrado")

    nueva_org = models.Organizacion(
        nombre=datos.nombre,
        rut=datos.rut,
        correo=datos.correo,
        password=hashear_password(datos.password),
        rol="ORGANIZACION"
    )
    db.add(nueva_org)
    db.commit()
    db.refresh(nueva_org)

    return {"mensaje": "Organización registrada correctamente", "id": nueva_org.id}


@router.post("/login")
def login(datos: LoginInput, db: Session = Depends(get_bd)):
    org = db.query(models.Organizacion).filter(
        models.Organizacion.correo == datos.correo
    ).first()

    if not org or not verificar_password(datos.password, org.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo o contraseña incorrectos"
        )

    token = crear_token({
        "sub": str(org.id),
        "correo": org.correo,
        "rol": org.rol
    })

    return {
        "access_token": token,
        "token_type": "bearer",
        "rol": org.rol,
        "nombre": org.nombre
    }


@router.get("/me")
def me(usuario: models.Organizacion = Depends(get_usuario_actual)):
    return {
        "id": usuario.id,
        "nombre": usuario.nombre,
        "correo": usuario.correo,
        "rol": usuario.rol
    }
