import os
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from jose import JWTError, jwt
from dotenv import load_dotenv

load_dotenv() # lee el .env

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
EXPIRE_MINUTES = 1440

if not SECRET_KEY: 
    raise RuntimeError("SECRET_KEY no está definida en el archivo .env") # raise = lanza esta excepción

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
    
    

