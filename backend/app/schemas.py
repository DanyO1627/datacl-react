from typing import Optional
from pydantic import BaseModel, EmailStr, field_validator
from datetime import datetime
import re

# Valida el body del POST /auth/registro
class OrganizacionRegistro(BaseModel):
    nombre: str
    rut: str
    correo: EmailStr  # valida automáticamente el formato de email
    password: str
    confirmar_password: str

    @field_validator("nombre")
    @classmethod
    def nombre_no_vacio(cls, v: str) -> str:
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
        if len(v) > 72:
            raise ValueError("La contraseña no puede tener más de 72 caracteres")
        return v

    @field_validator("confirmar_password")
    @classmethod
    def contrasenas_coinciden(cls, v: str, info) -> str:
        password = info.data.get("password")
        if password and v != password:
            raise ValueError("Las contraseñas no coinciden")
        return v


# Valida el body del POST /auth/login
class OrganizacionLogin(BaseModel):
    correo: EmailStr
    password: str


# Define qué se devuelve al frontend (sin password)
class OrganizacionRespuesta(BaseModel):
    id: int
    nombre: str
    correo: str
    rol: str

    # permite que FastAPI convierta directamente un objeto SQLAlchemy en JSON
    model_config = {"from_attributes": True}


# Lo que devuelve el login: token + datos de la organización
class TokenRespuesta(BaseModel):
    access_token: str
    token_type: str = "bearer"
    organizacion: OrganizacionRespuesta


# Lo que devuelve GET /tratamientos (un ítem de la lista)
class TratamientoListado(BaseModel):
    id: int
    tipo: str
    estado: str
    nivel_riesgo: str
    fecha: datetime

    model_config = {"from_attributes": True}


# Body del PUT /tratamientos/{id}
class TratamientoEditar(BaseModel):
    tipo: Optional[str] = None
    estado: Optional[str] = None
    nivel_riesgo: Optional[str] = None


# Body del POST /tratamientos
class TratamientoCrear(BaseModel):
    tipo: str
    nivel_riesgo: Optional[str] = "BAJO"