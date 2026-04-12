from fastapi import FastAPI
from app.basededatos import engine, Base
from app import models
from app.routers import auth 

Base.metadata.create_all(bind=engine)

app = FastAPI(title="DataCL API")
app.include_router(auth.router)

@app.get("/")
def root():
    return {"mensaje:": "DataCL API funcionando"}

# para ejecutar : uvicorn main:app --reload

# Backend (en otra terminal)
# cd backend
# python -m venv venv
# venv\Scripts\activate
# pip install -r requirements.txt
# uvicorn main:app --reload


# instalar sqlalchemy en el venv (entorno virtual)
# pip install fastapi uvicorn sqlalchemy pymysql pandas openpyxl python-jose passlib bcrypt reportlab httpx python-multipart python-dotenv