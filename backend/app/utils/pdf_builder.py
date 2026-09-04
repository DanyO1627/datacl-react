# pdf_builder.py — Genera el PDF del RAT con estilo visual del RAT real de La Liga
#
# Estructura por tratamiento:
#   - Header de sección con fondo de color + texto blanco
#   - Tabla 2 columnas con bordes: etiqueta bold + sublabel gris | contenido
#   - Secciones vacías se ocultan automáticamente
#
# Personalización por organización:
#   - color_institucional: color hex para headers (default: #7030A0 morado)
#   - logo_ruta: ruta al logo de la org para la portada

from io import BytesIO
from datetime import datetime
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether, Image, Flowable,
)
from reportlab.lib.utils import ImageReader

from app.utils.informe_data import (
    _val, _ESTADO, _RIESGO, ImagenRuta, tratamiento_a_dict, armar_secciones,
)


# ── Colores por defecto ───────────────────────────────────────────────────
COLOR_HEADER_DEFAULT = "#7030A0"
COLOR_BLANCO  = colors.white
COLOR_NEGRO   = colors.black
COLOR_GRIS_BG = colors.HexColor("#F2F2F2")
COLOR_BORDE   = colors.HexColor("#BFBFBF")


# ── Helpers ───────────────────────────────────────────────────────────────

def _estilos():
    """Crea todos los estilos de párrafo."""
    return {
        "titulo_doc": ParagraphStyle(
            "titulo_doc", fontName="Helvetica-Bold", fontSize=14,
            leading=18, alignment=TA_CENTER, spaceAfter=6,
            textColor=colors.HexColor("#021024"),
        ),
        "subtitulo_doc": ParagraphStyle(
            "subtitulo_doc", fontName="Helvetica", fontSize=11,
            leading=14, alignment=TA_CENTER, spaceAfter=12,
            textColor=colors.HexColor("#555555"),
        ),
        "dato_portada": ParagraphStyle(
            "dato_portada", fontName="Helvetica", fontSize=10,
            leading=14, textColor=colors.HexColor("#052659"), spaceAfter=4,
        ),
        "header_seccion": ParagraphStyle(
            "header_seccion", fontName="Helvetica-Bold", fontSize=10,
            leading=13, textColor=COLOR_BLANCO, alignment=TA_LEFT,
        ),
        "label_bold": ParagraphStyle(
            "label_bold", fontName="Helvetica-Bold", fontSize=8.5,
            leading=11, textColor=COLOR_NEGRO,
        ),
        "label_sub": ParagraphStyle(
            "label_sub", fontName="Helvetica", fontSize=7,
            leading=9, textColor=colors.HexColor("#595959"),
        ),
        "contenido": ParagraphStyle(
            "contenido", fontName="Helvetica", fontSize=8.5,
            leading=11, textColor=COLOR_NEGRO,
        ),
        "advertencia": ParagraphStyle(
            "advertencia", fontName="Helvetica", fontSize=9,
            leading=13, textColor=colors.HexColor("#92400e"), spaceAfter=4,
        ),
        "metodologia": ParagraphStyle(
            "metodologia", fontName="Helvetica", fontSize=8,
            leading=11, textColor=colors.HexColor("#888888"),
        ),
        "trat_titulo": ParagraphStyle(
            "trat_titulo", fontName="Helvetica-Bold", fontSize=9,
            leading=12, textColor=COLOR_BLANCO, alignment=TA_CENTER,
        ),
    }


# ── Constructor de tabla-sección (estilo La Liga) ─────────────────────────

# Tope por FILA de tabla (no por campo). reportlab no puede partir una sola
# celda entre páginas — si una celda mide más que una página en blanco, lanza
# LayoutError y toda la generación del PDF se cae con un 500 (bug real:
# "Destinatarios" con ~2000 caracteres). Probamos primero un Paragraph con
# borde propio como fallback (sí puede partirse entre páginas), pero
# reportlab no vuelve a dibujar el borde en el fragmento de continuación —
# se ve "cortado" al cambiar de página. La solución real: trocear el texto
# largo en varias filas NORMALES de tabla (mismo patrón que ya se usa para
# "Descripción detallada" con sus bloques) — cada trozo es una fila de
# tamaño común, con el mismo recuadro que cualquier otra, sin arriesgar el
# LayoutError. Solo la primera fila del trozo lleva el label; las siguientes
# quedan afiliadas a la misma pregunta sin repetirlo.
_UMBRAL_TROZO = 700


