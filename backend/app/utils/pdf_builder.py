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
    PageBreak, KeepTogether,
)


# ── Colores por defecto ───────────────────────────────────────────────────
COLOR_HEADER_DEFAULT = "#7030A0"
COLOR_BLANCO  = colors.white
COLOR_NEGRO   = colors.black
COLOR_GRIS_BG = colors.HexColor("#F2F2F2")
COLOR_BORDE   = colors.HexColor("#BFBFBF")

# ── Mapas de valores internos → texto legible ─────────────────────────────

_BASE_LEGAL = {
    "consentimiento":           "Consentimiento del titular (Art. 12)",
    "datos_economicos":         "Obligaciones económicas o financieras (Art. 13 letra a)",
    "obligacion_legal":         "Cumplimiento de obligación legal (Art. 13 letra b)",
    "contrato":                 "Ejecución de contrato (Art. 13 letra c)",
    "interes_legitimo":         "Interés legítimo (Art. 13 letra d)",
    "defensa_derechos":         "Defensa de derechos ante tribunales (Art. 13 letra e)",
    "consentimiento_sensibles": "Consentimiento datos sensibles (Art. 16 inc. 1)",
    "datos_biometricos":        "Datos biométricos (Art. 16 ter)",
}

_PLAZO = {
    "1_anio": "1 año", "2_anios": "2 años", "5_anios": "5 años",
    "10_anios": "10 años", "indefinido": "Indefinido",
    "duracion_relacion": "Mientras dure la relación contractual", "otro": "Otro",
}

_TITULARES = {
    "empleados": "Empleados y funcionarios", "clientes": "Clientes y consumidores",
    "proveedores": "Proveedores y contratistas", "usuarios": "Usuarios de plataformas digitales",
    "ciudadanos": "Ciudadanos", "estudiantes": "Estudiantes", "pacientes": "Pacientes",
}

_ORIGEN = {
    "titular": "Del propio titular", "terceros": "De terceros",
    "fuentes_publicas": "De fuentes públicas",
}

_CRITERIO_PLAZO = {
    "legal": "Legal (normativa aplicable)", "contractual": "Contractual (duración del contrato)",
    "operacional": "Operacional (necesidad del proceso)",
}

_METODO_ELIMINACION = {
    "digital": "Eliminación segura digital", "fisica": "Destrucción física",
    "anonimizacion": "Anonimización", "otro": "Otro",
}

_PERIODO_EVALUACION = {
    "anual": "Anual", "bienal": "Bienal (cada 2 años)",
    "ante_cambios": "Ante cambios importantes", "sin_definir": "Sin definir",
}

_RIESGO = {"BAJO": "Bajo", "MEDIO": "Medio", "ALTO": "Alto"}
_PROBABILIDAD = {"BAJA": "Baja", "MEDIA": "Media", "ALTA": "Alta"}
_ESTADO = {"PENDIENTE": "Pendiente", "COMPLETO": "Completo", "BORRADOR": "Borrador"}

_MEDIDAS = {
    "cifrado": "Cifrado de datos", "acceso_rol": "Control de acceso por rol",
    "backups": "Backups periódicos", "contraseñas": "Política de contraseñas",
    "auditoria": "Auditoría de accesos",
}


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


def _val(d, campo, mapa=None):
    """Saca un valor del dict, traduce con mapa si existe. Soporta multi-valor (coma)."""
    val = d.get(campo)
    if val is None or val == "":
        return None
    if mapa and isinstance(val, str):
        if "," in val:
            return ", ".join(mapa.get(v.strip(), v.strip()) for v in val.split(",") if v.strip())
        return mapa.get(val, val)
    if isinstance(val, bool):
        return "Sí" if val else "No"
    return str(val)


