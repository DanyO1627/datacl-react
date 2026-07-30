from collections import Counter
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from passlib.context import CryptContext
from sqlalchemy.orm import Session, selectinload

from app import models
from app.basededatos import get_db as get_bd
from app.schemas import (
    OrganizacionAdminActualizar,
    OrganizacionAdminResetPassword,
)
from app.utils.jwt import requiere_admin

router = APIRouter(prefix="/admin", tags=["Admin"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _max_fecha(*fechas):
    validas = [fecha for fecha in fechas if fecha is not None]
    return max(validas) if validas else None


def _indice_actividad(org: models.Organizacion) -> int:
    return (
        len(org.tratamientos) * 3
        + len(org.informes) * 2
        + len(org.sesiones)
        + sum(len(t.versiones) for t in org.tratamientos)
    )


def _resumen_organizacion(org: models.Organizacion) -> dict:
    tratamientos = list(org.tratamientos)
    informes = list(org.informes)
    sesiones = list(org.sesiones)

    estados = Counter(t.estado for t in tratamientos)
    riesgos = Counter((t.nivel_riesgo or "SIN_CLASIFICAR") for t in tratamientos)
    fuentes = Counter(s.fuente for s in sesiones)

    ultimo_tratamiento = max(
        (t.creado_en for t in tratamientos if t.creado_en is not None),
        default=None,
    )
    ultima_actividad = _max_fecha(
        org.creado_en,
        ultimo_tratamiento,
        max((t.actualizado_en for t in tratamientos if t.actualizado_en), default=None),
        max((i.generado_en for i in informes if i.generado_en), default=None),
        max((s.creado_en for s in sesiones if s.creado_en), default=None),
    )

    return {
        "id": org.id,
        "nombre": org.nombre,
        "rut": org.rut,
        "correo": org.correo,
        "creado_en": org.creado_en,
        "activo": getattr(org, "activo", True),
        "total_tratamientos": len(tratamientos),
        "tratamientos_por_estado": {
            "BORRADOR": estados.get("BORRADOR", 0),
            "PENDIENTE": estados.get("PENDIENTE", 0),
            "COMPLETO": estados.get("COMPLETO", 0),
        },
        "nivel_riesgo_predominante": riesgos.most_common(1)[0][0] if riesgos else None,
        "total_informes": len(informes),
        "total_versiones": sum(len(t.versiones) for t in tratamientos),
        "total_sesiones": len(sesiones),
        "sesiones_por_fuente": {
            "archivo": fuentes.get("archivo", 0),
            "bd": fuentes.get("bd", 0),
            "manual": fuentes.get("manual", 0),
        },
        "tiene_logo": bool(org.logo_ruta),
        "tiene_color": bool(org.color_institucional),
        "ultimo_tratamiento": ultimo_tratamiento,
        "ultima_actividad": ultima_actividad,
        "indice_actividad": _indice_actividad(org),
    }


def _cargar_organizaciones(db: Session):
    return (
        db.query(models.Organizacion)
        .filter(models.Organizacion.rol == "ORGANIZACION")
        .options(
            selectinload(models.Organizacion.tratamientos).selectinload(models.Tratamiento.versiones),
            selectinload(models.Organizacion.informes),
            selectinload(models.Organizacion.sesiones),
        )
        .all()
    )


def _tratamientos_por_mes(organizaciones: list[models.Organizacion]) -> list[dict]:
    conteo = Counter()
    for org in organizaciones:
        for tratamiento in org.tratamientos:
            if tratamiento.creado_en:
                conteo[tratamiento.creado_en.strftime("%Y-%m")] += 1

    ahora = datetime.now()
    meses = []
    year = ahora.year
    month = ahora.month

    for _ in range(12):
        clave = f"{year:04d}-{month:02d}"
        meses.append(
            {
                "mes": clave,
                "label": f"{month:02d}/{year}",
                "total": conteo.get(clave, 0),
            }
        )
        month -= 1
        if month == 0:
            month = 12
            year -= 1

    return list(reversed(meses))


@router.get("/stats")
def obtener_stats(db: Session = Depends(get_bd), _=Depends(requiere_admin)):
    """Devuelve métricas globales y rankings de actividad."""
    organizaciones = _cargar_organizaciones(db)

    total_tratamientos = 0
    completos = 0
    pendientes = 0
    borradores = 0
    informes_totales = 0
    riesgo = Counter()

    for org in organizaciones:
        for tratamiento in org.tratamientos:
            total_tratamientos += 1
            riesgo[tratamiento.nivel_riesgo or "SIN_CLASIFICAR"] += 1
            if tratamiento.estado == "COMPLETO":
                completos += 1
            elif tratamiento.estado == "PENDIENTE":
                pendientes += 1
            elif tratamiento.estado == "BORRADOR":
                borradores += 1
        informes_totales += len(org.informes)

    orgs_activas = [org for org in organizaciones if getattr(org, "activo", True)]
    orgs_con_logo = sum(1 for org in organizaciones if org.logo_ruta)
    orgs_con_color = sum(1 for org in organizaciones if org.color_institucional)
    orgs_con_informes = sum(1 for org in organizaciones if org.informes)
    orgs_con_tratamientos = sum(1 for org in organizaciones if org.tratamientos)

    res_orgs = [_resumen_organizacion(org) for org in organizaciones]
    orgs_mas_activas = sorted(res_orgs, key=lambda item: item["indice_actividad"], reverse=True)[:5]
    orgs_menos_activas = sorted(res_orgs, key=lambda item: item["indice_actividad"])[:5]

    ultima_actividad = max(
        (item["ultima_actividad"] for item in res_orgs if item["ultima_actividad"] is not None),
        default=None,
    )

    return {
        "total_organizaciones": len(organizaciones),
        "organizaciones_activas": len(orgs_activas),
        "organizaciones_con_tratamientos": orgs_con_tratamientos,
        "organizaciones_con_informes": orgs_con_informes,
        "organizaciones_con_logo": orgs_con_logo,
        "organizaciones_con_color": orgs_con_color,
        "total_tratamientos": total_tratamientos,
        "completos": completos,
        "pendientes": pendientes,
        "borradores": borradores,
        "total_informes": informes_totales,
        "riesgo_distribucion": {
            "ALTO": riesgo.get("ALTO", 0),
            "MEDIO": riesgo.get("MEDIO", 0),
            "BAJO": riesgo.get("BAJO", 0),
            "SIN_CLASIFICAR": riesgo.get("SIN_CLASIFICAR", 0),
        },
        "tratamientos_por_estado": [
            {"estado": "BORRADOR", "total": borradores},
            {"estado": "PENDIENTE", "total": pendientes},
            {"estado": "COMPLETO", "total": completos},
        ],
        "tratamientos_por_mes": _tratamientos_por_mes(organizaciones),
        "organizaciones_mas_activas": [
            {
                "id": org["id"],
                "nombre": org["nombre"],
                "rut": org["rut"],
                "total_tratamientos": org["total_tratamientos"],
                "total_informes": org["total_informes"],
                "indice_actividad": org["indice_actividad"],
            }
            for org in orgs_mas_activas
        ],
        "organizaciones_menos_activas": [
            {
                "id": org["id"],
                "nombre": org["nombre"],
                "rut": org["rut"],
                "total_tratamientos": org["total_tratamientos"],
                "total_informes": org["total_informes"],
                "indice_actividad": org["indice_actividad"],
            }
            for org in orgs_menos_activas
        ],
        "ultima_actividad": ultima_actividad,
    }


@router.get("/organizaciones")
def listar_organizaciones(
    buscar: Optional[str] = Query(None, description="Buscar por nombre, RUT o correo"),
    db: Session = Depends(get_bd),
    _=Depends(requiere_admin),
):
    organizaciones = _cargar_organizaciones(db)

    if buscar:
        termino = buscar.lower()
        organizaciones = [
            org
            for org in organizaciones
            if termino in org.nombre.lower()
            or termino in org.rut.lower()
            or termino in org.correo.lower()
        ]

    organizaciones.sort(key=lambda org: org.nombre.lower())
    return [_resumen_organizacion(org) for org in organizaciones]


@router.get("/organizaciones/{org_id}")
def obtener_organizacion(org_id: int, db: Session = Depends(get_bd), _=Depends(requiere_admin)):
    """Devuelve el detalle de una organización específica."""
    org = (
        db.query(models.Organizacion)
        .filter(
            models.Organizacion.id == org_id,
            models.Organizacion.rol == "ORGANIZACION",
        )
        .options(
            selectinload(models.Organizacion.tratamientos).selectinload(models.Tratamiento.versiones),
            selectinload(models.Organizacion.informes),
            selectinload(models.Organizacion.sesiones),
        )
        .first()
    )

    if not org:
        raise HTTPException(status_code=404, detail="Organización no encontrada")

    resumen = _resumen_organizacion(org)
    resumen.update(
        {
            "color_institucional": org.color_institucional,
            "logo_ruta": org.logo_ruta,
            "nivel_riesgo_predominante": resumen["nivel_riesgo_predominante"],
        }
    )
    return resumen


@router.put("/organizaciones/{org_id}")
def actualizar_organizacion(
    org_id: int,
    datos: OrganizacionAdminActualizar,
    db: Session = Depends(get_bd),
    _=Depends(requiere_admin),
):
    org = (
        db.query(models.Organizacion)
        .filter(
            models.Organizacion.id == org_id,
            models.Organizacion.rol == "ORGANIZACION",
        )
        .first()
    )

    if not org:
        raise HTTPException(status_code=404, detail="Organización no encontrada")

    if datos.correo is not None:
        correo_en_uso = (
            db.query(models.Organizacion)
            .filter(
                models.Organizacion.correo == datos.correo,
                models.Organizacion.id != org.id,
            )
            .first()
        )
        if correo_en_uso:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El correo ya está en uso por otra organización",
            )
        org.correo = datos.correo

    if datos.nombre is not None:
        org.nombre = datos.nombre

    if datos.activo is not None:
        org.activo = datos.activo

    db.commit()
    db.refresh(org)
    return _resumen_organizacion(org)


@router.put("/organizaciones/{org_id}/password")
def resetear_password_organizacion(
    org_id: int,
    datos: OrganizacionAdminResetPassword,
    db: Session = Depends(get_bd),
    _=Depends(requiere_admin),
):
    org = (
        db.query(models.Organizacion)
        .filter(
            models.Organizacion.id == org_id,
            models.Organizacion.rol == "ORGANIZACION",
        )
        .first()
    )

    if not org:
        raise HTTPException(status_code=404, detail="Organización no encontrada")

    nueva_password = pwd_context.hash(datos.password_nueva)
    org.password = nueva_password
    db.commit()

    return {"mensaje": "Contraseña actualizada correctamente"}