def _trocear_texto_largo(texto):
    """
    Parte un texto largo en trozos que quepan cómodos como fila de tabla.
    Respeta párrafos (doble salto de línea) si existen; si un párrafo sigue
    siendo enorme, cae a un corte duro por caracteres como último recurso.
    Devuelve una lista de al menos un trozo (nunca vacía si texto no es None).
    """
    texto = str(texto).strip()
    if len(texto) <= _UMBRAL_TROZO:
        return [texto]

    partes = [p for p in texto.split("\n\n") if p.strip()]
    if len(partes) <= 1:
        partes = [p for p in texto.split("\n") if p.strip()]

    trozos = []
    actual = ""
    for p in partes:
        candidato = f"{actual}\n\n{p}" if actual else p
        if len(candidato) > _UMBRAL_TROZO and actual:
            trozos.append(actual)
            actual = p
        else:
            actual = candidato
    if actual:
        trozos.append(actual)

    resultado = []
    for t in trozos:
        if len(t) <= _UMBRAL_TROZO:
            resultado.append(t)
        else:
            resultado.extend(t[i:i + _UMBRAL_TROZO] for i in range(0, len(t), _UMBRAL_TROZO))
    return resultado or [texto]


def _estilo_tabla_lote(con_header, color_header):
    """Estilo compartido para el lote de filas cortas — con_header=True solo
    en el primer lote de la sección (trae la barra de color fusionada)."""
    base = [
        ("BOX",      (0, 0), (-1, -1), 0.5, COLOR_BORDE),
        ("INNERGRID",(0, 0), (-1, -1), 0.5, COLOR_BORDE),
        ("VALIGN",   (0, 0), (-1, -1), "TOP"),
    ]
    fila_datos_desde = 1 if con_header else 0
    base += [
        ("TOPPADDING",    (0, fila_datos_desde), (-1, -1), 4),
        ("BOTTOMPADDING", (0, fila_datos_desde), (-1, -1), 4),
        ("LEFTPADDING",   (0, fila_datos_desde), (-1, -1), 5),
        ("RIGHTPADDING",  (0, fila_datos_desde), (-1, -1), 5),
    ]
    if con_header:
        base += [
            ("BACKGROUND",   (0, 0), (1, 0), color_header),
            ("TEXTCOLOR",    (0, 0), (1, 0), COLOR_BLANCO),
            ("SPAN",         (0, 0), (1, 0)),
            ("TOPPADDING",   (0, 0), (1, 0), 5),
            ("BOTTOMPADDING",(0, 0), (1, 0), 5),
            ("LEFTPADDING",  (0, 0), (1, 0), 6),
        ]
    return base


def _tabla_seccion(titulo, filas, estilos_dict, ancho_total, color_header, col_izq_ratio=0.38):
    """
    Crea la sección: barra de color + filas etiqueta|valor, todas dentro de
    UNA tabla con bordes (misma tabla, se parte entre páginas de forma
    natural si hace falta — eso reportlab ya lo hace bien). Los valores de
    texto muy largos se trocean primero en varias filas normales (ver
    _trocear_texto_largo) para que ninguna celda individual arriesgue
    LayoutError; solo la primera fila de cada campo lleva el label, las
    siguientes quedan afiliadas sin repetirlo. Un valor que ya sea un
    flowable de reportlab (ej. una Image) se usa directo, sin trocear.

    filas: lista de tuplas (label, sublabel, valor) o None si no hay valor.
    Solo incluye filas que tengan valor.
    """
    col_izq = ancho_total * col_izq_ratio
    col_der = ancho_total * (1 - col_izq_ratio)

    filas_finales = []
    for fila in filas:
        if fila is None:
            continue
        label, sublabel, valor = fila
        if valor is None:
            continue
        if isinstance(valor, Flowable):
            filas_finales.append((label, sublabel, valor))
            continue
        trozos = _trocear_texto_largo(valor)
        for i, trozo in enumerate(trozos):
            primero = i == 0
            filas_finales.append((label if primero else "", sublabel if primero else None, trozo))

    if not filas_finales:
        return []

    data = [[Paragraph(titulo, estilos_dict["header_seccion"]), ""]]
    for label, sublabel, valor in filas_finales:
        celda_izq = [Paragraph(label, estilos_dict["label_bold"])] if label else []
        if sublabel:
            celda_izq.append(Paragraph(sublabel, estilos_dict["label_sub"]))
        if isinstance(valor, Flowable):
            celda_der = [valor]
        else:
            celda_der = [Paragraph(str(valor).replace("\n", "<br/>"), estilos_dict["contenido"])]
        data.append([celda_izq, celda_der])

    tabla = Table(data, colWidths=[col_izq, col_der])
    tabla.setStyle(TableStyle(_estilo_tabla_lote(True, color_header)))

    # Secciones chicas se mantienen juntas en una página; grandes fluyen
    # natural. "Chica" exige además un total de texto acotado (no solo pocas
    # filas) — 6 filas justo en el límite del troceo (700 c/u) igual podrían
    # no caber juntas en KeepTogether y reproducir el LayoutError original.
    texto_total = sum(len(str(v)) for _, _, v in filas_finales if not isinstance(v, Flowable))
    if len(filas_finales) <= 6 and texto_total <= 2500:
        return [KeepTogether(tabla), Spacer(1, 0.35 * cm)]
    return [tabla, Spacer(1, 0.35 * cm)]


