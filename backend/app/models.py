from sqlalchemy import Column, Integer, String, DateTime, Text, Enum, ForeignKey, Boolean, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.basededatos import Base


class Organizacion(Base):
    __tablename__ = "organizaciones"

    id        = Column(Integer, primary_key=True, index=True)
    nombre    = Column(String(200), nullable=False)
    rut       = Column(String(20), unique=True, nullable=False)
    correo    = Column(String(200), unique=True, nullable=False)
    password  = Column(String(200), nullable=False)
    rol                 = Column(Enum("ORGANIZACION", "ADMIN"), default="ORGANIZACION", nullable=False)
    creado_en           = Column(DateTime, server_default=func.now(), nullable=False)
    color_institucional = Column(String(7), nullable=True)
    logo_ruta           = Column(String(500), nullable=True)

    tratamientos = relationship("Tratamiento", back_populates="organizacion", cascade="all, delete-orphan")
    informes     = relationship("Informe", back_populates="organizacion", cascade="all, delete-orphan")
    sesiones     = relationship("SesionAnalisis", back_populates="organizacion", cascade="all, delete-orphan")


class Tratamiento(Base):
    __tablename__ = "tratamientos"

    id                       = Column(Integer, primary_key=True, index=True)
    organizacion_id          = Column(Integer, ForeignKey("organizaciones.id", ondelete="CASCADE"), nullable=False)
    nombre                   = Column(String(200), nullable=False)
    finalidad                = Column(Text, nullable=True)
    base_legal               = Column(String(100), nullable=True)
    datos_sensibles          = Column(Boolean, default=False, nullable=False)
    # DECISIÓN DE ARQUITECTURA — destinatarios (legado) vs campos aditivos
    # destinatarios es texto libre original del formulario; se conserva intacto.
    # Los campos destinatarios_internos / _nacionales / _internacionales que se
    # agreguen en B2 son ADITIVOS: se guardan en detalle_rat_extendido y no
    # reemplazan ni modifican este campo. El PDF y el RAT los muestran en conjunto.
    destinatarios            = Column(Text, nullable=True)
    plazo_conservacion       = Column(String(100), nullable=True)
    plazo_otro               = Column(String(200), nullable=True)
    medidas_seguridad        = Column(Text, nullable=True)
    sale_extranjero          = Column(Boolean, default=False, nullable=False)
    decisiones_automatizadas = Column(Boolean, default=False, nullable=False)
    nivel_riesgo             = Column(String(10), nullable=True)
    estado                   = Column(Enum("PENDIENTE", "COMPLETO", "BORRADOR"), default="PENDIENTE", nullable=False)
    probabilidad             = Column(String(10), nullable=True)
    impacto                  = Column(String(10), nullable=True)
    fecha_evaluacion         = Column(DateTime, nullable=True)
    creado_en                = Column(DateTime, server_default=func.now(), nullable=False)
    actualizado_en           = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=True)

    organizacion = relationship("Organizacion", back_populates="tratamientos")
    campos             = relationship("CampoRat", back_populates="tratamiento", cascade="all, delete-orphan")
    detalle            = relationship("DetalleRat", back_populates="tratamiento", uselist=False, cascade="all, delete-orphan")
    detalle_extendido  = relationship("DetalleRatExtendido", back_populates="tratamiento", uselist=False, cascade="all, delete-orphan")
    sesiones_actividad = relationship("SesionActividad", back_populates="tratamiento", cascade="all, delete-orphan")
    versiones          = relationship("VersionTratamiento", back_populates="tratamiento", cascade="all, delete-orphan")

    @property
    def sesion_origen(self) -> str | None:
        """Nombre de la sesión de análisis de la que provienen los campos, si la hay."""
        if self.sesiones_actividad:
            sesion = self.sesiones_actividad[0].sesion
            return sesion.nombre if sesion else None
        return None


