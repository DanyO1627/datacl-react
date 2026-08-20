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

# Categorías de "Datos de identificación" / "Datos de contacto" del checklist
# de Paso2 (categorias_datos_seleccion, R9.3) — un solo campo CSV en BD que
# mezcla ambos grupos; _IDS_IDENTIFICACION / _IDS_CONTACTO se usan para
# separarlos en dos filas del PDF, igual que en el modelo RAT_CEDCA.
_CATEGORIAS_DATOS = {
    "nombre_apellido": "Nombre y apellido", "rut_dni": "RUT / DNI",
    "correo_electronico": "Correo electrónico", "fecha_nacimiento": "Fecha de nacimiento",
    "imagen_facial": "Imagen facial", "firma": "Firma",
    "huella_dactilar": "Huella dactilar", "numero_pasaporte": "Número de pasaporte",
    "telefono": "Teléfono", "direccion": "Dirección",
}
_IDS_IDENTIFICACION = {
    "nombre_apellido", "rut_dni", "correo_electronico", "fecha_nacimiento",
    "imagen_facial", "firma", "huella_dactilar", "numero_pasaporte",
}
_IDS_CONTACTO = {"telefono", "direccion"}

# Categorías de datos sensibles del checklist de Paso2 (categorias_sensibles)
_CATEGORIAS_SENSIBLES = {
    "datos_salud": "Datos de salud", "datos_biometricos": "Datos biométricos",
    "origen_etnico": "Origen étnico", "religion_creencias": "Religión o creencias",
    "orientacion_sexual": "Orientación sexual", "opiniones_politicas": "Opiniones políticas",
    "identidad_genero": "Identidad de género", "habitos_personales": "Hábitos personales",
}

_ORIGEN = {
    "titular": "Del propio titular", "terceros": "De terceros",
    "fuentes_publicas": "De fuentes públicas",
}

