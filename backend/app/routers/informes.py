from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet

from app.basededatos import get_db as get_bd
from app import models

router = APIRouter(prefix="/informes", tags=["Informes"])


@router.get("")
def listar_informes(db: Session = Depends(get_bd)):
    """Lista todos los informes generados."""
    informes = db.query(models.Informe).order_by(models.Informe.generado_en.desc()).all()
    return [
        {
            "id": inf.id,
            "titulo": inf.titulo,
            "num_tratamientos": inf.num_tratamientos,
            "generado_en": inf.generado_en,
            "organizacion": inf.organizacion.nombre if inf.organizacion else "-"
        }
        for inf in informes
    ]


@router.post("")
def generar_informe(org_id: int, db: Session = Depends(get_bd)):
    """Genera un nuevo informe para una organización."""
    org = db.query(models.Organizacion).filter(models.Organizacion.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organización no encontrada")

    num_tratamientos = db.query(models.Tratamiento).filter(
        models.Tratamiento.organizacion_id == org_id
    ).count()

    informe = models.Informe(
        organizacion_id=org_id,
        titulo=f"Informe {org.nombre}",
        num_tratamientos=num_tratamientos
    )
    db.add(informe)
    db.commit()
    db.refresh(informe)

    return {
        "id": informe.id,
        "titulo": informe.titulo,
        "num_tratamientos": informe.num_tratamientos,
        "generado_en": informe.generado_en
    }


@router.get("/{informe_id}/descargar")
def descargar_informe(informe_id: int, db: Session = Depends(get_bd)):
    """Descarga el informe como PDF."""
    informe = db.query(models.Informe).filter(models.Informe.id == informe_id).first()
    if not informe:
        raise HTTPException(status_code=404, detail="Informe no encontrado")

    org = informe.organizacion
    tratamientos = db.query(models.Tratamiento).filter(
        models.Tratamiento.organizacion_id == org.id
    ).all()

    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    styles = getSampleStyleSheet()
    elementos = []

    elementos.append(Paragraph("DataCL - Informe", styles["Title"]))
    elementos.append(Spacer(1, 12))
    elementos.append(Paragraph(f"Organización: {org.nombre}", styles["Normal"]))
    elementos.append(Paragraph(f"RUT: {org.rut}", styles["Normal"]))
    elementos.append(Paragraph(f"Correo: {org.correo}", styles["Normal"]))
    elementos.append(Paragraph(f"Fecha de generación: {informe.generado_en.strftime('%d/%m/%Y')}", styles["Normal"]))
    elementos.append(Spacer(1, 20))

    elementos.append(Paragraph("Tratamientos incluidos", styles["Heading2"]))
    elementos.append(Spacer(1, 8))

    datos_tabla = [["#", "Tipo", "Estado", "Fecha"]]
    for i, t in enumerate(tratamientos, 1):
        datos_tabla.append([
            str(i),
            t.tipo,
            t.estado,
            t.fecha.strftime("%d/%m/%Y") if t.fecha else "-"
        ])

    if len(datos_tabla) > 1:
        tabla = Table(datos_tabla, colWidths=[30, 200, 100, 100])
        tabla.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2b2b3b")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.whitesmoke, colors.lightgrey]),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ("FONTSIZE", (0, 0), (-1, -1), 10),
            ("PADDING", (0, 0), (-1, -1), 6),
        ]))
        elementos.append(tabla)
    else:
        elementos.append(Paragraph("No hay tratamientos registrados.", styles["Normal"]))

    doc.build(elementos)
    buffer.seek(0)

    nombre_archivo = f"informe_{org.nombre.replace(' ', '_')}_{informe.generado_en.strftime('%Y%m%d')}.pdf"
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={nombre_archivo}"}
    )