# Historial de versiones del RAT: una fila por cada vez que un tratamiento
# COMPLETO se edita (o llega a COMPLETO por primera vez).
class VersionTratamiento(Base):
    __tablename__ = "versiones_tratamiento"

    id                 = Column(Integer, primary_key=True, index=True)
    tratamiento_id     = Column(Integer, ForeignKey("tratamientos.id", ondelete="CASCADE"), nullable=False)
    numero_version     = Column(Integer, nullable=False)
    datos_snapshot     = Column(JSON, nullable=False)
    campos_modificados = Column(JSON, nullable=False, default=list)
    modificado_por     = Column(String(200), nullable=True)
    descripcion_cambio = Column(Text, nullable=True)
    nivel_riesgo       = Column(String(10), nullable=True)
    creado_en          = Column(DateTime, server_default=func.now(), nullable=False)

    tratamiento = relationship("Tratamiento", back_populates="versiones")


class CampoRat(Base):
    __tablename__ = "campos_rat"

    id             = Column(Integer, primary_key=True, index=True)
    tratamiento_id = Column(Integer, ForeignKey("tratamientos.id", ondelete="CASCADE"), nullable=False)
    nombre_columna = Column(String(100), nullable=False)
    tipo_dato      = Column(String(100), nullable=True)
    es_sensible    = Column(Boolean, default=False, nullable=False)
    fuente         = Column(String(20), default="AUTOMATICO", nullable=False)
    creado_en      = Column(DateTime, server_default=func.now(), nullable=False)

    tratamiento = relationship("Tratamiento", back_populates="campos")


# DECISIÓN DE ARQUITECTURA — campos adicionales del RAT (B2 en adelante)
# ─────────────────────────────────────────────────────────────────────────────
# detalle_rat almacena los campos del formulario Paso 1 / Paso 2 originales.
# Cualquier campo nuevo que se agregue en sprints futuros (ej. pais_destino,
# transferencias_internacionales, encargado_externo, etc.) DEBE ir en una tabla
# separada: detalle_rat_extendido (relación 1-a-1 con tratamiento_id).
# Razón: detalle_rat ya tiene filas reales en producción; alterar su estructura
# implica migraciones destructivas. La tabla extendida se crea vacía y se puebla
# solo cuando el usuario completa los nuevos campos, sin romper filas existentes.
class DetalleRat(Base):
    __tablename__ = "detalle_rat"

    id                      = Column(Integer, primary_key=True, index=True)
    tratamiento_id          = Column(Integer, ForeignKey("tratamientos.id", ondelete="CASCADE"), nullable=False, unique=True)
    responsable_tratamiento = Column(String(200), nullable=True)
    es_responsable          = Column(Boolean, default=True, nullable=False)
    departamento            = Column(String(200), nullable=True)
    categorias_titulares    = Column(Text, nullable=True)
    universo_titulares      = Column(Text, nullable=True)
    origen_datos            = Column(String(100), nullable=True)
    categoria_datos         = Column(Text, nullable=True)
    creado_en               = Column(DateTime, server_default=func.now(), nullable=False)
    actualizado_en          = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=True)

    tratamiento = relationship("Tratamiento", back_populates="detalle")




