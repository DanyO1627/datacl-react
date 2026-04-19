from sqlalchemy import Column, Integer, String, DateTime, Text, Enum, ForeignKey, Boolean
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
    rol       = Column(Enum("ORGANIZACION", "ADMIN"), default="ORGANIZACION", nullable=False)
    creado_en = Column(DateTime, server_default=func.now(), nullable=False)

    tratamientos = relationship("Tratamiento", back_populates="organizacion", cascade="all, delete-orphan")
    informes     = relationship("Informe", back_populates="organizacion", cascade="all, delete-orphan")


class Tratamiento(Base):
    __tablename__ = "tratamientos"

    id                       = Column(Integer, primary_key=True, index=True)
    organizacion_id          = Column(Integer, ForeignKey("organizaciones.id", ondelete="CASCADE"), nullable=False)
    nombre                   = Column(String(200), nullable=False)
    finalidad                = Column(Text, nullable=True)
    base_legal               = Column(String(100), nullable=True)
    datos_sensibles          = Column(Boolean, default=False, nullable=False)
    destinatarios            = Column(Text, nullable=True)
    plazo_conservacion       = Column(String(100), nullable=True)
    medidas_seguridad        = Column(Text, nullable=True)
    sale_extranjero          = Column(Boolean, default=False, nullable=False)
    decisiones_automatizadas = Column(Boolean, default=False, nullable=False)
    nivel_riesgo             = Column(String(10), nullable=True)
    estado                   = Column(Enum("PENDIENTE", "COMPLETO"), default="PENDIENTE", nullable=False)
    probabilidad             = Column(String(10), nullable=True)
    impacto                  = Column(String(10), nullable=True)
    fecha_evaluacion         = Column(DateTime, nullable=True)
    creado_en                = Column(DateTime, server_default=func.now(), nullable=False)
    actualizado_en           = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=True)

    organizacion = relationship("Organizacion", back_populates="tratamientos")
    campos       = relationship("CampoRat", back_populates="tratamiento", cascade="all, delete-orphan")


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


class Informe(Base):
    __tablename__ = "informes"

    id              = Column(Integer, primary_key=True, index=True)
    organizacion_id = Column(Integer, ForeignKey("organizaciones.id", ondelete="CASCADE"), nullable=False)
    contenido_ia    = Column(Text, nullable=True)
    generado_en     = Column(DateTime, server_default=func.now(), nullable=False)
    ruta_pdf        = Column(String(300), nullable=True)

    organizacion = relationship("Organizacion", back_populates="informes")