def _medidas_legibles(medidas_str):
    if not medidas_str:
        return None
    idx = medidas_str.find("otras:")
    if idx != -1:
        antes = medidas_str[:idx].rstrip(",")
        libre = medidas_str[idx + len("otras:"):]
        items = [_MEDIDAS.get(m.strip(), m.strip()) for m in antes.split(",") if m.strip()] if antes else []
        items.append(f"Otras: {libre}")
        return ", ".join(items)
    return ", ".join(_MEDIDAS.get(m.strip(), m.strip()) for m in medidas_str.split(",") if m.strip())


def _titulares_legibles(cats_str):
    if not cats_str:
        return None
    return ", ".join(_TITULARES.get(c.strip(), c.strip()) for c in cats_str.split(",") if c.strip())


# ── Conversión ORM → dict plano ──────────────────────────────────────────

def tratamiento_a_dict(t) -> dict:
    """Convierte un objeto ORM Tratamiento a dict plano con todos los campos."""
    d = t.detalle
    ext = t.detalle_extendido

    resultado = {
        "nombre": t.nombre, "finalidad": t.finalidad, "base_legal": t.base_legal,
        "datos_sensibles": t.datos_sensibles, "destinatarios": t.destinatarios,
        "plazo_conservacion": t.plazo_conservacion,
        "plazo_otro": getattr(t, "plazo_otro", None),
        "medidas_seguridad": t.medidas_seguridad,
        "sale_extranjero": t.sale_extranjero,
        "decisiones_automatizadas": t.decisiones_automatizadas,
        "estado": t.estado, "nivel_riesgo": t.nivel_riesgo,
        "probabilidad": getattr(t, "probabilidad", None),
        "impacto": getattr(t, "impacto", None),
        "fecha_evaluacion": getattr(t, "fecha_evaluacion", None),
        "responsable_tratamiento": d.responsable_tratamiento if d else None,
        "es_responsable": d.es_responsable if d else None,
        "departamento": d.departamento if d else None,
        "categorias_titulares": d.categorias_titulares if d else None,
        "universo_titulares": d.universo_titulares if d else None,
        "origen_datos": d.origen_datos if d else None,
        "categoria_datos": d.categoria_datos if d else None,
        "campos_detectados_texto": ", ".join(
            c.nombre_columna for c in (t.campos or [])[:6]
        ) + (f" (+{len(t.campos) - 6})" if t.campos and len(t.campos) > 6 else "") if t.campos else None,
    }

    campos_ext = [
        "descripcion_detallada", "subarea_responsable", "procesos_relacionados",
        "finalidades_secundarias", "informa_titulares", "documento_respaldo_permiso",
        "datos_navegacion", "incluye_nna", "nna_detalle",
        "destinatarios_internos", "destinatarios_nacionales", "destinatarios_internacionales",
        "terceros_son_encargados", "contratos_proteccion_datos",
        "datos_transferidos_detalle", "metodo_transferencia",
        "sistemas_origen", "sistemas_destino", "sistemas_tratamiento",
        "tipos_tratamiento_sistema", "base_datos_nombre", "proveedor_tecnologico",
        "criterio_plazo", "metodo_eliminacion", "documenta_destruccion", "excepciones_plazo",
        "minimizacion_justificacion", "mecanismos_exactitud", "evaluacion_periodica",
        "cumplimiento_demostrable", "incidentes_historicos", "cambios_futuros",
        "requiere_dpia", "dpia_realizada", "dpia_detalle",
    ]
    for campo in campos_ext:
        resultado[campo] = getattr(ext, campo, None) if ext else None

    return resultado


# ── Constructor de tabla-sección (estilo La Liga) ─────────────────────────

