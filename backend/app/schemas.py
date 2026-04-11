from pydantic import BaseModel, EmailStr, field_validator
import re

from fastapi import HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.basededatos import get_db
from app import models

# registro
# valida el body del POST /auth/registro
class OrganizacionRegistro(BaseModel):
    nombre: str
    rut:str
    correo: EmailStr # valida automatico formato email
    password: str
    confirmar_password:str
    
    @field_validator("nombre")
    @classmethod
    def nombre_no_vacio(cls, v:str)-> str:
        if not v.strip():
            raise ValueError("El nombre no puede estar vacío")
        return v.strip()
    
    @field_validator("rut")
    @classmethod
    def rut_formato(cls, v: str) -> str:
        # Acepta formatos: 12345678-9 o 12345678-K
        patron = r"^\d{7,8}-[\dKk]$"
        if not re.match(patron, v.strip()):
            raise ValueError("RUT inválido. Formato esperado: 12345678-9")
        return v.strip().upper()
    
    @field_validator("password")
    @classmethod
    def password_minimo(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("La contraseña debe tener al menos 8 caracteres")
        return v
    
    
    @field_validator("confirmar_password")
    @classmethod
    def contraseñas_coinciden(cls, v: str, info) -> str:
        password = info.data.get("password")
        if password and v != password:
            raise ValueError("Las contraseñas no coinciden")
        return v
    
    
# Valida el body del POST /auth/login
class OrganizacionLogin(BaseModel):
    correo: EmailStr
    password: str

# Define qué se devuelve al frontend
class OrganizacionRespuesta(BaseModel):
    id: int
    nombre: str
    correo: str
    rol: str
    
    
    model_config= {"from_attributes":True} # para convertir desde el modelo de SQLAlchemy
    # permite que fastap convierta directamente un objeto sql alchemy (desde la bbdd) en JSON sin tener que mapearlo campo por campo.
    
    
    
# OAuth2PasswordBearer sabe leer el token del header Authorization: Bearer <token>
# tokenUrl le dice a Swagger dónde está el login para el botón "Authorize"
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def obtener_usuario_actual(
    token: str = Depends(oauth2_scheme),  # FastAPI extrae el token del header automáticamente
    db: Session = Depends(get_db)         # FastAPI inyecta la sesión de BD
) -> models.Organizacion:
    """
    Dependencia de FastAPI para proteger endpoints.
    Se usa así en cualquier endpoint:
        def mi_endpoint(usuario = Depends(obtener_usuario_actual)):
    """
    # Si el token es inválido o expiró, verificar_token lanza 401 solo
    payload = verificar_token(token)

    # Extraemos el id que guardamos cuando creamos el token
    org_id: int = payload.get("id")

    if org_id is None:
        raise HTTPException(status_code=401, detail="Token mal formado")

    # Buscamos la organización en la BD
    organizacion = db.query(models.Organizacion).filter(
        models.Organizacion.id == org_id
    ).first()

    if organizacion is None:
        raise HTTPException(status_code=401, detail="La organización no existe")

    return organizacion