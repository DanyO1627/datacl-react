from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from datetime import datetime
import re

# ── Schemas de autenticación (existentes) ──────────────────────────────────

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


# ── Schemas de tratamientos (Novedad) ──────────────────────────────────────

# Para crear un tratamiento — POST /tratamientos
# Solo nombre es obligatorio, el resto es opcional porque el formulario es de 3 pasos
# y el usuario puede guardar como PENDIENTE antes de completarlo todo
class TratamientoCrear(BaseModel):
    nombre: str
    finalidad: Optional[str] = None
    base_legal: Optional[str] = None
    datos_sensibles: bool = False
    destinatarios: Optional[str] = None
    plazo_conservacion: Optional[str] = None
    medidas_seguridad: Optional[str] = None
    sale_extranjero: bool = False
    decisiones_automatizadas: bool = False

    @field_validator("nombre")
    @classmethod
    def nombre_no_vacio(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("El nombre del tratamiento no puede estar vacío")
        return v.strip()


# Para editar un tratamiento — PUT /tratamientos/{id}
# Todos los campos son opcionales porque el usuario puede editar solo uno
# Si no manda un campo, ese campo no se toca en la BD
class TratamientoEditar(BaseModel):
    nombre: Optional[str] = None
    finalidad: Optional[str] = None
    base_legal: Optional[str] = None
    datos_sensibles: Optional[bool] = None
    destinatarios: Optional[str] = None
    plazo_conservacion: Optional[str] = None
    medidas_seguridad: Optional[str] = None
    sale_extranjero: Optional[bool] = None
    decisiones_automatizadas: Optional[bool] = None
    nivel_riesgo: Optional[str] = None  
    estado: Optional[str] = None

    @field_validator("nombre")
    @classmethod
    def nombre_no_vacio(cls, v: str) -> str:
        # Solo valida si el campo llegó — si es None lo ignoramos
        if v is not None and not v.strip():
            raise ValueError("El nombre del tratamiento no puede estar vacío")
        return v.strip() if v else v

    @field_validator("nivel_riesgo")
    @classmethod
    def nivel_riesgo_valido(cls, v: str) -> str:
        if v is not None and v not in ("BAJO", "MEDIO", "ALTO"):
            raise ValueError("nivel_riesgo debe ser BAJO, MEDIO o ALTO")
        return v

    @field_validator("estado")
    @classmethod
    def estado_valido(cls, v: str) -> str:
        if v is not None and v not in ("PENDIENTE", "COMPLETO"):
            raise ValueError("estado debe ser PENDIENTE o COMPLETO")
        return v


# Para devolver un tratamiento completo — GET /tratamientos/{id}
# Incluye todos los campos que el frontend necesita mostrar
class TratamientoRespuesta(BaseModel):
    id: int
    organizacion_id: int
    nombre: str
    finalidad: Optional[str] = None
    base_legal: Optional[str] = None
    datos_sensibles: bool
    destinatarios: Optional[str] = None
    plazo_conservacion: Optional[str] = None
    medidas_seguridad: Optional[str] = None
    sale_extranjero: bool
    decisiones_automatizadas: bool
    nivel_riesgo: Optional[str] = None
    estado: str
    creado_en: datetime
    actualizado_en: Optional[datetime] = None

    model_config = {"from_attributes": True}


# Para el listado — GET /tratamientos
# Solo los campos necesarios para mostrar la tabla/lista
# Menos datos = respuesta más rápida
class TratamientoListado(BaseModel):
    id: int
    nombre: str
    nivel_riesgo: Optional[str] = None
    estado: str
    creado_en: datetime

    model_config = {"from_attributes": True}