_INFORMA_TITULARES = {
    "web": "Aviso en web", "correo": "Correo electrónico",
    "contrato": "Contrato", "mandato": "Mandato",
    "no_informa": "No se informa",
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
    # "otras" normalmente viene con detalle ("otras:texto libre", ver
    # _medidas_legibles), pero si se marca sin escribir nada cae acá tal cual.
    "otras": "Otras",
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


def _val_combo(d, campo_bool, campo_detalle=None):
    """
    Combina un campo booleano (Sí/No) con su detalle libre en una sola fila,
    imitando el estilo de respuesta mixto del RAT modelo (ej. "Sí, Existen
    transferencias a: ..." en vez de dos filas separadas "¿Existen...? Sí" +
    "Detalle"). El Sí/No queda en negrita para que se siga escaneando rápido
    aunque el resto del texto sea largo.

    campo_bool ya viene como True/False/None real (columna Boolean del
    modelo, tratamiento_a_dict no lo transforma) — no hace falta parsear
    strings acá. Devuelve None si el booleano no está seteado (campo aún sin
    completar), igual que _val().
    """
    val = d.get(campo_bool)
    if val is None:
        return None
    etiqueta = "Sí" if val else "No"
    detalle = (d.get(campo_detalle) or "").strip() if campo_detalle else ""
    return f"<b>{etiqueta}</b>, {detalle}" if detalle else f"<b>{etiqueta}.</b>"


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


def _categorias_filtradas(csv_str, ids_permitidos, mapa):
    """
    Filtra un CSV de ids (ej. categorias_datos_seleccion, que mezcla
    identificación y contacto en un solo campo) a un subconjunto permitido y
    lo traduce a texto legible. Devuelve None si no queda nada tras filtrar.
    """
    if not csv_str:
        return None
    seleccionados = [v.strip() for v in csv_str.split(",") if v.strip() in ids_permitidos]
    if not seleccionados:
        return None
    return ", ".join(mapa.get(v, v) for v in seleccionados)


def _filas_descripcion_detallada(bloques, descripcion_legado):
    """
    Una fila de tabla NORMAL por cada bloque de "descripción detallada"
    (R8.4) — antes se concatenaban todos en un solo párrafo gigante ("CEDEI
    — Se tratan... / Datos de contacto — Se tratan... / Datos sensibles —
    Se tratan...") que fácilmente no cabía en una página como celda de Table
    (LayoutError) y, al sacarlo de la tabla como fallback, perdía el
    recuadro y el formato del resto de las filas.

    En vez de eso: cada bloque es su propia fila, del mismo tamaño y con el
    mismo recuadro que cualquier otra fila de la tabla — solo la PRIMERA
    lleva la pregunta ("Descripción detallada" + su aclaración); las
    siguientes quedan sin label, afiliadas visualmente a esa misma pregunta
    (mismas filas contiguas de la tabla, sin repetir el header).

    Devuelve una lista de tuplas (label, sublabel, valor) lista para pasar
    directo a _tabla_seccion. Si el tratamiento no tiene bloques (RATs viejos
    de antes de R8.4), cae al texto libre legado en una sola fila normal.
    """
    label = "Descripción detallada"
    sublabel = "(por categoría de dato: qué se trata, para qué, cómo)"

    if not bloques:
        return [(label, sublabel, descripcion_legado)] if descripcion_legado else []

    filas = []
    for i, b in enumerate(bloques):
        cat       = (b.get("categoria_dato") or "Sin categoría").replace("\n", "<br/>")
        se_tratan = (b.get("se_tratan") or "No especificado").replace("\n", "<br/>")
        para_que  = (b.get("para_que") or "No especificado").replace("\n", "<br/>")
        como      = (b.get("como") or "No especificado").replace("\n", "<br/>")
        valor = f"<b>{cat}</b> — Se tratan: {se_tratan} / ¿Para qué?: {para_que} / ¿Cómo?: {como}"
        primero = i == 0
        filas.append((label if primero else "", sublabel if primero else None, valor))
    return filas


def _base_legal_detalle_texto(items):
    """
    Formatea la lista dinámica de base legal adicional (R9.6) como texto único
    para una celda, una declaración por línea. Devuelve None si no hay items
    (RATs sin este dato — anteriores a R9.6, o simplemente sin usarlo).
    """
    if not items:
        return None
    return "<br/>".join(f"• {item.replace(chr(10), '<br/>')}" for item in items if item)


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
        "categorias_titulares": d.categorias_titulares if d else None,
        "universo_titulares": d.universo_titulares if d else None,
        "origen_datos": d.origen_datos if d else None,
    }

    campos_ext = [
        "proceso_asociado", "imagen_proceso",
        "descripcion_detallada", "subarea_responsable", "procesos_relacionados",
        "finalidades_secundarias", "informa_titulares", "documento_respaldo_permiso",
        "datos_navegacion", "datos_navegacion_detalle", "incluye_nna", "nna_detalle",
        "destinatarios_internos", "destinatarios_nacionales", "destinatarios_internacionales",
        "terceros_son_encargados", "contratos_proteccion_datos", "contratos_proteccion_datos_detalle",
        "datos_transferidos_detalle", "metodo_transferencia",
        "sistemas_origen", "sistemas_destino", "sistemas_tratamiento",
        "tipos_tratamiento_sistema", "base_datos_nombre", "proveedor_tecnologico",
        "criterio_plazo", "metodo_eliminacion", "metodo_eliminacion_otro", "documenta_destruccion", "excepciones_plazo",
        "minimizacion_justificacion", "mecanismos_exactitud", "evaluacion_periodica", "evaluacion_periodica_detalle",
        "cumplimiento_demostrable", "incidentes_historicos", "cambios_futuros",
        "requiere_dpia", "dpia_realizada", "dpia_detalle",
        # R9.3 — Paso 2 datos ampliados
        "datos_sensibles_descripcion", "datos_academicos_laborales",
        "datos_financieros_patrimoniales", "origen_sistemico_datos", "otros_datos",
        "origen_datos_detalle",
        # R9.4 — Paso 3 transferencias
        "base_legal_transferencia_internacional", "metodo_transferencia_detalle",
        # R9.5 — Paso 4 Principios 1 y 2
        "asegura_transparencia_detalle", "informa_titulares_si_no",
        "finalidad_todos_necesarios", "finalidad_misma", "usa_solo_fines_declarados",
        "minimizacion_si_no",
        # Ledger 2026-08-19: estos 3 se llenan en Paso2/3 pero nunca se
        # traían al PDF — quedaban invisibles en el informe oficial aunque
        # la organización los hubiera completado.
        "categorias_datos_seleccion", "categorias_sensibles", "pais_destino",
    ]
    for campo in campos_ext:
        resultado[campo] = getattr(ext, campo, None) if ext else None

    # Bloques repetibles de "descripción detallada" (R8.4) — ya vienen
    # ordenados por `orden` gracias al order_by de la relación en models.py.
    resultado["datos_tratados"] = [
        {
            "categoria_dato": b.categoria_dato,
            "se_tratan": b.se_tratan,
            "para_que": b.para_que,
            "como": b.como,
        }
        for b in (getattr(t, "datos_tratados", None) or [])
    ]

    # Lista dinámica de base legal adicional (R9.6) — mismo patrón que
    # datos_tratados: relación aparte, ordenada por `orden`.
    resultado["base_legal_detalle"] = [
        b.descripcion
        for b in (getattr(t, "base_legal_detalle", None) or [])
        if b.descripcion
    ]

    return resultado


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


