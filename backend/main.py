from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.basededatos import engine, Base
from app import models
from app.routers import admin, auth, informes, analisis

Base.metadata.create_all(bind=engine)

app = FastAPI(title="DataCL API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(informes.router)
app.include_router(analisis.router)


@app.get("/")
def root():
    return {"mensaje": "DataCL API funcionando"}

# para ejecutar: uvicorn main:app --reload
