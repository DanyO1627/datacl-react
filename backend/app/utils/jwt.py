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


# HELPERS DE IDENTIDAD (R10.3)
# obtener_usuario_actual devuelve un models.Usuario O un models.Organizacion
# según el camino de login (ver arriba). Los routers necesitan resolver
# "organizacion_id"/"la Organizacion real"/"quién es la persona" sin
# importarles cuál de los dos tipos llegó, estos 3 helpers son el único
# lugar donde se hace ese isinstance, para que no se repita en cada router.
def organizacion_id_de(usuario) -> int:
    """
    El organizacion_id real de la cuenta autenticada:
    - models.Usuario (persona, R10.1): su .id NO es organizacion_id, hay que
      usar .organizacion_id.
    - models.Organizacion (camino viejo — admin de plataforma, u
      organizaciones cliente todavía no migradas a Usuario por R10.4): para
      ella .id SIEMPRE fue su propio organizacion_id, como antes de R10.
    """
    return usuario.organizacion_id if isinstance(usuario, models.Usuario) else usuario.id


def organizacion_de(usuario) -> models.Organizacion:
    """La Organizacion real a la que pertenece la cuenta autenticada."""
    return usuario.organizacion if isinstance(usuario, models.Usuario) else usuario


def usuario_id_autor_de(usuario):
    """
    El id de la PERSONA que hizo la acción, para columnas como
    VersionTratamiento.usuario_id (R10.0). None en el camino viejo: todavía
    no hay una persona real detrás de esa cuenta (eso es R10.4).
    """
    return usuario.id if isinstance(usuario, models.Usuario) else None


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


def requiere_admin_org(
    usuario = Depends(obtener_usuario_actual),
):
    """
    Dependencia para endpoints exclusivos del admin de UNA organización
    (rol='ADMIN_ORG' en `usuarios`, R10.1/R10.2) — no confundir con
    requiere_admin (admin de PLATAFORMA, rol='ADMIN' en `organizaciones`).
    El camino viejo (Organizacion) nunca pasa acá, ni siquiera el admin de
    plataforma: es exclusivo de personas reales dentro de una organización.
    """
    if not isinstance(usuario, models.Usuario) or usuario.rol != "ADMIN_ORG":
        raise HTTPException(status_code=403, detail="Acceso restringido al administrador de la organización")
    return usuario


def requiere_gestionar_organizacion(
    usuario = Depends(obtener_usuario_actual),
) -> models.Organizacion:
    """
    Dependencia para endpoints que editan datos de LA ORGANIZACIÓN (nombre,
    logo, color — R10.3), no de una cuenta individual.

    A diferencia de requiere_admin_org (exclusiva de un models.Usuario real
    con rol ADMIN_ORG, porque gestionar subcuentas solo tiene sentido una vez
    migrado a R10.4), acá SÍ se deja pasar al camino viejo (Organizacion):
    esas cuentas siempre pudieron editar su propio logo/nombre/color sin
    restricción, R10 no les puede sacar algo que siempre tuvieron.

    Devuelve directo la Organizacion a editar (nunca el Usuario) — el
    endpoint no necesita ramificar nada.
    """
    if isinstance(usuario, models.Usuario) and usuario.rol != "ADMIN_ORG":
        raise HTTPException(status_code=403, detail="Acceso restringido al administrador de la organización")
    return organizacion_de(usuario)


def requiere_permiso(modulo: str, accion: str):
    """
    Dependencia para exigir un permiso granular puntual (R10.1/R10.3).
    Uso: def mi_endpoint(usuario = Depends(requiere_permiso("tratamientos", "editar")))

    - Camino viejo (Organizacion — admin de plataforma, u organizaciones
      cliente todavía no migradas a Usuario por R10.4): pasa siempre, sin
      restricción. Estas cuentas siempre tuvieron acceso total a lo suyo;
      R10 solo AGREGA subcuentas restringidas, no le saca nada a la cuenta
      original.
    - ADMIN_ORG: pasa siempre, sin consultar permisos_usuario.
    - MIEMBRO: exige que el booleano "{modulo}_{accion}" en su PermisoUsuario
      esté en True.
    """
    def _dependencia(
        usuario = Depends(obtener_usuario_actual),
        db: Session = Depends(get_db),
    ):
        if not isinstance(usuario, models.Usuario):
            return usuario

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