def _tabla_seccion(titulo, filas, estilos_dict, ancho_total, color_header, col_izq_ratio=0.38):
    """
    Crea una tabla con header de color + filas etiqueta|valor.

    filas: lista de tuplas (label, sublabel, clave_dict, mapa) o None si no hay valor.
    Solo incluye filas que tengan valor.
    """
    col_izq = ancho_total * col_izq_ratio
    col_der = ancho_total * (1 - col_izq_ratio)

    # Header de sección (fila 0, fusionada)
    data = [[Paragraph(titulo, estilos_dict["header_seccion"]), ""]]

    for fila in filas:
        if fila is None:
            continue
        label, sublabel, valor = fila

        if valor is None:
            continue

        # Celda izquierda: label bold + sublabel gris
        celda_izq = [Paragraph(label, estilos_dict["label_bold"])]
        if sublabel:
            celda_izq.append(Paragraph(sublabel, estilos_dict["label_sub"]))

        # Celda derecha: valor con saltos de línea
        valor_html = str(valor).replace("\n", "<br/>")
        celda_der = [Paragraph(valor_html, estilos_dict["contenido"])]

        data.append([celda_izq, celda_der])

    # Si solo quedó el header (sin filas con datos), no mostrar la sección
    if len(data) <= 1:
        return []

    tabla = Table(data, colWidths=[col_izq, col_der])
    tabla.setStyle(TableStyle([
        # Header con color
        ("BACKGROUND",   (0, 0), (1, 0), color_header),
        ("TEXTCOLOR",    (0, 0), (1, 0), COLOR_BLANCO),
        ("SPAN",         (0, 0), (1, 0)),
        ("TOPPADDING",   (0, 0), (1, 0), 5),
        ("BOTTOMPADDING",(0, 0), (1, 0), 5),
        ("LEFTPADDING",  (0, 0), (1, 0), 6),
        # Bordes
        ("BOX",      (0, 0), (-1, -1), 0.5, COLOR_BORDE),
        ("INNERGRID",(0, 0), (-1, -1), 0.5, COLOR_BORDE),
        # Padding celdas
        ("TOPPADDING",    (0, 1), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 1), (-1, -1), 4),
        ("LEFTPADDING",   (0, 1), (-1, -1), 5),
        ("RIGHTPADDING",  (0, 1), (-1, -1), 5),
        ("VALIGN",        (0, 0), (-1, -1), "TOP"),
    ]))

    # Secciones chicas se mantienen juntas; grandes fluyen natural
    if len(data) <= 6:
        return [KeepTogether(tabla), Spacer(1, 0.35 * cm)]
    return [tabla, Spacer(1, 0.35 * cm)]


# ── Ficha de un tratamiento (todas las secciones) ────────────────────────