def _imagen_flowable(imagen_ruta: ImagenRuta):
    """
    Convierte el marcador ImagenRuta que entrega informe_data.armar_secciones()
    en el Image flowable de ReportLab — mismo diagrama de aprobación/flujo del
    modelo RAT_CEDCA (Paso 1, opcional), como primera fila de la sección
    "Identificación", con su propio recuadro (misma fila de tabla que el
    resto). Se escala manteniendo proporción, achicada respecto al tamaño
    original para que no se coma la página.
    Devuelve el flowable Image, o None si el archivo no se puede leer como
    imagen (formato no soportado, corrupto, etc.).
    """
    try:
        ancho_px, alto_px = ImageReader(imagen_ruta.ruta).getSize()
    except Exception:
        return None
    if not ancho_px or not alto_px:
        return None

    max_ancho = 6 * cm
    max_alto = 6 * cm
    factor = min(max_ancho / ancho_px, max_alto / alto_px, 1.0)
    return Image(imagen_ruta.ruta, width=ancho_px * factor, height=alto_px * factor)


# ── Ficha de un tratamiento (todas las secciones) ────────────────────────

def _ficha_tratamiento(d, idx, total, estilos_dict, ancho, color_header):
    """Genera todos los elementos PDF de un tratamiento."""
    elementos = []

    nombre = d.get("nombre") or "Sin nombre"
    estado = _val(d, "estado", _ESTADO) or "—"
    riesgo = _val(d, "nivel_riesgo", _RIESGO) or "—"

    es_pendiente = d.get("estado") == "PENDIENTE"
    badge = f"Estado: {estado}  ·  Riesgo: {riesgo}"
    if es_pendiente:
        badge += "  ·  ⚠ Campos pendientes"

    # ── Header del tratamiento (barra con color) ──────────────────
    header_data = [[Paragraph(
        f"Tratamiento {idx}/{total} — {nombre}",
        estilos_dict["trat_titulo"],
    ), ""]]
    header_tabla = Table(header_data, colWidths=[ancho])
    header_tabla.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), color_header),
        ("TEXTCOLOR",  (0, 0), (-1, -1), COLOR_BLANCO),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING",(0,0),(-1,-1), 6),
        ("LEFTPADDING",(0, 0), (-1, -1), 8),
        ("SPAN",       (0, 0), (1, 0)),
    ]))
    elementos.append(header_tabla)

    # Badge de estado/riesgo
    badge_data = [[Paragraph(badge, estilos_dict["contenido"])]]
    badge_tabla = Table(badge_data, colWidths=[ancho])
    badge_tabla.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), COLOR_GRIS_BG),
        ("BOX",        (0, 0), (-1, -1), 0.5, COLOR_BORDE),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING",(0,0),(-1,-1), 3),
        ("LEFTPADDING",(0, 0), (-1, -1), 6),
    ]))
    elementos.append(badge_tabla)
    elementos.append(Spacer(1, 0.3 * cm))

    # Qué dice cada fila (texto, traducciones, combinación booleano+detalle)
    # se calcula en informe_data.armar_secciones() — acá solo queda decidir
    # cómo se dibuja cada sección (Table/Paragraph de ReportLab).
    for seccion in armar_secciones(d):
        filas = [
            (label, sub, _imagen_flowable(valor) if isinstance(valor, ImagenRuta) else valor)
            for label, sub, valor in seccion["filas"]
        ]
        elementos.extend(_tabla_seccion(
            seccion["titulo"], filas, estilos_dict, ancho, color_header,
            col_izq_ratio=seccion["col_izq_ratio"],
        ))

    return elementos


