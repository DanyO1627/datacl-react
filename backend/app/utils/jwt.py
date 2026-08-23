import os
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from dotenv import load_dotenv
from sqlalchemy.orm import Session, joinedload
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
):
    """
    Dependencia para proteger endpoints.
    Uso: def mi_endpoint(usuario = Depends(obtener_usuario_actual))

    R10.1 - dos caminos según el payload del token:
    - Trae "usuario_id" (login nuevo, tabla `usuarios`) -> devuelve un
      models.Usuario (con .organizacion ya cargada).
    - Trae solo "id" (formato viejo) -> camino de siempre, sin tocar una
      línea: busca en `organizaciones` (admin de plataforma, y organizaciones
      cliente todavía no migradas a R10.4) y devuelve un models.Organizacion.
    """
    payload = verificar_token(token)

    usuario_id = payload.get("usuario_id")
    if usuario_id is not None:
        usuario = (
            db.query(models.Usuario)
            .options(joinedload(models.Usuario.organizacion))
            .filter(models.Usuario.id == usuario_id)
            .first()
        )
        if usuario is None:
            raise HTTPException(status_code=401, detail="El usuario no existe")
        # Revalidar en cada request, no solo al loguear: un usuario
        # desactivado no debe poder seguir usando un token vigente (hasta 24h).
        if not usuario.activo:
            raise HTTPException(status_code=401, detail="Usuario desactivado")
        return usuario

    # ── Camino viejo, sin cambios ──
    org_id: int = payload.get("id")
    if org_id is None:
        raise HTTPException(status_code=401, detail="Token mal formado")

    organizacion = db.query(models.Organizacion).filter(
        models.Organizacion.id == org_id
    ).first()

    if organizacion is None:
        raise HTTPException(status_code=401, detail="La organización no existe")

    return organizacion


def requiere_admin(
    usuario = Depends(obtener_usuario_actual),
):
    """
    Dependencia para endpoints exclusivos de administrador de PLATAFORMA
    (rol='ADMIN' en `organizaciones`). No cambia con R10.1: un models.Usuario
    nunca tiene rol='ADMIN' (su Enum es 'ADMIN_ORG'/'MIEMBRO'), así que sigue
    siendo exclusivo del admin de plataforma sin ningún ajuste acá.
    """
    if getattr(usuario, "rol", None) != "ADMIN":
        raise HTTPException(status_code=403, detail="Acceso restringido a administradores")
    return usuario


def requiere_permiso(modulo: str, accion: str):
    """
    Dependencia para exigir un permiso granular puntual (R10.1).
    Uso: def mi_endpoint(usuario = Depends(requiere_permiso("tratamientos", "editar")))

    - Camino viejo (Organizacion, sin usuario_id en el token): no tiene
      permisos granulares -> 403 siempre.
    - ADMIN_ORG: pasa siempre, sin consultar permisos_usuario.
    - MIEMBRO: exige que el booleano "{modulo}_{accion}" en su PermisoUsuario
      esté en True.

    Todavía no se usa en ningún router (eso es R10.3) — se define acá.
    """
    def _dependencia(
        usuario = Depends(obtener_usuario_actual),
        db: Session = Depends(get_db),
    ):
        if not isinstance(usuario, models.Usuario):
            raise HTTPException(status_code=403, detail="Acceso restringido")

        if usuario.rol == "ADMIN_ORG":
            return usuario

        permisos = db.query(models.PermisoUsuario).filter(
            models.PermisoUsuario.usuario_id == usuario.id
        ).first()

        campo = f"{modulo}_{accion}"
        if not permisos or not getattr(permisos, campo, False):
            raise HTTPException(status_code=403, detail="No tienes permiso para esta acción")

        return usuario

    return _dependencia
