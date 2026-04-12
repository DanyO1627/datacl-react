from fastapi import HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.basededatos import get_bd
from app import models

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def obtener_usuario_actual(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_bd)
) -> models.Organizacion:
    """
    Dependencia para proteger endpoints que requieren login.
    Por ahora lanza error siempre — se completa en el sprint de login
    cuando exista verificar_token.
    """
    raise HTTPException(
        status_code=501,
        detail="Login aún no implementado — sprint 1"
    )