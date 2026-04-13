from sqlalchemy import Column, Integer, String, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.basededatos import Base


class Organizacion(Base):
    __tablename__ = "organizaciones"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(200), nullable=False)
    rut = Column(String(20), unique=True, nullable=False)
    correo = Column(String(200), unique=True, nullable=False)
    password = Column(String(200), nullable=False)
    rol = Column(Enum("ORGANIZACION", "ADMIN"), default="ORGANIZACION")
    creado_en = Column(DateTime, default=func.now())

    tratamientos = relationship("Tratamiento", back_populates="organizacion")
    informes = relationship("Informe", back_populates="organizacion")


class Tratamiento(Base):
    __tablename__ = "tratamientos"

    id = Column(Integer, primary_key=True, index=True)
    organizacion_id = Column(Integer, ForeignKey("organizaciones.id"), nullable=False)
    tipo = Column(String(200), nullable=False)
    estado = Column(Enum("PENDIENTE", "COMPLETO"), default="PENDIENTE")
    fecha = Column(DateTime, default=func.now())

    organizacion = relationship("Organizacion", back_populates="tratamientos")


class Informe(Base):
    __tablename__ = "informes"

    id = Column(Integer, primary_key=True, index=True)
    organizacion_id = Column(Integer, ForeignKey("organizaciones.id"), nullable=False)
    titulo = Column(String(200), nullable=False)
    num_tratamientos = Column(Integer, default=0)
    generado_en = Column(DateTime, default=func.now())

    organizacion = relationship("Organizacion", back_populates="informes")