from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
import os

from app.basededatos import get_db as get_bd
from app.utils.jwt import obtener_usuario_actual
from app import models

router = APIRouter(prefix="/informes", tags=["Informes"])


@router.get("")
def listar_informes(
    db: Session = Depends(get_bd),
    usuario=Depends(obtener_usuario_actual),
):
    """Lista los informes de la organización autenticada."""
    informes = (
        db.query(models.Informe)
        .filter(models.Informe.organizacion_id == usuario.id)
        .order_by(models.Informe.generado_en.desc())
        .all()
    )
    return [
        {
            "id": inf.id,
            "num_tratamientos": db.query(models.Tratamiento).filter(
                models.Tratamiento.organizacion_id == usuario.id
            ).count(),
            "generado_en": inf.generado_en,
        }
        for inf in informes
    ]


@router.post("/generar")
def generar_informe(
    db: Session = Depends(get_bd),
    usuario=Depends(obtener_usuario_actual),
):
    """
    Genera un nuevo informe para la organización autenticada.
    Intenta obtener contenido IA via Groq; si falla igual crea el informe.
    """
    org = db.query(models.Organizacion).filter(models.Organizacion.id == usuario.id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organización no encontrada")

    tratamientos = (
        db.query(models.Tratamiento)
        .filter(models.Tratamiento.organizacion_id == usuario.id)
        .all()
    )

    contenido_ia = None
    try:
        from groq import Groq
        api_key = os.getenv("GROQ_API_KEY")
        if api_key:
            client = Groq(api_key=api_key)
            resumen_tratamientos = "\n".join([
                f"- {t.nombre} (riesgo: {t.nivel_riesgo or 'N/A'}, estado: {t.estado})"
                for t in tratamientos
            ])
            prompt = (
                f"Organización: {org.nombre}\n"
                f"Tratamientos de datos personales:\n{resumen_tratamientos}\n\n"
                "Genera un párrafo breve de análisis de cumplimiento de privacidad "
                "según la Ley 21.719 de Chile."
            )
            chat = client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model="llama3-8b-8192",
            )
            contenido_ia = chat.choices[0].message.content
    except Exception:
        pass

    informe = models.Informe(
        organizacion_id=usuario.id,
        contenido_ia=contenido_ia,
    )
    db.add(informe)
    db.commit()
    db.refresh(informe)

    return {
        "id": informe.id,
        "num_tratamientos": len(tratamientos),
        "generado_en": informe.generado_en,
        "contenido_ia": contenido_ia,
    }


@router.get("/{informe_id}/descargar")
def descargar_informe(
    informe_id: int,
    db: Session = Depends(get_bd),
    usuario=Depends(obtener_usuario_actual),
):
    """Descarga el informe como PDF. Solo si pertenece a la org del token."""
    informe = (
        db.query(models.Informe)
        .filter(
            models.Informe.id == informe_id,
            models.Informe.organizacion_id == usuario.id,
        )
        .first()
    )
    if not informe:
        raise HTTPException(status_code=404, detail="Informe no encontrado")

    org = informe.organizacion
    tratamientos = (
        db.query(models.Tratamiento)
        .filter(models.Tratamiento.organizacion_id == org.id)
        .all()
    )

    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    styles = getSampleStyleSheet()
    elementos = []

    elementos.append(Paragraph("DataCL - Informe de Tratamientos", styles["Title"]))
    elementos.append(Spacer(1, 12))
    elementos.append(Paragraph(f"Organización: {org.nombre}", styles["Normal"]))
    elementos.append(Paragraph(f"RUT: {org.rut}", styles["Normal"]))
    elementos.append(Paragraph(f"Correo: {org.correo}", styles["Normal"]))
    elementos.append(Paragraph(
        f"Fecha de generación: {informe.generado_en.strftime('%d/%m/%Y')}",
        styles["Normal"],
    ))
    elementos.append(Spacer(1, 20))

    if informe.contenido_ia:
        elementos.append(Paragraph("Análisis IA", styles["Heading2"]))
        elementos.append(Spacer(1, 8))
        elementos.append(Paragraph(informe.contenido_ia, styles["Normal"]))
        elementos.append(Spacer(1, 20))

    elementos.append(Paragraph("Tratamientos incluidos", styles["Heading2"]))
    elementos.append(Spacer(1, 8))

    datos_tabla = [["#", "Nombre", "Nivel de riesgo", "Estado", "Fecha"]]
    for i, t in enumerate(tratamientos, 1):
        datos_tabla.append([
            str(i),
            t.nombre,
            t.nivel_riesgo or "-",
            t.estado,
            t.creado_en.strftime("%d/%m/%Y") if t.creado_en else "-",
        ])

    if len(datos_tabla) > 1:
        tabla = Table(datos_tabla, colWidths=[25, 180, 90, 80, 80])
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

    nombre_archivo = (
        f"informe_{org.nombre.replace(' ', '_')}"
        f"_{informe.generado_en.strftime('%Y%m%d')}.pdf"
    )
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={nombre_archivo}"},
    )
