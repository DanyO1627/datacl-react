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
    rut: str
    correo: str
    rol: str
    model_config = {"from_attributes": True}


# TOKEN RESPUESTA
class TokenRespuesta(BaseModel):
    access_token: str
    token_type: str = "bearer"
    organizacion: OrganizacionRespuesta



# Para editar nombre y correo desde la pantalla de perfil
class OrganizacionEditarPerfil(BaseModel):
    nombre: Optional[str] = None
    correo: Optional[EmailStr] = None

    @field_validator("nombre")
    @classmethod
    def nombre_no_vacio(cls, v: str) -> str:
        if v is not None and not v.strip():
            raise ValueError("El nombre no puede estar vacío")
        return v.strip() if v else v


# Para cambiar la contraseña (requiere verificar la actual primero)
class OrganizacionCambiarPassword(BaseModel):
    password_actual: str
    password_nueva: str
    confirmar_password: str

    @field_validator("password_nueva")
    @classmethod
    def password_minimo(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("La contraseña debe tener al menos 8 caracteres")
        if len(v) > 72:
            raise ValueError("La contraseña no puede tener más de 72 caracteres")
        return v

    @field_validator("confirmar_password")
    @classmethod
    def passwords_coinciden(cls, v: str, info) -> str:
        nueva = info.data.get("password_nueva")
        if nueva and v != nueva:
            raise ValueError("Las contraseñas no coinciden")
        return v

# ── Schemas de detalle RAT ────────────────────────────────────────────────

class DetalleRatBase(BaseModel):
    responsable_tratamiento: Optional[str] = None
    es_responsable:          bool = True
    departamento:            Optional[str] = None
    categorias_titulares:    Optional[str] = None
    universo_titulares:      Optional[str] = None
    origen_datos:            Optional[str] = None
    categoria_datos:         Optional[str] = None


class DetalleRatRespuesta(DetalleRatBase):
    id:             int
    tratamiento_id: int
    model_config = {"from_attributes": True}


# ── Schemas de tratamientos ────────────────────────────────────────────────

# Schema para cada campo que llega desde el análisis de Python
# Va dentro de la lista campos_detectados al crear un tratamiento
class CampoRatEntrada(BaseModel):
    nombre_columna:    str
    tipo_dato:         Optional[str] = None
    es_sensible:       bool = False
    fuente:            str = "AUTOMATICO"
    categoria_tematica: Optional[str] = None

class TratamientoCrear(BaseModel):
    nombre: str
    finalidad: Optional[str] = None
    base_legal: Optional[str] = None
    datos_sensibles: bool = False
    estado: Optional[str] = None
    destinatarios: Optional[str] = None
    plazo_conservacion: Optional[str] = None
    plazo_otro: Optional[str] = None
    medidas_seguridad: Optional[str] = None
    sale_extranjero: bool = False
    decisiones_automatizadas: bool = False
    campos_detectados: list[CampoRatEntrada] = []
    detalle: Optional[DetalleRatBase] = None
    sesion_id: Optional[int] = None
    campos_usados: Optional[list] = None

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
    plazo_otro: Optional[str] = None
    medidas_seguridad: Optional[str] = None
    sale_extranjero: Optional[bool] = None
    decisiones_automatizadas: Optional[bool] = None
    nivel_riesgo: Optional[str] = None
    estado: Optional[str] = None
    detalle: Optional[DetalleRatBase] = None

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
        if v is not None and v not in ("PENDIENTE", "COMPLETO", "BORRADOR"):
            raise ValueError("estado debe ser PENDIENTE, COMPLETO o BORRADOR")
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
    plazo_otro: Optional[str] = None
    medidas_seguridad: Optional[str] = None
    sale_extranjero: bool
    decisiones_automatizadas: bool
    nivel_riesgo: Optional[str] = None
    estado: str
    creado_en: datetime
    actualizado_en: Optional[datetime] = None
    probabilidad: Optional[str] = None
    impacto: Optional[str] = None
    fecha_evaluacion: Optional[datetime] = None
    detalle: Optional[DetalleRatRespuesta] = None
    sesion_origen: Optional[str] = None
    model_config = {"from_attributes": True}

class TratamientoListado(BaseModel):
    id: int
    nombre: str
    nivel_riesgo: Optional[str] = None
    estado: str
    datos_sensibles: bool = False
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


class SesionAnalisisCrear(BaseModel):
    nombre:        Optional[str] = None
    fuente:        str = "archivo"
    motor_bd:      Optional[str] = None
    columnas_json: Optional[list] = None
    estado:        Optional[str] = None

    @field_validator("fuente")
    @classmethod
    def fuente_valida(cls, v: str) -> str:
        if v not in ("archivo", "bd", "manual"):
            raise ValueError("fuente debe ser 'archivo', 'bd' o 'manual'")
        return v


class ActividadBorradorRespuesta(BaseModel):
    tratamiento_id: int
    campos_usados:  Optional[list] = None


class SesionAnalisisRespuesta(BaseModel):
    id:              int
    organizacion_id: int
    nombre:          str
    fuente:          str
    motor_bd:        Optional[str] = None
    columnas_json:   Optional[list] = None
    estado:          str
    creado_en:       datetime
    num_actividades: int = 0
    actividades:     list[ActividadBorradorRespuesta] = []
    model_config = {"from_attributes": True}


class ActualizarEstadoSesion(BaseModel):
    estado: str

    @field_validator("estado")
    @classmethod
    def estado_valido(cls, v: str) -> str:
        if v not in ("activa", "borrador", "completada"):
            raise ValueError("estado debe ser 'activa', 'borrador' o 'completada'")
        return v


class GenerarInformeRequest(BaseModel):
    ids_tratamientos: list[int]


class InformeRespuesta(BaseModel):
    """
    Schema de respuesta para GET /informes.
    - generado_en es Optional porque registros viejos pueden tener NULL en BD
    - num_tratamientos no está en la tabla informes, se calcula en el endpoint
    - tiene_ia indica si Groq respondió al generar
    """
    id:                 int
    generado_en:        Optional[datetime] = None
    tiene_ia:           bool = False
    ruta_pdf:           Optional[str] = None
    num_tratamientos:   int = 0          # cuántos tratamientos tenía la org al generar

    model_config = {"from_attributes": True}


# ── Schemas de historial de versiones ──────────────────────────────────────
# para que los uses cuando quieras simular datos para el frontend (dani)

class CampoModificado(BaseModel):
    campo: str
    antes: Optional[str] = None
    despues: Optional[str] = None


class VersionTratamientoResumen(BaseModel):
    numero_version: int
    modificado_por: Optional[str] = None
    descripcion_cambio: Optional[str] = None
    campos_modificados: list[CampoModificado] = []
    nivel_riesgo: Optional[str] = None
    creado_en: datetime

    model_config = {"from_attributes": True}


class VersionTratamientoDetalle(VersionTratamientoResumen):
    datos_snapshot: dict
    
    
    
# Ejemplo de mock (dato de prueba que simula en el frontend un dato real del backend)
# una idea de dato mock podría ser esta: 

# const mockVersiones = [
#   {
#     numero_version: 2,
#     modificado_por: "Empresa Demo SpA",
#     descripcion_cambio: "Se modificaron base_legal y categoria_datos",
#     campos_modificados: [
#       { campo: "base_legal", antes: "Consentimiento (Art. 12)", despues: "Obligación legal (Art. 13 b)" },
#       { campo: "categoria_datos", antes: "Datos de contacto", despues: "Datos de contacto, Datos de salud" },
#     ],
#     nivel_riesgo: "ALTO",
#     creado_en: "2026-06-14T10:30:00",
#   },
#   {
#     numero_version: 1,
#     modificado_por: "Empresa Demo SpA",
#     descripcion_cambio: "Versión inicial del RAT",
#     campos_modificados: [],
#     nivel_riesgo: "MEDIO",
#     creado_en: "2026-06-13T09:00:00",
#   },
# ];