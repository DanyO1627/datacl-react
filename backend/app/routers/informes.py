import os
from datetime import datetime
from io import BytesIO
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from dotenv import load_dotenv

from app.basededatos import get_db
from app import models
from app.utils.jwt import obtener_usuario_actual
from app.schemas import InformeRespuesta, GenerarInformeRequest

load_dotenv()

router = APIRouter(prefix="/informes", tags=["Informes"])

# Carpeta donde se guardan los PDFs — se crea automáticamente si no existe
CARPETA_INFORMES = Path("informes_generados")
CARPETA_INFORMES.mkdir(exist_ok=True)


# ─────────────────────────────────────────────────────────────────────────────
# GROQ — análisis IA
# ─────────────────────────────────────────────────────────────────────────────

def _pedir_analisis_ia(tratamientos: list) -> str | None:
    """
    Llama a Groq con un resumen de los tratamientos y devuelve el análisis.
    Si falla por cualquier motivo devuelve None — el PDF se genera igual.
    """
    try:
        from groq import Groq
        cliente = Groq(api_key=os.getenv("GROQ_API_KEY"))

        resumen = []
        for t in tratamientos:
            resumen.append(
                f"- {t.nombre}: nivel_riesgo={t.nivel_riesgo}, "
                f"probabilidad={t.probabilidad}, impacto={t.impacto}, "
                f"datos_sensibles={t.datos_sensibles}, "
                f"sale_extranjero={t.sale_extranjero}, "
                f"decisiones_automatizadas={t.decisiones_automatizadas}"
            )

        prompt = f"""Eres un experto en protección de datos personales bajo la Ley 21.719 de Chile.
Analiza estos tratamientos de datos y entrega recomendaciones específicas:

{chr(10).join(resumen)}

Incluye:
1. Riesgos identificados por tratamiento
2. Recomendaciones específicas para reducir el riesgo
3. Conclusión general sobre el nivel de cumplimiento

Metodología: AEPD adaptada a Ley 21.719. Sé concreto y práctico."""

        respuesta = cliente.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=1000,
        )
        return respuesta.choices[0].message.content

    except Exception:
        return None


# ─────────────────────────────────────────────────────────────────────────────
# REPORTLAB — construcción del PDF
# ─────────────────────────────────────────────────────────────────────────────

