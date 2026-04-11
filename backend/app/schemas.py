from pydantic import BaseModel, EmailStr, field_validator
import re

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