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
    Se usa así en cualquier endpoint:
        def mi_endpoint(usuario = Depends(obtener_usuario_actual)):
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