def _construir_pdf(org, tratamientos: list, contenido_ia: str | None, ruta: Path) -> None:
    """Construye el PDF completo y lo guarda en disco."""

    doc = SimpleDocTemplate(
        str(ruta),
        pagesize=A4,
        rightMargin=2*cm,
        leftMargin=2*cm,
        topMargin=2*cm,
        bottomMargin=2*cm,
    )
    styles = getSampleStyleSheet()
    elementos = []

    pequeño = ParagraphStyle("pequeño", parent=styles["Normal"], fontSize=9)
    etiqueta = ParagraphStyle("etiqueta", parent=styles["Normal"], fontSize=8,
                              textColor=colors.HexColor("#888888"))

    # ── PORTADA ──────────────────────────────────────────────────────────────
    elementos.append(Spacer(1, 1*cm))
    elementos.append(Paragraph("DataCL", styles["Title"]))
    elementos.append(Paragraph("Registro de Actividades de Tratamiento", styles["Heading2"]))
    elementos.append(Spacer(1, 0.5*cm))
    elementos.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#2b2b3b")))
    elementos.append(Spacer(1, 0.5*cm))
    elementos.append(Paragraph(f"Organización: {org.nombre}", styles["Normal"]))
    elementos.append(Paragraph(f"RUT: {org.rut}", styles["Normal"]))
    elementos.append(Paragraph(f"Correo: {org.correo}", styles["Normal"]))
    elementos.append(Paragraph(
        f"Fecha de generación: {datetime.now().strftime('%d/%m/%Y %H:%M')}",
        styles["Normal"]
    ))
    elementos.append(Spacer(1, 1*cm))

    # ── RESUMEN EJECUTIVO ────────────────────────────────────────────────────
    elementos.append(Paragraph("Resumen ejecutivo", styles["Heading2"]))
    elementos.append(Spacer(1, 0.3*cm))

    total      = len(tratamientos)
    altos      = sum(1 for t in tratamientos if t.nivel_riesgo == "ALTO")
    medios     = sum(1 for t in tratamientos if t.nivel_riesgo == "MEDIO")
    bajos      = sum(1 for t in tratamientos if t.nivel_riesgo == "BAJO")
    pendientes = sum(1 for t in tratamientos if t.nivel_riesgo is None)

    datos_resumen = [
        ["Total tratamientos", str(total)],
        ["Riesgo ALTO",        str(altos)],
        ["Riesgo MEDIO",       str(medios)],
        ["Riesgo BAJO",        str(bajos)],
        ["Sin evaluar",        str(pendientes)],
    ]
    tabla_resumen = Table(datos_resumen, colWidths=[10*cm, 4*cm])
    tabla_resumen.setStyle(TableStyle([
        ("BACKGROUND",  (0, 0), (0, -1), colors.HexColor("#f5f5fa")),
        ("FONTNAME",    (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTSIZE",    (0, 0), (-1, -1), 10),
        ("GRID",        (0, 0), (-1, -1), 0.5, colors.HexColor("#dddddd")),
        ("PADDING",     (0, 0), (-1, -1), 6),
        ("TEXTCOLOR",   (1, 1), (1, 1), colors.HexColor("#e53e3e")),
        ("TEXTCOLOR",   (1, 2), (1, 2), colors.HexColor("#dd6b20")),
        ("TEXTCOLOR",   (1, 3), (1, 3), colors.HexColor("#38a169")),
    ]))
    elementos.append(tabla_resumen)
    elementos.append(Spacer(1, 1*cm))

    # ── SECCIÓN POR TRATAMIENTO ───────────────────────────────────────────────
    elementos.append(Paragraph("Detalle de tratamientos", styles["Heading2"]))

    for i, t in enumerate(tratamientos, 1):
        elementos.append(Spacer(1, 0.5*cm))
        elementos.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#dddddd")))

        color_riesgo = {
            "ALTO":  "#e53e3e",
            "MEDIO": "#dd6b20",
            "BAJO":  "#38a169",
        }.get(t.nivel_riesgo or "", "#aaaaaa")

        elementos.append(Paragraph(
            f'<b>{i}. {t.nombre}</b> — '
            f'<font color="{color_riesgo}"><b>{t.nivel_riesgo or "Sin evaluar"}</b></font>',
            styles["Normal"]
        ))
        elementos.append(Spacer(1, 0.2*cm))

        campos_detalle = [
            ["Finalidad",                t.finalidad               or "—"],
            ["Base legal",               t.base_legal              or "—"],
            ["Datos sensibles",          "Sí" if t.datos_sensibles else "No"],
            ["Destinatarios",            t.destinatarios           or "—"],
            ["Plazo de conservación",    t.plazo_conservacion      or "—"],
            ["Medidas de seguridad",     t.medidas_seguridad       or "—"],
            ["Sale al extranjero",       "Sí" if t.sale_extranjero else "No"],
            ["Decisiones automatizadas", "Sí" if t.decisiones_automatizadas else "No"],
            ["Probabilidad",             t.probabilidad            or "—"],
            ["Impacto",                  t.impacto                 or "—"],
            ["Estado",                   t.estado],
        ]

        tabla_t = Table(campos_detalle, colWidths=[6*cm, 10*cm])
        tabla_t.setStyle(TableStyle([
            ("FONTNAME",  (0, 0), (0, -1), "Helvetica-Bold"),
            ("FONTSIZE",  (0, 0), (-1, -1), 9),
            ("BACKGROUND",(0, 0), (0, -1), colors.HexColor("#f9f9fb")),
            ("GRID",      (0, 0), (-1, -1), 0.3, colors.HexColor("#eeeeee")),
            ("PADDING",   (0, 0), (-1, -1), 5),
            ("VALIGN",    (0, 0), (-1, -1), "TOP"),
        ]))
        elementos.append(tabla_t)

        if t.campos:
            elementos.append(Spacer(1, 0.2*cm))
            elementos.append(Paragraph("Campos detectados:", pequeño))
            for campo in t.campos:
                tipo = "SENSIBLE" if campo.es_sensible else "PERSONAL"
                elementos.append(Paragraph(
                    f"  • {campo.nombre_columna} ({tipo})", pequeño
                ))

    elementos.append(Spacer(1, 1*cm))

    # ── ANÁLISIS IA ───────────────────────────────────────────────────────────
    if contenido_ia:
        elementos.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#2b2b3b")))
        elementos.append(Spacer(1, 0.3*cm))
        elementos.append(Paragraph("Análisis de inteligencia artificial", styles["Heading2"]))
        elementos.append(Spacer(1, 0.3*cm))
        for linea in contenido_ia.split("\n"):
            if linea.strip():
                elementos.append(Paragraph(linea.strip(), pequeño))
                elementos.append(Spacer(1, 0.15*cm))

    elementos.append(Spacer(1, 1*cm))

    # ── PIE DE PÁGINA ─────────────────────────────────────────────────────────
    elementos.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#dddddd")))
    elementos.append(Spacer(1, 0.2*cm))
    elementos.append(Paragraph(
        "Evaluado según metodología AEPD adaptada a Ley 21.719 de Protección de Datos Personales (Chile)",
        etiqueta
    ))

    doc.build(elementos)


# ─────────────────────────────────────────────────────────────────────────────
# ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/generar")
def generar_informe(
    datos: GenerarInformeRequest,
    db: Session = Depends(get_db),
    usuario: models.Organizacion = Depends(obtener_usuario_actual),
):
    """
    Genera el informe PDF con los tratamientos seleccionados por el usuario.
    Valida que los IDs recibidos pertenezcan a la organización del token.
    """
    if not datos.ids_tratamientos:
        raise HTTPException(
            status_code=400,
            detail="Selecciona al menos un tratamiento para generar el informe.",
        )

    tratamientos = db.query(models.Tratamiento).filter(
        models.Tratamiento.id.in_(datos.ids_tratamientos),
        models.Tratamiento.organizacion_id == usuario.id,
    ).order_by(models.Tratamiento.creado_en.desc()).all()

    if not tratamientos:
        raise HTTPException(
            status_code=400,
            detail="No se encontraron tratamientos válidos para generar el informe.",
        )

    nombre_seguro = usuario.nombre.replace(" ", "_").replace("/", "-")
    fecha_str     = datetime.now().strftime("%Y%m%d_%H%M%S")
    nombre_pdf    = f"informe_{nombre_seguro}_{fecha_str}.pdf"
    ruta_pdf      = CARPETA_INFORMES / nombre_pdf

    _construir_pdf(usuario, tratamientos, None, ruta_pdf)

    nuevo_informe = models.Informe(
        organizacion_id=usuario.id,
        contenido_ia=None,
        ruta_pdf=str(ruta_pdf),
    )
    db.add(nuevo_informe)
    db.commit()
    db.refresh(nuevo_informe)

    return {
        "id":          nuevo_informe.id,
        "generado_en": nuevo_informe.generado_en,
        "tiene_ia":    False,
        "ruta_pdf":    str(ruta_pdf),
    }


@router.post("/{informe_id}/analizar")
def analizar_informe_ia(
    informe_id: int,
    db: Session = Depends(get_db),
    usuario: models.Organizacion = Depends(obtener_usuario_actual),
):
    """
    Agrega análisis IA a un informe ya generado.
    Llama a Groq y guarda el análisis en BD. El PDF queda sin cambios.
    Devuelve 502 si Groq no responde, para que el frontend informe al usuario.
    """
    informe = db.query(models.Informe).filter(
        models.Informe.id == informe_id,
        models.Informe.organizacion_id == usuario.id,
    ).first()

    if not informe:
        raise HTTPException(status_code=404, detail="Informe no encontrado.")

    tratamientos = db.query(models.Tratamiento).filter(
        models.Tratamiento.organizacion_id == usuario.id
    ).order_by(models.Tratamiento.creado_en.desc()).all()

    contenido_ia = _pedir_analisis_ia(tratamientos)

    if contenido_ia is None:
        raise HTTPException(
            status_code=502,
            detail="No se pudo obtener el análisis de IA. Verifica tu conexión e intenta nuevamente.",
        )

    informe.contenido_ia = contenido_ia
    db.commit()
    db.refresh(informe)

    return {
        "id":          informe.id,
        "generado_en": informe.generado_en,
        "tiene_ia":    True,
        "contenido_ia": contenido_ia,
    }


@router.get("", response_model=list[InformeRespuesta])
def listar_informes(
    db: Session = Depends(get_db),
    usuario: models.Organizacion = Depends(obtener_usuario_actual),
):
    """
    Lista los informes de la organización autenticada.
    Ordenados por fecha descendente. Lista vacía si no hay ninguno.
    Calcula num_tratamientos contando los tratamientos actuales de la org.
    """
    informes = db.query(models.Informe).filter(
        models.Informe.organizacion_id == usuario.id
    ).order_by(models.Informe.generado_en.desc()).all()

    # Contar tratamientos actuales de la organización
    # (se usa el mismo número para todos los informes — es una aproximación útil)
    num_tratamientos = db.query(models.Tratamiento).filter(
        models.Tratamiento.organizacion_id == usuario.id
    ).count()

    return [
        {
            "id":               inf.id,
            "generado_en":      inf.generado_en,   # puede ser None en registros viejos
            "tiene_ia":         inf.contenido_ia is not None,
            "ruta_pdf":         inf.ruta_pdf,
            "num_tratamientos": num_tratamientos,
        }
        for inf in informes
    ]


@router.get("/{informe_id}/analisis")
def obtener_analisis_ia(
    informe_id: int,
    db: Session = Depends(get_db),
    usuario: models.Organizacion = Depends(obtener_usuario_actual),
):
    """Devuelve el contenido_ia de un informe. 404 si no existe o no tiene análisis."""
    informe = db.query(models.Informe).filter(
        models.Informe.id == informe_id,
        models.Informe.organizacion_id == usuario.id,
    ).first()

    if not informe:
        raise HTTPException(status_code=404, detail="Informe no encontrado.")

    if not informe.contenido_ia:
        raise HTTPException(status_code=404, detail="Este informe no tiene análisis de IA.")

    return {"contenido_ia": informe.contenido_ia}


@router.get("/{informe_id}/descargar")
def descargar_informe(
    informe_id: int,
    db: Session = Depends(get_db),
    usuario: models.Organizacion = Depends(obtener_usuario_actual),
):
    """
    Descarga el PDF de un informe ya generado.
    — 404 si el informe no existe o pertenece a otra organización.
    — 404 si el archivo PDF ya no existe en disco.
    — content_disposition_type="attachment" fuerza la descarga en el navegador.
    """
    informe = db.query(models.Informe).filter(
        models.Informe.id == informe_id,
        models.Informe.organizacion_id == usuario.id,
    ).first()

    if not informe:
        raise HTTPException(status_code=404, detail="Informe no encontrado.")

    if not informe.ruta_pdf or not Path(informe.ruta_pdf).exists():
        raise HTTPException(
            status_code=404,
            detail="El archivo PDF no existe en el servidor. Es posible que haya sido eliminado.",
        )

    return FileResponse(
        path=informe.ruta_pdf,
        media_type="application/pdf",
        filename=Path(informe.ruta_pdf).name,
        content_disposition_type="attachment",  # fuerza descarga, no visualización inline
    )

# ── Agregar esto al FINAL de backend/app/routers/informes.py ──

@router.delete("/{informe_id}")
def eliminar_informe(
    informe_id: int,
    db: Session = Depends(get_db),
    usuario: models.Organizacion = Depends(obtener_usuario_actual),
):
    """
    Elimina un informe y su PDF del disco.
    — 404 si no existe o pertenece a otra organización.
    """
    informe = db.query(models.Informe).filter(
        models.Informe.id == informe_id,
        models.Informe.organizacion_id == usuario.id,
    ).first()

    if not informe:
        raise HTTPException(status_code=404, detail="Informe no encontrado.")

    # Eliminar el PDF del disco si existe
    if informe.ruta_pdf:
        ruta = Path(informe.ruta_pdf)
        if ruta.exists():
            ruta.unlink()

    db.delete(informe)
    db.commit()

    return {"mensaje": "Informe eliminado correctamente.", "id": informe_id}