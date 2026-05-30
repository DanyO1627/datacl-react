from io import BytesIO
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable,
)


# ── Mapas de valores internos a texto legible ──────────────────────────────

_BASE_LEGAL = {
    "consentimiento":   "Consentimiento\n(Art. 12 letra a)",
    "contrato":         "Ejecución de\ncontrato\n(Art. 12 letra b)",
    "obligacion_legal": "Obligación\nlegal\n(Art. 12 letra c)",
    "interes_vital":    "Interés vital\n(Art. 12 letra d)",
    "interes_publico":  "Interés\npúblico\n(Art. 12 letra e)",
    "interes_legitimo": "Interés\nlegítimo\n(Art. 12 letra f)",
}

_PLAZO = {
    "1_anio":           "1 año",
    "2_anios":          "2 años",
    "5_anios":          "5 años",
    "10_anios":         "10 años",
    "indefinido":       "Indefinido",
    "duracion_relacion": "Mientras dure la relación",
    "otro":             "Otro",
}


_ORIGEN = {
    "titular":          "Del propio\ntitular",
    "terceros":         "De terceros",
    "fuentes_publicas": "Fuentes\npúblicas",
}

_TITULARES = {
    "empleados":   "Empleados y funcionarios",
    "clientes":    "Clientes y consumidores",
    "proveedores": "Proveedores y contratistas",
    "usuarios":    "Usuarios de plataformas digitales",
    "ciudadanos":  "Ciudadanos",
    "estudiantes": "Estudiantes",
    "pacientes":   "Pacientes",
}


# ── Helpers internos ───────────────────────────────────────────────────────

def _p(texto, estilo) -> Paragraph:
    """Paragraph con wrap automático. Muestra '—' si el texto está vacío."""
    return Paragraph(str(texto) if texto else "—", estilo)


def _cat_datos(t) -> str | None:
    """Nombres de campos detectados (máx. 4, luego +N)."""
    if not t.campos:
        return None
    nombres = ", ".join(c.nombre_columna for c in t.campos[:4])
    if len(t.campos) > 4:
        nombres += f" (+{len(t.campos) - 4})"
    return nombres


def _fila_rat(t, s_celda) -> list:
    """Construye la fila de la tabla RAT para un tratamiento."""
    d = t.detalle  # DetalleRat — puede ser None en tratamientos anteriores
    plazo  = _PLAZO.get(t.plazo_conservacion or "", t.plazo_conservacion)
    origen = _ORIGEN.get(d.origen_datos or "", d.origen_datos) if d else None

    # "Nombre\n(Responsable)" o "Nombre\n(Encargado)"
    if d and d.responsable_tratamiento:
        rol        = "Responsable" if d.es_responsable else "Encargado"
        resp_texto = f"{d.responsable_tratamiento}\n({rol})"
    else:
        resp_texto = None

    # Categorías legibles + universo de titulares (texto libre)
    cats_raw  = d.categorias_titulares if d and d.categorias_titulares else ""
    cats      = ", ".join(
        _TITULARES.get(c.strip(), c.strip())
        for c in cats_raw.split(",") if c.strip()
    )
    universo_texto = d.universo_titulares if d and d.universo_titulares else None
    universo  = "\n".join(filter(None, [cats, universo_texto])) or None

    return [
        _p(t.nombre,                                           s_celda),
        _p(resp_texto,                                         s_celda),
        _p(_cat_datos(t),                                      s_celda),
        _p(universo,                                           s_celda),
        _p(t.finalidad,                                        s_celda),
        _p(_BASE_LEGAL.get(t.base_legal or "", t.base_legal), s_celda),
        _p(t.destinatarios,                                    s_celda),
        _p(plazo,                                              s_celda),
        _p(origen,                                             s_celda),
    ]


def _pie(canvas, doc) -> None:
    """Pie de página con metodología y número de página."""
    canvas.saveState()
    canvas.setFont("Helvetica", 7)
    canvas.setFillColor(colors.HexColor("#888888"))
    canvas.drawString(
        doc.leftMargin,
        0.75 * cm,
        "Evaluado según metodología AEPD adaptada a Ley 21.719 de Protección de Datos Personales (Chile)",
    )
    canvas.drawRightString(
        doc.pagesize[0] - doc.rightMargin,
        0.75 * cm,
        f"Página {canvas.getPageNumber()}",
    )
    canvas.restoreState()


# ── Función principal ──────────────────────────────────────────────────────

