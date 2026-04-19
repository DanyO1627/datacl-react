from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from datetime import datetime
import re


# ── Schemas de autenticación ───────────────────────────────────────────────

class OrganizacionRegistro(BaseModel):
    nombre: str
    rut: str
    correo: EmailStr
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

class OrganizacionLogin(BaseModel):
    correo: EmailStr
    password: str

class OrganizacionRespuesta(BaseModel):
    id: int
    nombre: str
    correo: str
    rol: str
    model_config = {"from_attributes": True}

class TokenRespuesta(BaseModel):
    access_token: str
    token_type: str = "bearer"
    organizacion: OrganizacionRespuesta


# ── Schemas de tratamientos ────────────────────────────────────────────────

# Schema para cada campo que llega desde el análisis de Python
# Va dentro de la lista campos_detectados al crear un tratamiento
class CampoRatEntrada(BaseModel):
    nombre_columna: str
    tipo_dato: Optional[str] = None
    es_sensible: bool = False
    fuente: str = "AUTOMATICO"

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
    campos_detectados: list[CampoRatEntrada] = [] 

    @field_validator("nombre")
    @classmethod
    def nombre_no_vacio(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("El nombre del tratamiento no puede estar vacío")
        return v.strip()

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

class TratamientoListado(BaseModel):
    id: int
    nombre: str
    nivel_riesgo: Optional[str] = None
    estado: str
    creado_en: datetime
    model_config = {"from_attributes": True}
    
    
class CampoRatRespuesta(BaseModel):
    id: int
    tratamiento_id: int
    nombre_columna: str
    tipo_dato: Optional[str] = None
    es_sensible: bool
    fuente: str
    creado_en: datetime

    model_config = {"from_attributes": True}