def _ficha_tratamiento(d, idx, total, estilos_dict, ancho, color_header):
    """Genera todos los elementos PDF de un tratamiento."""
    elementos = []

    nombre = d.get("nombre") or "Sin nombre"
    estado = _val(d, "estado", _ESTADO) or "—"
    riesgo = _val(d, "nivel_riesgo", _RIESGO) or "—"

    # Responsable con rol
    resp = d.get("responsable_tratamiento")
    resp_texto = None
    if resp:
        rol = "Responsable" if d.get("es_responsable") else "Encargado"
        resp_texto = f"{resp} ({rol})"

    # Preparar campos derivados
    cats_tit = _titulares_legibles(d.get("categorias_titulares"))
    cat_datos = d.get("categoria_datos") or d.get("campos_detectados_texto")
    medidas = _medidas_legibles(d.get("medidas_seguridad"))

    plazo = d.get("plazo_conservacion")
    if plazo == "otro" and d.get("plazo_otro"):
        plazo_texto = d["plazo_otro"]
    elif plazo:
        plazo_texto = _PLAZO.get(plazo, plazo)
    else:
        plazo_texto = None

    prob = _val(d, "probabilidad", _PROBABILIDAD)
    imp = _val(d, "impacto", _RIESGO)

    fecha_eval = d.get("fecha_evaluacion")
    fecha_texto = None
    if fecha_eval:
        try:
            fecha_texto = fecha_eval.strftime("%d/%m/%Y") if hasattr(fecha_eval, "strftime") else str(fecha_eval)[:10]
        except Exception:
            fecha_texto = str(fecha_eval)

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

    # ── Sección 1: Identificación ─────────────────────────────────
    elementos.extend(_tabla_seccion(
        f"Identificación de actividades de tratamiento — {nombre}",
        [
            ("Responsable del tratamiento", "(persona o cargo a cargo del proceso)", resp_texto),
            ("Departamento / Área", "(unidad dueña del tratamiento)", _val(d, "departamento")),
            ("Subárea responsable", None, _val(d, "subarea_responsable")),
            ("Descripción detallada", "(¿Qué datos se tratan?; ¿Para qué?; ¿Cómo?)", _val(d, "descripcion_detallada")),
            ("Procesos relacionados", "(relación con otros procesos internos)", _val(d, "procesos_relacionados")),
        ],
        estilos_dict, ancho, color_header,
    ))

    # ── Sección 2: Finalidad y base legal ─────────────────────────
    elementos.extend(_tabla_seccion(
        "Licitud, finalidad y transparencia",
        [
            ("Finalidad del tratamiento", "(descripción específica, no genérica)", _val(d, "finalidad")),
            ("Finalidades secundarias", None, _val(d, "finalidades_secundarias")),
            ("Base legal", "(Consentimiento / Obligación legal / Interés legítimo / Contrato)", _val(d, "base_legal", _BASE_LEGAL)),
            ("¿Se informa a los titulares?", "(sobre la finalidad y uso de sus datos)", _val(d, "informa_titulares")),
            ("Documento de respaldo", "(contrato, consentimiento, mandato)", _val(d, "documento_respaldo_permiso")),
        ],
        estilos_dict, ancho, color_header,
    ))

    # ── Sección 3: Categoría de datos y titulares ─────────────────
    elementos.extend(_tabla_seccion(
        "Tipo de categoría de datos personales tratados",
        [
            ("Categoría de datos personales", "(Pacientes / Clientes / Empleados / Otros)", cat_datos),
            ("Categorías de titulares", None, cats_tit),
            ("Universo de titulares", "(alcance: todos los clientes, solo empleados, etc.)", _val(d, "universo_titulares")),
            ("Origen de los datos", "(Titular / Terceros / Fuente pública / Generación interna)", _val(d, "origen_datos", _ORIGEN)),
            ("¿Incluye datos sensibles?", "(Salud / Biometría / Religión / Identidad de género)", _val(d, "datos_sensibles")),
            ("Datos de navegación", "(IP, cookies, ID dispositivo, geolocalización)", _val(d, "datos_navegacion")),
            ("Datos de NNA", "(Niños, niñas y adolescentes — menores de 18 años)", _val(d, "incluye_nna")),
            ("Detalle NNA", "(qué datos de menores se tratan y con qué justificación)", _val(d, "nna_detalle")),
        ],
        estilos_dict, ancho, color_header,
    ))

    # ── Sección 4: Transferencias ─────────────────────────────────
    elementos.extend(_tabla_seccion(
        "Transferencias y comunicaciones a terceros",
        [
            ("Destinatarios", "(quién recibe los datos)", _val(d, "destinatarios")),
            ("Destinatarios internos", "(áreas que acceden o utilizan los datos)", _val(d, "destinatarios_internos")),
            ("Destinatarios nacionales", "(terceros nacionales que reciben datos)", _val(d, "destinatarios_nacionales")),
            ("Destinatarios internacionales", "(tercero, país y base legal)", _val(d, "destinatarios_internacionales")),
            ("¿Los datos salen al extranjero?", None, _val(d, "sale_extranjero")),
            ("¿Los terceros actúan como encargados?", None, _val(d, "terceros_son_encargados")),
            ("¿Existen contratos de protección de datos?", "(con terceros que reciben datos)", _val(d, "contratos_proteccion_datos")),
            ("Datos transferidos (detalle)", None, _val(d, "datos_transferidos_detalle")),
            ("Método de transferencia", "(digital / verbal / físico)", _val(d, "metodo_transferencia")),
        ],
        estilos_dict, ancho, color_header,
    ))

    # ── Sección 5: Conservación y principios ──────────────────────
    elementos.extend(_tabla_seccion(
        "Conservación, seguridad y principios Ley 21.719",
        [
            ("Plazo de conservación", "(¿por cuánto tiempo se almacenan los datos?)", plazo_texto),
            ("Criterio del plazo", "(legal, contractual u operacional)", _val(d, "criterio_plazo", _CRITERIO_PLAZO)),
            ("Método de eliminación", "(eliminación digital / destrucción física / anonimización)", _val(d, "metodo_eliminacion", _METODO_ELIMINACION)),
            ("¿Se documenta la destrucción?", None, _val(d, "documenta_destruccion")),
            ("Excepciones al plazo", "(archivo histórico / obligación legal)", _val(d, "excepciones_plazo")),
            ("Medidas de seguridad", "(cifrado, control acceso, backups, auditoría, etc.)", medidas),
            ("¿Decisiones automatizadas?", "(algoritmos o IA que deciden sobre personas)", _val(d, "decisiones_automatizadas")),
            ("Justificación de minimización", "(¿por qué estos datos y no más?)", _val(d, "minimizacion_justificacion")),
            ("Mecanismos de exactitud", "(¿cómo se mantienen actualizados?)", _val(d, "mecanismos_exactitud")),
            ("Evaluación periódica", None, _val(d, "evaluacion_periodica", _PERIODO_EVALUACION)),
            ("Cumplimiento demostrable", "(registros, auditorías, capacitaciones)", _val(d, "cumplimiento_demostrable")),
            ("Incidentes históricos", None, _val(d, "incidentes_historicos")),
            ("Cambios futuros previstos", None, _val(d, "cambios_futuros")),
        ],
        estilos_dict, ancho, color_header, col_izq_ratio=0.42,
    ))

    # ── Sección 6: Sistemas ───────────────────────────────────────
    elementos.extend(_tabla_seccion(
        "Sistemas o aplicaciones, soportes y ubicación",
        [
            ("Sistemas de origen", "(donde nacen o se capturan los datos)", _val(d, "sistemas_origen")),
            ("Sistemas de destino", "(donde los datos se replican o consultan)", _val(d, "sistemas_destino")),
            ("Sistemas de tratamiento", "(donde se procesa o transforma el dato)", _val(d, "sistemas_tratamiento")),
            ("Tipo de tratamiento por sistema", "(captura, consulta, modificación, etc.)", _val(d, "tipos_tratamiento_sistema")),
            ("Base de datos", "(repositorio concreto)", _val(d, "base_datos_nombre")),
            ("Proveedor tecnológico", "(si aplica)", _val(d, "proveedor_tecnologico")),
        ],
        estilos_dict, ancho, color_header, col_izq_ratio=0.42,
    ))

    # ── Sección 7: Evaluación de riesgo ───────────────────────────
    filas_riesgo = [
        ("Nivel de riesgo", "(Bajo / Medio / Alto)", _val(d, "nivel_riesgo", _RIESGO)),
        ("Probabilidad", None, prob),
        ("Impacto", None, imp),
        ("Fecha de evaluación", None, fecha_texto),
    ]
    if d.get("requiere_dpia"):
        filas_riesgo.extend([
            ("¿Requiere DPIA?", "(Evaluación de Impacto en Protección de Datos)", _val(d, "requiere_dpia")),
            ("¿DPIA realizada?", None, _val(d, "dpia_realizada")),
            ("Detalle DPIA", "(fecha, responsable, conclusiones, medidas)", _val(d, "dpia_detalle")),
        ])
    elementos.extend(_tabla_seccion(
        "Evaluaciones de impacto y riesgos",
        filas_riesgo,
        estilos_dict, ancho, color_header, col_izq_ratio=0.42,
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
        super().showPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_number(num_pages)
            super().showPage()
        super().save()

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
    org_rut = org.rut

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
