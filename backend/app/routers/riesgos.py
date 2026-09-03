from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.basededatos import get_db
from app.utils.jwt import requiere_permiso, organizacion_id_de
from app.schemas import ResumenRiesgosRespuesta
from app.services import tratamientos_service as svc

# R10.10 — router propio, separado de tratamientos.py a propósito: antes
# "Riesgos" en el frontend reusaba GET /tratamientos (protegido solo por
# tratamientos_ver), así que riesgos_ver era un permiso sin ningún endpoint
# que lo exigiera. Este router es la otra mitad del hallazgo pendiente #1 de
# R10.3 — gateado únicamente por riesgos_ver (sin OR con tratamientos_ver:
# son permisos independientes, mismo criterio de diseño que el resto de R10).
router = APIRouter(prefix="/riesgos", tags=["Riesgos"])


@router.get(
    "/resumen",
    response_model=ResumenRiesgosRespuesta,
    summary="Resumen agregado de riesgos de la propia organización",
)
def resumen_riesgos(
    db: Session = Depends(get_db),
    usuario=Depends(requiere_permiso("riesgos", "ver")),
):
    return svc.obtener_resumen_riesgos(db, organizacion_id_de(usuario))
