from sqlalchemy import Column, Integer, String, DateTime, Enum
from sqlalchemy.sql import func
from app.basededatos import Base

# para probar que funcione la bbdd

class Organizacion(Base):
    __tablename__ = "organizaciones"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(200), nullable=False)
    rut = Column(String(20), unique=True, nullable=False)
    correo = Column(String(200), unique=True, nullable=False)
    password = Column(String(200), nullable=False)
    rol = Column(Enum("ORGANIZACION", "ADMIN"), default="ORGANIZACION")
    creado_en = Column(DateTime, default=func.now())