def _imagen_proceso_valor(ruta_str):
    """
    Imagen del proceso (Paso 1, opcional) — nunca se dibujaba en el PDF, solo
    se guardaba en disco. Corresponde al diagrama de aprobación/flujo que
    trae el modelo RAT_CEDCA junto a "Líder/Coordinador/Dueño del proceso"
    (primera fila del documento) — se muestra igual acá, como primera fila
    de la sección "Identificación", con su propio recuadro (misma fila de
    tabla que el resto). Se escala manteniendo proporción, achicada respecto
    al tamaño original para que no se coma la página.
    Devuelve el flowable Image listo para usar como valor de fila, o None si
    no hay imagen configurada o el archivo no existe.
    """
    if not ruta_str:
        return None
    ruta = Path(ruta_str)
    if not ruta.exists():
        return None

    try:
        ancho_px, alto_px = ImageReader(str(ruta)).getSize()
    except Exception:
        return None
    if not ancho_px or not alto_px:
        return None

    max_ancho = 6 * cm
    max_alto = 6 * cm
    factor = min(max_ancho / ancho_px, max_alto / alto_px, 1.0)
    return Image(str(ruta), width=ancho_px * factor, height=alto_px * factor)


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
    medidas = _medidas_legibles(d.get("medidas_seguridad"))
    datos_identificacion = _categorias_filtradas(d.get("categorias_datos_seleccion"), _IDS_IDENTIFICACION, _CATEGORIAS_DATOS)
    datos_contacto = _categorias_filtradas(d.get("categorias_datos_seleccion"), _IDS_CONTACTO, _CATEGORIAS_DATOS)
    tipos_sensibles = _val(d, "categorias_sensibles", _CATEGORIAS_SENSIBLES)

    plazo = d.get("plazo_conservacion")
    if plazo == "otro" and d.get("plazo_otro"):
        plazo_texto = d["plazo_otro"]
    elif plazo:
        plazo_texto = _PLAZO.get(plazo, plazo)
    else:
        plazo_texto = None

    # mismo patrón que plazo_texto: si eligió "Otro" se muestra el texto
    # libre que escribió en vez de la palabra genérica "Otro".
    metodo_elim = d.get("metodo_eliminacion")
    if metodo_elim == "otro" and d.get("metodo_eliminacion_otro"):
        metodo_elim_texto = d["metodo_eliminacion_otro"]
    elif metodo_elim:
        metodo_elim_texto = _METODO_ELIMINACION.get(metodo_elim, metodo_elim)
    else:
        metodo_elim_texto = None

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
    # Cuadro combinado nombre + proceso asociado (R8.6, formato RAT CEDCA):
    # nombre en negrita arriba, proceso asociado como párrafo debajo, misma celda.
    proceso_texto = (d.get("proceso_asociado") or "No especificado").replace("\n", "<br/>")
    nombre_proceso_valor = f'<font color="#052659"><b>{nombre}</b></font><br/><br/>{proceso_texto}'

    # Bloques de "descripción detallada" por categoría de dato (R8.4): una
    # fila normal de tabla por bloque (ver _filas_descripcion_detallada). Si
    # el tratamiento es de antes de R8.4 y no tiene bloques, cae al texto
    # libre viejo (descripcion_detallada) en una sola fila.
    filas_descripcion = _filas_descripcion_detallada(d.get("datos_tratados"), _val(d, "descripcion_detallada"))

    elementos.extend(_tabla_seccion(
        "Identificación de actividades de tratamiento",
        [
            ("Imagen del proceso", None, _imagen_proceso_valor(d.get("imagen_proceso"))),
            ("Responsable del tratamiento", "(persona o cargo a cargo del proceso)", resp_texto),
            ("Nombre del tratamiento y proceso asociado", "(Denominación clara y entendible)", nombre_proceso_valor),
            *filas_descripcion,
            ("Área responsable", None, _val(d, "subarea_responsable")),
            ("Relación con otros procesos internos", None, _val(d, "procesos_relacionados")),
        ],
        estilos_dict, ancho, color_header,
    ))

    # ── Sección 2: Categoría de datos y titulares ──────────────────
    # Orden calcado del bloque "Tipo de categoría de Datos Personales
    # Tratados" del modelo RAT_CEDCA (titulares → identificación → contacto →
    # académicos/laborales → navegación → financieros → sensibles → NNA →
    # origen del dato → otros → origen sistémico). Reordenado 2026-08-19 y se
    # agregan "Datos de identificación", "Datos de contacto" y "Categorías de
    # datos sensibles" — el checklist que se marca en Paso2 nunca se traía
    # al PDF, quedaba invisible en el informe aunque estuviera completo.
    elementos.extend(_tabla_seccion(
        "Tipo de categoría de datos personales tratados",
        [
            ("Categorías de titulares", None, cats_tit),
            ("Universo de titulares", "(alcance: todos los clientes, solo empleados, etc.)", _val(d, "universo_titulares")),
            ("Datos de identificación", "(nombre/RUT/mail/imagen facial/firma/huella/pasaporte)", datos_identificacion),
            ("Datos de contacto", "(teléfono / dirección)", datos_contacto),
            ("Datos académicos / laborales", None, _val(d, "datos_academicos_laborales")),
            ("Datos de navegación", "(IP, cookies, ID dispositivo, geolocalización)", _val(d, "datos_navegacion")),
            ("Detalle datos de navegación", None, _val(d, "datos_navegacion_detalle")),
            ("Datos financieros y patrimoniales", None, _val(d, "datos_financieros_patrimoniales")),
            ("¿Incluye datos sensibles?", "(Salud / Biometría / Religión / Identidad de género)", _val(d, "datos_sensibles")),
            ("Categorías de datos sensibles", None, tipos_sensibles),
            ("Descripción de los datos sensibles", None, _val(d, "datos_sensibles_descripcion")),
            ("Datos de NNA", "(Niños, niñas y adolescentes — menores de 18 años)", _val(d, "incluye_nna")),
            ("Detalle NNA", "(qué datos de menores se tratan y con qué justificación)", _val(d, "nna_detalle")),
            ("Origen de los datos", "(Titular / Terceros / Fuente pública / Generación interna)", _val(d, "origen_datos", _ORIGEN)),
            ("Detalle del origen de los datos", None, _val(d, "origen_datos_detalle")),
            ("Otros datos personales", None, _val(d, "otros_datos")),
            ("Origen sistémico de los datos", "(sistemas o bases de datos de origen)", _val(d, "origen_sistemico_datos")),
        ],
        estilos_dict, ancho, color_header,
    ))

    # ── Sección 3: Transferencias ─────────────────────────────────
    elementos.extend(_tabla_seccion(
        "Transferencias y comunicaciones a terceros",
        [
            ("Destinatarios", "(quién recibe los datos)", _val(d, "destinatarios")),
            ("Destinatarios internos", "(áreas que acceden o utilizan los datos)", _val(d, "destinatarios_internos")),
            ("Destinatarios nacionales", "(terceros nacionales que reciben datos)", _val(d, "destinatarios_nacionales")),
            ("Destinatarios internacionales", "(tercero, país y base legal)", _val(d, "destinatarios_internacionales")),
            ("Base legal de la transferencia internacional", None, _val(d, "base_legal_transferencia_internacional")),
            ("¿Los datos salen al extranjero?", "(país o región de destino)", _val_combo(d, "sale_extranjero", "pais_destino")),
            ("¿Los terceros actúan como encargados?", None, _val(d, "terceros_son_encargados")),
            ("¿Existen contratos de protección de datos?", "(con terceros que reciben datos)", _val_combo(d, "contratos_proteccion_datos", "contratos_proteccion_datos_detalle")),
            ("Datos transferidos (detalle)", None, _val(d, "datos_transferidos_detalle")),
            ("Método de transferencia", "(digital / verbal / físico)", _val(d, "metodo_transferencia")),
            ("Detalle del método de transferencia", None, _val(d, "metodo_transferencia_detalle")),
        ],
        estilos_dict, ancho, color_header,
    ))

    # ── Sección 4: Finalidad y base legal ──────────────────────────
    # Orden calcado del modelo RAT_CEDCA: esta sección va DESPUÉS de
    # Transferencias, no justo después de Identificación (reordenado
    # 2026-08-19 — antes esta sección entera salía en 2º lugar). Dentro de
    # la sección, el orden interno ya calca al modelo: Principio 1 → Principio
    # 2 → Finalidad del Tratamiento, con "Finalidades secundarias" justo
    # después de "Finalidad", no al final.
    base_legal_detalle_texto = _base_legal_detalle_texto(d.get("base_legal_detalle"))
    # _val_combo lee el detalle crudo del dict — para "informa_titulares" hay
    # que traducirlo ANTES (viene como códigos "web,mandato", no texto legible).
    d["informa_titulares"] = _val(d, "informa_titulares", _INFORMA_TITULARES)
    elementos.extend(_tabla_seccion(
        "Licitud, finalidad y transparencia",
        [
            ("Base legal", "(Consentimiento / Obligación legal / Interés legítimo / Contrato)", _val(d, "base_legal", _BASE_LEGAL)),
            ("Base legal adicional", "(otras normas, consentimientos o documentos)", base_legal_detalle_texto),
            ("Documento de respaldo", "(contrato, consentimiento, mandato)", _val(d, "documento_respaldo_permiso")),
            ("¿Asegura licitud y transparencia?", "(cómo se garantiza que el tratamiento es lícito y transparente)", _val(d, "asegura_transparencia_detalle")),
            ("Finalidad del tratamiento", "(descripción específica, no genérica)", _val(d, "finalidad")),
            ("Finalidades secundarias", None, _val(d, "finalidades_secundarias")),
            ("¿Todos los datos tienen finalidad y son necesarios?", None, _val(d, "finalidad_todos_necesarios")),
            ("¿Todos los datos tienen la misma finalidad?", None, _val(d, "finalidad_misma")),
            ("¿Se informa a los titulares?", "(sobre la finalidad y uso de sus datos)", _val_combo(d, "informa_titulares_si_no", "informa_titulares")),
            ("¿Se usan solo para fines declarados?", None, _val(d, "usa_solo_fines_declarados")),
            ("¿Se evalúa periódicamente la pertinencia de los datos?", "(frecuencia de revisión)", _val(d, "evaluacion_periodica", _PERIODO_EVALUACION)),
            ("Detalle de la evaluación periódica", None, _val(d, "evaluacion_periodica_detalle")),
        ],
        estilos_dict, ancho, color_header,
    ))

    # ── Sección 5: Conservación y principios ──────────────────────
    # Orden calcado del modelo: Principio 6 (conservación) → Principio 3
    # (minimización) → Principio 4 (exactitud) → Principio 5 (medidas de
    # seguridad) → cierre "Otros" (cumplimiento/incidentes/cambios).
    # "Evaluación periódica" se movió a la sección de Finalidad (duplicaba
    # la pregunta del modelo sobre pertinencia de los datos, más arriba).
    elementos.extend(_tabla_seccion(
        "Conservación, seguridad y principios Ley 21.719",
        [
            ("Plazo de conservación", "(¿por cuánto tiempo se almacenan los datos?)", plazo_texto),
            ("Criterio del plazo", "(legal, contractual u operacional)", _val(d, "criterio_plazo", _CRITERIO_PLAZO)),
            ("Método de eliminación", "(eliminación digital / destrucción física / anonimización)", metodo_elim_texto),
            ("¿Se documenta la destrucción?", None, _val(d, "documenta_destruccion")),
            ("Excepciones al plazo", "(archivo histórico / obligación legal)", _val(d, "excepciones_plazo")),
            ("¿Se aplica minimización de datos?", "(¿por qué estos datos y no más?)", _val_combo(d, "minimizacion_si_no", "minimizacion_justificacion")),
            ("Mecanismos de exactitud", "(¿cómo se mantienen actualizados?)", _val(d, "mecanismos_exactitud")),
            ("Medidas de seguridad", "(cifrado, control acceso, backups, auditoría, etc.)", medidas),
            ("¿Decisiones automatizadas?", "(algoritmos o IA que deciden sobre personas)", _val(d, "decisiones_automatizadas")),
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
    # Orden calcado del modelo: DPIA (M1) antes que Nivel de riesgo (M2) —
    # reordenado 2026-08-19, antes salía Nivel de riesgo primero.
    # requiere_dpia + dpia_realizada se fusionan en una fila (mismo patrón
    # que el resto de la sección), pero literal — sin redactar frases nuevas
    # como "pendiente de realizar" que el usuario no escribió. dpia_detalle
    # queda aparte, tal como lo trae el modelo.
    filas_riesgo = []
    if d.get("requiere_dpia"):
        dpia_realizada_txt = "Sí" if d.get("dpia_realizada") else "No"
        filas_riesgo.extend([
            ("¿Requiere / realizó DPIA?", "(Evaluación de Impacto en Protección de Datos)",
             f"<b>Sí</b>, requerida. ¿Realizada? {dpia_realizada_txt}."),
            ("Detalle DPIA", "(fecha, responsable, conclusiones, medidas)", _val(d, "dpia_detalle")),
        ])
    filas_riesgo.extend([
        ("Nivel de riesgo", "(Bajo / Medio / Alto)", _val(d, "nivel_riesgo", _RIESGO)),
        ("Probabilidad", None, prob),
        ("Impacto", None, imp),
        ("Fecha de evaluación", None, fecha_texto),
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