# ── NumberedCanvas — permite "Página X de Y" (requiere 2 pasadas) ─────────

from reportlab.pdfgen.canvas import Canvas

class _NumberedCanvas(Canvas):
    """Canvas que registra el total de páginas para mostrar 'Página X de Y'."""
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_number(num_pages)
            Canvas.showPage(self)
        Canvas.save(self)

    def draw_page_number(self, total):
        page_w, _ = A4
        margen = 1.5 * cm
        self.saveState()
        self.setFont("Helvetica", 7)
        self.setFillColor(colors.HexColor("#888888"))
        self.drawRightString(
            page_w - margen, 0.8 * cm,
            f"Página {self._pageNumber} de {total}",
        )
        self.restoreState()


# ── Helpers de header/footer para canvas ──────────────────────────────────

def _draw_header_compact(canvas, color_header, logo_path, org_nombre):
    """Header compacto: barra de color + logo chico + nombre org + DataCL."""
    page_w, page_h = A4
    margen = 1.5 * cm
    header_h = 0.9 * cm
    header_y = page_h - 1.4 * cm
    content_w = page_w - 2 * margen

    # Barra de color
    canvas.setFillColor(color_header)
    canvas.rect(margen, header_y, content_w, header_h, fill=1, stroke=0)

    # Logo (~1.2cm, tamaño La Liga)
    if logo_path:
        try:
            logo_size = 0.65 * cm
            canvas.drawImage(
                logo_path,
                margen + 0.15 * cm,
                header_y + (header_h - logo_size) / 2,
                width=logo_size, height=logo_size,
                preserveAspectRatio=True, mask="auto",
            )
        except Exception:
            pass

    # Nombre org — con font dinámico para nombres largos
    canvas.setFillColor(COLOR_BLANCO)
    text_x = margen + (1.0 * cm if logo_path else 0.3 * cm)
    texto = f"{org_nombre} — Registro de Actividades de Tratamiento"
    espacio_disponible = content_w - (text_x - margen) - 4.5 * cm

    font_size = 8
    while font_size >= 6:
        ancho_texto = canvas.stringWidth(texto, "Helvetica-Bold", font_size)
        if ancho_texto <= espacio_disponible:
            break
        font_size -= 0.5

    canvas.setFont("Helvetica-Bold", font_size)
    canvas.drawString(text_x, header_y + 0.3 * cm, texto)

    # DataCL a la derecha
    canvas.setFont("Helvetica", 7)
    canvas.drawRightString(
        page_w - margen - 0.3 * cm,
        header_y + 0.3 * cm,
        "DataCL · Ley 21.719",
    )


def _draw_header_first(canvas, color_header, logo_path, org_nombre, org_rut, total_trat, fecha):
    """Header primera página: más alto, con logo grande + info de la org + fecha."""
    page_w, page_h = A4
    margen = 1.5 * cm
    content_w = page_w - 2 * margen

    # Barra de color (más alta que la compacta)
    header_h = 1.8 * cm
    header_y = page_h - 2.3 * cm
    canvas.setFillColor(color_header)
    canvas.rect(margen, header_y, content_w, header_h, fill=1, stroke=0)

    # Logo grande (~1.4cm)
    text_start_x = margen + 0.3 * cm
    if logo_path:
        try:
            logo_size = 1.3 * cm
            canvas.drawImage(
                logo_path,
                margen + 0.2 * cm,
                header_y + (header_h - logo_size) / 2,
                width=logo_size, height=logo_size,
                preserveAspectRatio=True, mask="auto",
            )
            text_start_x = margen + 1.7 * cm
        except Exception:
            pass

    canvas.setFillColor(COLOR_BLANCO)

    # Nombre org (bold, más grande)
    canvas.setFont("Helvetica-Bold", 10)
    y_cursor = header_y + header_h - 0.45 * cm
    canvas.drawString(text_start_x, y_cursor, org_nombre)

    # RUT + total tratamientos
    canvas.setFont("Helvetica", 7.5)
    y_cursor -= 0.35 * cm
    canvas.drawString(text_start_x, y_cursor, f"RUT: {org_rut}  ·  {total_trat} tratamiento(s) incluidos")

    # Fecha
    y_cursor -= 0.35 * cm
    canvas.drawString(text_start_x, y_cursor, f"Generado: {fecha}")

    # DataCL a la derecha (centrado verticalmente)
    canvas.setFont("Helvetica-Bold", 8)
    canvas.drawRightString(
        page_w - margen - 0.3 * cm,
        header_y + header_h / 2 + 0.15 * cm,
        "DataCL",
    )
    canvas.setFont("Helvetica", 7)
    canvas.drawRightString(
        page_w - margen - 0.3 * cm,
        header_y + header_h / 2 - 0.2 * cm,
        "Ley 21.719",
    )


