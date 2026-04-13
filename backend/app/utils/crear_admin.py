"""
Script para crear el usuario ADMIN inicial.
Ejecutar una sola vez al instalar el sistema:

    cd backend
    python -m app.utils.crear_admin
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from dotenv import load_dotenv
load_dotenv()

from app.basededatos import SessionLocal
from app.models import Organizacion
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

ADMIN_EMAIL = os.getenv("ADMIN_EMAIL")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD")

if not ADMIN_EMAIL or not ADMIN_PASSWORD:
    print("Error: define ADMIN_EMAIL y ADMIN_PASSWORD en el archivo .env")
    sys.exit(1)

db = SessionLocal()

existente = db.query(Organizacion).filter(Organizacion.correo == ADMIN_EMAIL).first()
if existente:
    print(f"Ya existe un usuario con el correo {ADMIN_EMAIL}")
    db.close()
    sys.exit(0)

admin = Organizacion(
    nombre="Administrador",
    rut="00.000.000-0",
    correo=ADMIN_EMAIL,
    password=pwd_context.hash(ADMIN_PASSWORD),
    rol="ADMIN"
)

db.add(admin)
db.commit()
db.refresh(admin)
db.close()

print(f"Admin creado correctamente:")
print(f"  Correo: {ADMIN_EMAIL}")
print(f"  Contraseña: {ADMIN_PASSWORD}")
print(f"  Rol: ADMIN")