def construir_pdf(org, tratamientos: list) -> bytes:
    """
    Genera el PDF RAT en formato tabla oficial y devuelve los bytes.
    No escribe nada en disco — el llamador decide qué hacer con los bytes.

    Estructura:
      Página 1:   Portada con org, RUT, fecha y metodología.
      Página 2+:  Tabla RAT con 9 columnas, una fila por tratamiento.
    """
    buffer = BytesIO()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(A4),
        rightMargin=1.5 * cm,
        leftMargin=1.5 * cm,
        topMargin=1.5 * cm,
        bottomMargin=1.8 * cm,
        title=f"RAT — {org.nombre}",
        author=org.nombre,
        subject="Registro de Actividades de Tratamiento — Ley 21.719 (Chile)",
        creator="DataCL",
    )

    base = getSampleStyleSheet()

    s_celda = ParagraphStyle(
        "celda", parent=base["Normal"], fontSize=7.5, leading=10,
    )
    s_cabecera = ParagraphStyle(
        "cabecera", parent=base["Normal"],
        fontSize=7.5, leading=10, textColor=colors.white, fontName="Helvetica-Bold",
    )
    s_titulo = ParagraphStyle(
        "titulo_portada", parent=base["Title"],
        fontSize=26, textColor=colors.HexColor("#021024"), spaceAfter=6,
    )
    s_subtitulo = ParagraphStyle(
        "subtitulo_portada", parent=base["Normal"],
        fontSize=14, textColor=colors.HexColor("#5483B3"), spaceAfter=20,
    )
    s_dato = ParagraphStyle(
        "dato_portada", parent=base["Normal"],
        fontSize=11, textColor=colors.HexColor("#052659"), spaceAfter=6,
    )
    s_metodologia = ParagraphStyle(
        "metodologia", parent=base["Normal"],
        fontSize=9, textColor=colors.HexColor("#888888"),
    )

    elementos = []

    # ── PÁGINA 1: PORTADA ─────────────────────────────────────────
    elementos.append(Spacer(1, 2.5 * cm))
    elementos.append(Paragraph("DataCL", s_titulo))
    elementos.append(Paragraph("Registro de Actividades de Tratamiento", s_subtitulo))
    elementos.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#021024")))
    elementos.append(Spacer(1, 0.8 * cm))
    elementos.append(Paragraph(f"<b>Organización:</b> {org.nombre}", s_dato))
    elementos.append(Paragraph(f"<b>RUT:</b> {org.rut}", s_dato))
    elementos.append(Paragraph(f"<b>Correo:</b> {org.correo}", s_dato))
    elementos.append(Paragraph(
        f"<b>Fecha de generación:</b> {datetime.now().strftime('%d/%m/%Y %H:%M')}",
        s_dato,
    ))
    elementos.append(Spacer(1, 0.6 * cm))
    elementos.append(Paragraph(
        f"<b>Total de tratamientos incluidos:</b> {len(tratamientos)}",
        s_dato,
    ))
    elementos.append(Spacer(1, 1.5 * cm))
    elementos.append(Paragraph(
        "Elaborado bajo la metodología AEPD adaptada a la Ley 21.719 "
        "de Protección de Datos Personales de Chile.",
        s_metodologia,
    ))
    elementos.append(PageBreak())

    # ── PÁGINAS 2+: TABLA RAT ─────────────────────────────────────
    # landscape A4 (~29.7cm) - márgenes (1.5cm × 2) = 26.7cm útiles
    anchos = [
        3.6 * cm,  # Actividad de tratamiento
        2.8 * cm,  # Responsable o encargado
        2.8 * cm,  # Categoría de datos
        2.2 * cm,  # Universo de titulares
        4.2 * cm,  # Finalidad
        3.0 * cm,  # Base de legitimidad
        3.2 * cm,  # Destinatarios previstos
        2.2 * cm,  # Período de conservación
        2.7 * cm,  # Fuente de los datos
    ]  # total = 26.7cm

    encabezados = [
        _p("Actividad de\ntratamiento", s_cabecera),
        _p("Responsable o\nencargado",  s_cabecera),
        _p("Categoría\nde datos",       s_cabecera),
        _p("Universo de\ntitulares",    s_cabecera),
        _p("Finalidad",                 s_cabecera),
        _p("Base de\nlegitimidad",      s_cabecera),
        _p("Destinatarios previstos\n(incl. transf. internacional)", s_cabecera),
        _p("Período de\nconservación",  s_cabecera),
        _p("Fuente de\nlos datos",      s_cabecera),
    ]

    filas = [encabezados] + [_fila_rat(t, s_celda) for t in tratamientos]

    estilo = TableStyle([
        ("BACKGROUND",    (0, 0), (-1, 0),  colors.HexColor("#021024")),
        ("TEXTCOLOR",     (0, 0), (-1, 0),  colors.white),
        ("GRID",          (0, 0), (-1, -1), 0.4, colors.HexColor("#b8cfe0")),
        ("VALIGN",        (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING",    (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING",   (0, 0), (-1, -1), 4),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 4),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1),
         [colors.white, colors.HexColor("#f0f6ff")]),
    ])

    tabla = Table(filas, colWidths=anchos, repeatRows=1)
    tabla.setStyle(estilo)
    elementos.append(tabla)

    doc.build(elementos, onFirstPage=_pie, onLaterPages=_pie)
    return buffer.getvalue()