def _draw_footer(canvas, color_header, logo_path):
    """Footer estilo La Liga: logo org + texto centrado + página (dibujada por NumberedCanvas)."""
    page_w = A4[0]
    margen = 1.5 * cm
    footer_y = 0.7 * cm
    content_w = page_w - 2 * margen

    # Línea separadora con color institucional
    canvas.setStrokeColor(color_header)
    canvas.setLineWidth(1)
    canvas.line(margen, footer_y + 0.45 * cm, page_w - margen, footer_y + 0.45 * cm)

    # Logo chico a la izquierda del footer
    if logo_path:
        try:
            logo_size = 0.35 * cm
            canvas.drawImage(
                logo_path,
                margen,
                footer_y - 0.02 * cm,
                width=logo_size, height=logo_size,
                preserveAspectRatio=True, mask="auto",
            )
        except Exception:
            pass

    # Texto centrado
    canvas.setFont("Helvetica", 7)
    canvas.setFillColor(colors.HexColor("#888888"))
    canvas.drawCentredString(
        page_w / 2, footer_y,
        "Metodología AEPD adaptada a Ley 21.719 — Protección de Datos Personales (Chile)",
    )


# ── Función principal ─────────────────────────────────────────────────────

def construir_pdf(org, tratamientos: list) -> bytes:
    """Genera el PDF RAT estilo La Liga y devuelve los bytes. Sin portada."""
    buffer = BytesIO()

    # Márgenes: más arriba en pág 1 (header grande), normal en las demás
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=1.5 * cm,
        leftMargin=1.5 * cm,
        topMargin=2.8 * cm,
        bottomMargin=1.8 * cm,
        title=f"RAT — {org.nombre}",
        author=org.nombre,
        subject="Registro de Actividades de Tratamiento — Ley 21.719 (Chile)",
        creator="DataCL",
    )

    ancho = A4[0] - 3 * cm
    color_hex = getattr(org, "color_institucional", None) or COLOR_HEADER_DEFAULT
    color_header = colors.HexColor(color_hex)

    logo_ruta = getattr(org, "logo_ruta", None)
    logo_path = logo_ruta if (logo_ruta and Path(logo_ruta).exists()) else None

    dicts = []
    for t in tratamientos:
        dicts.append(t if isinstance(t, dict) else tratamiento_a_dict(t))

    estilos_dict = _estilos()
    elementos = []

    fecha_gen = datetime.now().strftime("%d/%m/%Y %H:%M")
    org_nombre = org.nombre
    org_rut = getattr(org, "rut", None)  # blindaje: siempre debería venir un Organizacion real (R10.3)

    # Aviso de pendientes (va al inicio, antes del primer tratamiento)
    pendientes = [d for d in dicts if d.get("estado") == "PENDIENTE"]
    if pendientes:
        nombres = ", ".join(f'"{d.get("nombre", "?")}"' for d in pendientes[:3])
        if len(pendientes) > 3:
            nombres += f" y {len(pendientes) - 3} más"
        elementos.append(Paragraph(
            f"<b>⚠ {len(pendientes)} tratamiento(s) incompleto(s):</b> {nombres}. "
            "Estos tratamientos tienen campos clave sin completar.",
            estilos_dict["advertencia"],
        ))
        elementos.append(Spacer(1, 0.3 * cm))

    # Fichas de tratamiento (sin portada, directo al contenido)
    total = len(dicts)
    for idx, d in enumerate(dicts, 1):
        if idx > 1:
            elementos.append(PageBreak())
        elementos.extend(_ficha_tratamiento(d, idx, total, estilos_dict, ancho, color_header))

    # Callbacks para header/footer
    def on_first_page(canvas, doc_obj):
        _draw_header_first(canvas, color_header, logo_path, org_nombre, org_rut, total, fecha_gen)
        _draw_footer(canvas, color_header, logo_path)

    def on_later_pages(canvas, doc_obj):
        _draw_header_compact(canvas, color_header, logo_path, org_nombre)
        _draw_footer(canvas, color_header, logo_path)

    doc.build(elementos, onFirstPage=on_first_page, onLaterPages=on_later_pages, canvasmaker=_NumberedCanvas)
    return buffer.getvalue()
