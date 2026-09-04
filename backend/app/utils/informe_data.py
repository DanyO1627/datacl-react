# informe_data.py — Preparación de datos del informe (R11.0)
#
# Todo lo que decide QUÉ DICE cada fila del informe (texto, traducciones de
# código a legible, combinación de booleano+detalle) vive acá, sin depender
# de ReportLab en ninguna línea. Cada builder (pdf_builder.py hoy,
# docx_builder.py en R11.1) decide CÓMO SE DIBUJA esa misma información.
#
# Movido tal cual desde pdf_builder.py (sin reescribir lógica) + la función
# nueva armar_secciones(), que extrae el cálculo de filas que antes vivía
# intercalado con las llamadas a _tabla_seccion() dentro de _ficha_tratamiento.

from pathlib import Path


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


# ── Helpers de texto ──────────────────────────────────────────────────────

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


class ImagenRuta:
    """
    Marca una fila de armar_secciones() cuyo valor es una ruta de archivo de
    imagen (no texto) — cada builder decide cómo insertarla (Image de
    ReportLab, InlineImage de python-docx, etc.). No depende de ninguna
    librería de render.
    """
    __slots__ = ("ruta",)

    def __init__(self, ruta):
        self.ruta = ruta


def _imagen_proceso_valor(ruta_str):
    """
    Imagen del proceso (Paso 1, opcional) — corresponde al diagrama de
    aprobación/flujo que trae el modelo RAT_CEDCA junto a "Líder/Coordinador/
    Dueño del proceso" (primera fila del documento).

    Solo valida que la ruta exista en disco y la envuelve en ImagenRuta para
    que el builder la reconozca sin ambigüedad. Devuelve None si no hay
    imagen configurada o el archivo no existe — la fila simplemente no se
    muestra. El tamaño/escalado concreto (que depende de la librería de
    render) lo decide cada builder.
    """
    if not ruta_str:
        return None
    ruta = Path(ruta_str)
    if not ruta.exists():
        return None
    return ImagenRuta(str(ruta))


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


# ── Secciones del informe (R11.0) ─────────────────────────────────────────

def armar_secciones(d: dict) -> list[dict]:
    """
    Calcula las 7 secciones del informe de un tratamiento — mismo contenido,
    mismo orden y mismos títulos que _ficha_tratamiento producía antes del
    refactor (orden CEDCA del 2026-08-19), pero sin ningún objeto de render.

    Devuelve una lista de dicts: {"titulo": str, "filas": [(label, sublabel,
    valor), ...], "col_izq_ratio": float}. Cada builder (PDF/Word) recorre
    esta lista y decide cómo dibujar cada sección.
    """
    nombre = d.get("nombre") or "Sin nombre"

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

    secciones = []

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

    secciones.append({
        "titulo": "Identificación de actividades de tratamiento",
        "filas": [
            ("Imagen del proceso", None, _imagen_proceso_valor(d.get("imagen_proceso"))),
            ("Responsable del tratamiento", "(persona o cargo a cargo del proceso)", resp_texto),
            ("Nombre del tratamiento y proceso asociado", "(Denominación clara y entendible)", nombre_proceso_valor),
            *filas_descripcion,
            ("Área responsable", None, _val(d, "subarea_responsable")),
            ("Relación con otros procesos internos", None, _val(d, "procesos_relacionados")),
        ],
        "col_izq_ratio": 0.38,
    })

    # ── Sección 2: Categoría de datos y titulares ──────────────────
    # Orden calcado del bloque "Tipo de categoría de Datos Personales
    # Tratados" del modelo RAT_CEDCA (titulares → identificación → contacto →
    # académicos/laborales → navegación → financieros → sensibles → NNA →
    # origen del dato → otros → origen sistémico). Reordenado 2026-08-19 y se
    # agregan "Datos de identificación", "Datos de contacto" y "Categorías de
    # datos sensibles" — el checklist que se marca en Paso2 nunca se traía
    # al PDF, quedaba invisible en el informe aunque estuviera completo.
    secciones.append({
        "titulo": "Tipo de categoría de datos personales tratados",
        "filas": [
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
        "col_izq_ratio": 0.38,
    })

    # ── Sección 3: Transferencias ─────────────────────────────────
    secciones.append({
        "titulo": "Transferencias y comunicaciones a terceros",
        "filas": [
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
        "col_izq_ratio": 0.38,
    })

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
    secciones.append({
        "titulo": "Licitud, finalidad y transparencia",
        "filas": [
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
        "col_izq_ratio": 0.38,
    })

    # ── Sección 5: Conservación y principios ──────────────────────
    # Orden calcado del modelo: Principio 6 (conservación) → Principio 3
    # (minimización) → Principio 4 (exactitud) → Principio 5 (medidas de
    # seguridad) → cierre "Otros" (cumplimiento/incidentes/cambios).
    # "Evaluación periódica" se movió a la sección de Finalidad (duplicaba
    # la pregunta del modelo sobre pertinencia de los datos, más arriba).
    secciones.append({
        "titulo": "Conservación, seguridad y principios Ley 21.719",
        "filas": [
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
        "col_izq_ratio": 0.42,
    })

    # ── Sección 6: Sistemas ───────────────────────────────────────
    secciones.append({
        "titulo": "Sistemas o aplicaciones, soportes y ubicación",
        "filas": [
            ("Sistemas de origen", "(donde nacen o se capturan los datos)", _val(d, "sistemas_origen")),
            ("Sistemas de destino", "(donde los datos se replican o consultan)", _val(d, "sistemas_destino")),
            ("Sistemas de tratamiento", "(donde se procesa o transforma el dato)", _val(d, "sistemas_tratamiento")),
            ("Tipo de tratamiento por sistema", "(captura, consulta, modificación, etc.)", _val(d, "tipos_tratamiento_sistema")),
            ("Base de datos", "(repositorio concreto)", _val(d, "base_datos_nombre")),
            ("Proveedor tecnológico", "(si aplica)", _val(d, "proveedor_tecnologico")),
        ],
        "col_izq_ratio": 0.42,
    })

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
    secciones.append({
        "titulo": "Evaluaciones de impacto y riesgos",
        "filas": filas_riesgo,
        "col_izq_ratio": 0.42,
    })

    return secciones
