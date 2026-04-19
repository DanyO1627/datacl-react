from sqlalchemy import Column, Integer, String, DateTime, Enum, ForeignKey
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
    creado_en = Column(DateTime, default=func.now())

    tratamientos = relationship("Tratamiento", back_populates="organizacion")
    informes     = relationship("Informe", back_populates="organizacion")


class Tratamiento(Base):
    __tablename__ = "tratamientos"

    id              = Column(Integer, primary_key=True, index=True)
    organizacion_id = Column(Integer, ForeignKey("organizaciones.id"), nullable=False)
    tipo            = Column(String(200), nullable=False)
    estado          = Column(Enum("PENDIENTE", "COMPLETO"), default="PENDIENTE")
    nivel_riesgo    = Column(Enum("BAJO", "MEDIO", "ALTO"), default="BAJO")
    fecha           = Column(DateTime, default=func.now())

    organizacion = relationship("Organizacion", back_populates="tratamientos")
    campos_rat   = relationship("CampoRat", back_populates="tratamiento", cascade="all, delete-orphan")


class CampoRat(Base):
    __tablename__ = "campos_rat"

    id              = Column(Integer, primary_key=True, index=True)
    tratamiento_id  = Column(Integer, ForeignKey("tratamientos.id"), nullable=False)
    nombre_campo    = Column(String(200), nullable=False)
    tipo_dato       = Column(String(100))
    clasificacion   = Column(Enum("personal", "sensible", "otro"), default="otro")
    completado      = Column(Enum("SI", "NO"), default="NO")

    tratamiento = relationship("Tratamiento", back_populates="campos_rat")


class Informe(Base):
    __tablename__ = "informes"

    id               = Column(Integer, primary_key=True, index=True)
    organizacion_id  = Column(Integer, ForeignKey("organizaciones.id"), nullable=False)
    titulo           = Column(String(200), nullable=False)
    num_tratamientos = Column(Integer, default=0)
    generado_en      = Column(DateTime, default=func.now())

    organizacion = relationship("Organizacion", back_populates="informes")