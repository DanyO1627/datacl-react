from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from passlib.context import CryptContext

from app.basededatos import get_db
from app.schemas import OrganizacionCambiarPassword
from app.utils.jwt import obtener_usuario_actual

# R10.3 -> lo que es de la CUENTA propia (password): cualquier cuenta
# autenticada, sea Usuario o el camino viejo (Organizacion), cambia SU
# PROPIA password sin restricción de rol, mismo comportamiento de siempre.
# Mismo prefix "/organizaciones" que organizaciones.py (que se queda con
# nombre/correo/logo/color) para no cambiar ninguna URL de cara al frontend.
router = APIRouter(prefix="/organizaciones", tags=["Organizaciones"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


@router.put("/password", summary="Cambiar la propia contraseña")
def cambiar_password(
    datos: OrganizacionCambiarPassword,
    db: Session = Depends(get_db),
    usuario=Depends(obtener_usuario_actual),
):
    """
    Cambia la contraseña de la cuenta autenticada (Usuario o Organizacion,
    sin restricción de rol — es autoservicio sobre la propia cuenta).
    """
    if not pwd_context.verify(datos.password_actual, usuario.password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La contraseña actual es incorrecta",
        )

    if pwd_context.verify(datos.password_nueva, usuario.password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La nueva contraseña debe ser diferente a la actual",
        )

    usuario.password = pwd_context.hash(datos.password_nueva)
    db.commit()

    return {"mensaje": "Contraseña actualizada correctamente"}
