import os
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from dotenv import load_dotenv
from sqlalchemy.orm import Session
from app.basededatos import get_db
from app import models

load_dotenv() # lee el .env

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
EXPIRE_MINUTES = 1440

if not SECRET_KEY: 
    raise RuntimeError("SECRET_KEY no está definida en el archivo .env") # raise = lanza esta excepción

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

"""
Recibe un dict con los datos a guardar en el token (ej: {"id": 1, "correo": "..."}).
Devuelve un string JWT firmado con SECRET_KEY.

"""

def crear_token(datos:dict) -> str: # datos: dict (datos será de tipo dict (diccionario)) / -> str = retorna un string
    datos_copia=datos.copy() # esto es una copia del dict para no tocar los originales
    expiracion= datetime.now(timezone.utc) + timedelta(minutes=EXPIRE_MINUTES) # al día de hoy le sumamos 24 horas (1440 minutos) y eso dura el token
    datos_copia.update({"exp": expiracion}) 
    
    token = jwt.encode(datos_copia, SECRET_KEY, algorithm=ALGORITHM) # encode = codificar el token con los datos, la clave secreta y el algoritmo
    return token

def verificar_token(token:str)-> dict:
    """recibe un token JWT string, devuelve el paydload (dict) si es válido, si expiró o es inválido lanza 401"""
    try: 
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM]) # decode = decodificar el token con la clave secreta y el algoritmo
        return payload
    except JWTError: 
        raise HTTPException(status_code=401, detail="Token inválido o expirado")
    
    
def obtener_usuario_actual(
    token: str = Depends(oauth2_scheme),  # FastAPI extrae el token del header
    db: Session = Depends(get_db)         # FastAPI inyecta la sesión de BD
) -> models.Organizacion:
    """
    Dependencia para proteger endpoints.
    Uso: def mi_endpoint(usuario = Depends(obtener_usuario_actual))
    """
    payload = verificar_token(token)

    org_id: int = payload.get("id")
    if org_id is None:
        raise HTTPException(status_code=401, detail="Token mal formado")

    organizacion = db.query(models.Organizacion).filter(
        models.Organizacion.id == org_id
    ).first()

    if organizacion is None:
        raise HTTPException(status_code=401, detail="La organización no existe")

    return organizacion
