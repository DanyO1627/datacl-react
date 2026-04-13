from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.basededatos import engine, Base
from app import models
from app.routers import auth

from fastapi import Depends
from app.utils.jwt import obtener_usuario_actual

Base.metadata.create_all(bind=engine)

app = FastAPI(title="DataCL API")

# Permite que React (puerto 5173) llame al backend (puerto 8000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)

@app.get("/")
def root():
    return {"mensaje": "DataCL API funcionando"}
# para ejecutar : uvicorn main:app --reload

# Backend (en otra terminal)
# cd backend
# python -m venv venv
# venv\Scripts\activate
# pip install -r requirements.txt
# uvicorn main:app --reload


# instalar sqlalchemy en el venv (entorno virtual)
# pip install fastapi uvicorn sqlalchemy pymysql pandas openpyxl python-jose passlib bcrypt reportlab httpx python-multipart python-dotenv

# endpoint de prueba solo para probar el token del schemas

@app.get("/prueba-protegida")
def prueba(usuario = Depends(obtener_usuario_actual)):
    return {
        "mensaje": "Token válido ✓",
        "organizacion": usuario.nombre,
        "rol": usuario.rol
    }