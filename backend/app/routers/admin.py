from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.basededatos import get_db as get_bd
from app.utils.jwt import requiere_admin
from app import models

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/stats")
def obtener_stats(db: Session = Depends(get_bd), _=Depends(requiere_admin)):
    """Devuelve total de organizaciones, tratamientos completos y pendientes."""
    total     = db.query(models.Organizacion).filter(models.Organizacion.rol == "ORGANIZACION").count()
    completos = db.query(models.Tratamiento).filter(models.Tratamiento.estado == "COMPLETO").count()
    pendientes = db.query(models.Tratamiento).filter(models.Tratamiento.estado == "PENDIENTE").count()
    return {"total": total, "completos": completos, "pendientes": pendientes}


@router.get("/organizaciones")
def listar_organizaciones(
    buscar: Optional[str] = Query(None, description="Buscar por nombre, RUT o correo"),
    db: Session = Depends(get_bd),
    _=Depends(requiere_admin),
):
    query = db.query(models.Organizacion).filter(models.Organizacion.rol == "ORGANIZACION")

    if buscar:
        query = query.filter(
            models.Organizacion.nombre.ilike(f"%{buscar}%") |
            models.Organizacion.rut.ilike(f"%{buscar}%") |
            models.Organizacion.correo.ilike(f"%{buscar}%")
        )

    organizaciones = query.all()
    resultado = []

    for org in organizaciones:
        tratamientos = db.query(models.Tratamiento).filter(
            models.Tratamiento.organizacion_id == org.id
        ).all()

        if tratamientos:
            for t in tratamientos:
                resultado.append({
                    "id":               org.id,
                    "nombre":           org.nombre,
                    "rut":              org.rut,
                    "correo":           org.correo,
                    "creado_en":        org.creado_en,
                    "tratamiento":      t.nombre,
                    "estado":           t.estado,
                    "fecha_tratamiento": t.creado_en,
                })
        else:
            resultado.append({
                "id":               org.id,
                "nombre":           org.nombre,
                "rut":              org.rut,
                "correo":           org.correo,
                "creado_en":        org.creado_en,
                "tratamiento":      None,
                "estado":           None,
                "fecha_tratamiento": None,
            })

    return resultado


@router.get("/organizaciones/{org_id}")
def obtener_organizacion(org_id: int, db: Session = Depends(get_bd), _=Depends(requiere_admin)):
    """Devuelve el detalle de una organización específica."""
    org = db.query(models.Organizacion).filter(models.Organizacion.id == org_id).first()

    if not org:
        raise HTTPException(status_code=404, detail="Organización no encontrada")

    ultimo_tratamiento = None
    if org.tratamientos:
        ultimo_tratamiento = max(org.tratamientos, key=lambda t: t.creado_en).creado_en

    return {
        "id":                  org.id,
        "nombre":              org.nombre,
        "rut":                 org.rut,
        "correo":              org.correo,
        "creado_en":           org.creado_en,
        "total_tratamientos":  len(org.tratamientos),
        "ultimo_tratamiento":  ultimo_tratamiento,
        "total_informes":      len(org.informes),
    }