class DetalleRatExtendido(Base):
    __tablename__ = "detalle_rat_extendido"

    id             = Column(Integer, primary_key=True, index=True)
    tratamiento_id = Column(Integer, ForeignKey("tratamientos.id", ondelete="CASCADE"), nullable=False, unique=True)

    # ── Identificación ──
    descripcion_detallada      = Column(Text, nullable=True)
    subarea_responsable        = Column(String(200), nullable=True)
    procesos_relacionados      = Column(Text, nullable=True)
    finalidades_secundarias    = Column(Text, nullable=True)
    informa_titulares          = Column(Text, nullable=True)
    documento_respaldo_permiso = Column(Text, nullable=True)

    # ── Datos y transferencias ──
    incluye_nna                     = Column(Boolean, default=False, nullable=True)
    nna_detalle                     = Column(Text, nullable=True)
    datos_navegacion                = Column(Boolean, nullable=True)
    datos_navegacion_detalle        = Column(Text, nullable=True)
    destinatarios_internos          = Column(Text, nullable=True)
    destinatarios_nacionales        = Column(Text, nullable=True)
    destinatarios_internacionales   = Column(Text, nullable=True)
    terceros_son_encargados         = Column(Boolean, nullable=True)
    contratos_proteccion_datos      = Column(Boolean, nullable=True)
    contratos_proteccion_datos_detalle = Column(Text, nullable=True)
    datos_transferidos_detalle      = Column(Text, nullable=True)
    metodo_transferencia            = Column(Text, nullable=True)

    # ── Sistemas ──
    sistemas_origen            = Column(Text, nullable=True)
    sistemas_destino           = Column(Text, nullable=True)
    sistemas_tratamiento       = Column(Text, nullable=True)
    tipos_tratamiento_sistema  = Column(Text, nullable=True)
    base_datos_nombre          = Column(String(200), nullable=True)
    proveedor_tecnologico      = Column(String(200), nullable=True)

    # ── Principios (Ley 21.719) ──
    criterio_plazo              = Column(String(50), nullable=True)
    metodo_eliminacion          = Column(String(100), nullable=True)
    documenta_destruccion       = Column(Boolean, nullable=True)
    excepciones_plazo           = Column(Text, nullable=True)
    minimizacion_justificacion  = Column(Text, nullable=True)
    mecanismos_exactitud        = Column(Text, nullable=True)
    evaluacion_periodica        = Column(String(50), nullable=True)
    cumplimiento_demostrable    = Column(Text, nullable=True)
    incidentes_historicos       = Column(Text, nullable=True)
    cambios_futuros             = Column(Text, nullable=True)

    # ── DPIA ──
    requiere_dpia  = Column(Boolean, default=False, nullable=True)
    dpia_realizada = Column(Boolean, default=False, nullable=True)
    dpia_detalle   = Column(Text, nullable=True)

    creado_en      = Column(DateTime, server_default=func.now(), nullable=False)
    actualizado_en = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=True)

    tratamiento = relationship("Tratamiento", back_populates="detalle_extendido")


class Informe(Base):
    __tablename__ = "informes"

    id                  = Column(Integer, primary_key=True, index=True)
    organizacion_id     = Column(Integer, ForeignKey("organizaciones.id", ondelete="CASCADE"), nullable=False)
    contenido_ia        = Column(Text, nullable=True)
    generado_en         = Column(DateTime, server_default=func.now(), nullable=False)
    ruta_pdf            = Column(String(300), nullable=True)
    num_tratamientos    = Column(Integer, default=0, nullable=False)
    versiones_snapshot  = Column(JSON, nullable=True)

    organizacion = relationship("Organizacion", back_populates="informes")


class SesionAnalisis(Base):
    __tablename__ = "sesiones_analisis"

    id              = Column(Integer, primary_key=True, index=True)
    organizacion_id = Column(Integer, ForeignKey("organizaciones.id", ondelete="CASCADE"), nullable=False)
    nombre          = Column(String(200), nullable=False)
    fuente          = Column(Enum("archivo", "bd", "manual"), nullable=False)
    motor_bd        = Column(String(50), nullable=True)
    columnas_json   = Column(JSON, nullable=True)
    estado          = Column(Enum("activa", "borrador", "completada"), default="activa", nullable=False)
    creado_en       = Column(DateTime, server_default=func.now(), nullable=False)

    organizacion       = relationship("Organizacion", back_populates="sesiones")
    sesiones_actividad = relationship("SesionActividad", back_populates="sesion", cascade="all, delete-orphan")


class SesionActividad(Base):
    __tablename__ = "sesion_actividad"

    id             = Column(Integer, primary_key=True, index=True)
    sesion_id      = Column(Integer, ForeignKey("sesiones_analisis.id", ondelete="CASCADE"), nullable=False)
    tratamiento_id = Column(Integer, ForeignKey("tratamientos.id", ondelete="CASCADE"), nullable=False)
    campos_usados  = Column(JSON, nullable=True)
    creado_en      = Column(DateTime, server_default=func.now(), nullable=False)

    sesion      = relationship("SesionAnalisis", back_populates="sesiones_actividad")
    tratamiento = relationship("Tratamiento", back_populates="sesiones_actividad")