import os

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.basededatos import engine, Base
from app import models
from app.routers import auth, admin, informes, analisis, tratamientos, organizaciones, sesiones
from app.utils.jwt import obtener_usuario_actual

Base.metadata.create_all(bind=engine)

app = FastAPI(title="DataCL API")

_cors_origins = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5173,http://localhost,http://127.0.0.1:5173,http://127.0.0.1",
)
allow_origins = [origin.strip() for origin in _cors_origins.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(informes.router)
app.include_router(analisis.router)
app.include_router(tratamientos.router)
app.include_router(organizaciones.router)
app.include_router(sesiones.router)

@app.get("/")
def root():
    return {"mensaje": "DataCL API funcionando"}

@app.get("/prueba-protegida")
def prueba(usuario=Depends(obtener_usuario_actual)):
    return {
        "mensaje": "Token válido ✓",
        "organizacion": usuario.nombre,
        "rol": usuario.rol
    }
