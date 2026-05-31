import io
import unicodedata
import pandas as pd

# =============================================================================
# DICCIONARIOS DE DETECCIÓN
# Basado en la Ley 21.719 de Protección de Datos Personales (Chile)
#
# REGLA: las palabras largas se comparan por TOKEN EXACTO (word boundary).
#        Las abreviaciones van en listas separadas y también se comparan
#        por token exacto — así "medidas" no coincide con "med" ni "medica".
#
# FALSOS POSITIVOS CONOCIDOS QUE SE EVITAN:
#   - "medidas" no coincide con "medica" / "medical"
#   - "medios"  no coincide con "medico"
#   - "tratamiento" fue removido de sensibles (contexto jurídico ≠ médico)
#   - "finalidad" no se clasifica como personal
# =============================================================================

# ── Datos PERSONALES — palabras completas (español) ──────────────────────────
PERSONALES_ES = [
    "nombre",
    "apellido",
    "apellidos",
    "cedula",
    "pasaporte",
    "correo",
    "email",
    "mail",
    "telefono",
    "celular",
    "movil",
    "direccion",
    "domicilio",
    "calle",
    "ciudad",
    "comuna",
    "region",
    "nacimiento",
    "edad",
    "sexo",
    "genero",
    "nacionalidad",
    "banco",
    "cuenta",
    "bancaria",
    "afp",
    "prevision",
    "previsional",
    "remuneracion",
    "sueldo",
    "salario",
    "liquido",
    "contrato",
    "laboral",
    "ingreso",
    "cargo",
    "puesto",
    "departamento",
    "area",
    "postal",
    "pais",
    "inspeccion",  # Fecha_Ultima_Inspeccion_Gobierno
    "supervisor",  # Supervisor_Turno_DNI (DNI ya lo detecta)
    "operario",  # Operario_Responsable_Nombre
    "tarjeta",      # número de tarjeta bancaria (dato financiero, Art. 3 n°6)
    "pago",         # método/información de pago
    "cliente",      # identificador de persona natural (Art. 2 n°4)
    "usuario",      # identificador digital de persona (Art. 2 n°4)
    "contrasena",   # credencial de autenticación personal
    "clave",        # credencial de acceso
    "patente",      # matrícula vehículo → identifica propietario indirectamente
    "placa",        # ídem (vehículos de carga/delivery)
]

# ── Datos PERSONALES — abreviaciones de BDs reales (español) ─────────────────
# SAP: KUNNR (cliente), PERNR (empleado), BUKRS (empresa)
# Oracle: EMPNO, DEPTNO
# Sistemas chilenos comunes
ABREV_PERSONALES_ES = [
    "rut",
    "dni",
    "tel",
    "fono",
    "cel",
    "dir",
    "dom",
    "fec",
    "nac",  # fec_nac, fecha_nac
    "rem",
    "sue",  # remuneracion, sueldo
    "emp",
    "empl",  # empleado
    "usr",
    "user",
    "pin",   # Personal Identification Number / credencial de acceso
    "cvv",   # Card Verification Value — dato de seguridad tarjeta bancaria
    "cvc",   # Card Verification Code — ídem
    "pwd",   # password abreviado
]

# ── Datos PERSONALES — palabras completas (inglés) ───────────────────────────
PERSONALES_EN = [
    "name",
    "lastname",
    "surname",
    "firstname",
    "email",
    "phone",
    "mobile",
    "cellphone",
    "address",
    "street",
    "city",
    "country",
    "zipcode",
    "birthdate",
    "birthday",
    "age",
    "gender",
    "sex",
    "nationality",
    "passport",
    "username",
    "bank",
    "account",
    "salary",
    "wage",
    "income",
    "pension",
    "department",
    "position",
    "contract",
    "hire",
    "employee",
    "inspection",  # inspeccion
    "supervisor",  # igual en inglés
    "operator",  # operario
    "inspector",  # inspector
    "worker",  # trabajador
    "card",        # número de tarjeta bancaria
    "payment",     # método/datos de pago
    "customer",    # identificador de cliente (persona natural)
    "password",    # credencial de acceso
    "plate",       # matrícula/patente de vehículo
    "credential",  # credencial de autenticación
]

# ── Datos PERSONALES — abreviaciones (inglés / SAP / Oracle) ─────────────────
ABREV_PERSONALES_EN = [
    "id",
    "dob",  # date of birth
    "ssn",  # social security number
    "addr",
    "dept",
    "deptno",
    "empno",
    "pernr",
    "kunnr",  # SAP
    "mgr",  # manager/supervisor
]

# ── Datos SENSIBLES — palabras completas (español) ───────────────────────────
# NOTA: "tratamiento" fue REMOVIDO intencionalmente.
#       En el contexto de DataCL siempre significa "tratamiento de datos"
#       (jurídico), nunca "tratamiento médico". Dejarlo causaba falsos positivos
#       en campos como "nombre del tratamiento", "titular del tratamiento".
SENSIBLES_ES = [
    "salud",
    "diagnostico",
    "enfermedad",
    "medicamento",
    "discapacidad",
    "discapacidades",
    "religion",
    "voto",
    "psicologico",
    "psiquiatrico",
    "politico",
    "genetico",
    "genotipo",
    "biometrico",
    "huella",
    "iris",
    "creencia",
    "religioso",
    "religiosos",
    "creencias",
    "fe",
    "etnia",
    "raza",
    "orientacion",
    "politico",
    "sindical",
    "biometrico",
    "huella",
    "iris",
    "hospital",
    "clinica",
    "sangre",
    "psicologico",
    "psiquiatrico",
    "genetico",
    "genotipo",
    "toxicologica",  # Indice_Exposicion_Toxicologica
    "exposicion",  # misma columna
    "afiliacion",  # Sindicato_Base_Afiliacion
    "comunitaria",  # Nivel_Tension_Comunitaria debatible si es sensible
    "vih",
    "sanguineo",
    "sustancia",
    "tuberculosis",
    "narcotraficante",  # por si acaso
    "droga",
    "alergia",      # condición médica (alergias) — Art. 16 letra a)
    "intolerancia", # intolerancia alimentaria = condición médica — Art. 16 a)
    "dietetica",    # puede revelar condición médica o creencia religiosa — Art. 16 a) y c)
    "dieta",        # ídem — puede indicar diabetes, celiaquía, o práctica religiosa
]

# ── Datos SENSIBLES — abreviaciones (español) ────────────────────────────────
ABREV_SENSIBLES_ES = [
    "dx",  # diagnóstico clínico
    "hcl",  # historia clínica
    "discap",  # discapacidad
]

# ── Datos SENSIBLES — palabras completas (inglés) ────────────────────────────
SENSIBLES_EN = [
    "health",
    "diagnosis",
    "disease",
    "medication",
    "disability",
    "religion",
    "belief",
    "ethnicity",
    "race",
    "orientation",
    "political",
    "ideologia",  # Registro_Ideologia_Encubierta
    "psicotropico",  # Patron_Consumo_Psicotropicos
    "ideologica",
    "ideologico",
    "biometric",
    "fingerprint",
    "syndical",
    "hospital",
    "clinic",
    "blood",
    "genetic",
    "psychiatric",
    "psychological",
    "toxicological",
    "exposure",  # exposicion
    "affiliation",  # afiliacion
    "community",  # comunitaria
    "indigenous",  # originario
    "union",  # sindical — 'syndical' ya está pero 'union' es más común en inglés
]

# ── Datos SENSIBLES — abreviaciones (inglés) ─────────────────────────────────
ABREV_SENSIBLES_EN = [
    "dna",
    "ehr",  # electronic health record
    "emr",  # electronic medical record
]

# ── Listas unificadas para usar en clasificar_columnas ───────────────────────
TODAS_PERSONALES = list(set(PERSONALES_ES + PERSONALES_EN))
TODAS_ABREV_PERSONALES = list(set(ABREV_PERSONALES_ES + ABREV_PERSONALES_EN))
TODAS_SENSIBLES = list(set(SENSIBLES_ES + SENSIBLES_EN))
TODAS_ABREV_SENSIBLES = list(set(ABREV_SENSIBLES_ES + ABREV_SENSIBLES_EN))

# ── Categorías temáticas para la tercera dimensión de clasificación ───────────
# IMPORTANTE: el orden de este diccionario define la prioridad de asignación.
# Cuando una columna puede pertenecer a más de una categoría (ej. "afp" cae
# en financieros Y en laborales), gana la que aparece primero. No reordenar
# sin revisar los tests de clasificación — cambiarlo silencia errores difíciles
# de detectar.
CATEGORIAS_TEMATICAS = {
    "identificatorios": {
        "keywords": ["rut", "dni", "run", "nombre", "apellido", "pasaporte", "cedula"],
        "label": "Datos identificatorios",
    },
    "contacto": {
        "keywords": [
            "correo", "email", "mail", "telefono", "celular", "movil",
            "fono", "tel", "cel", "direccion", "domicilio", "ciudad", "comuna", "calle",
        ],
        "label": "Datos de contacto",
    },
    "salud": {
        "keywords": [
            "salud", "diagnostico", "medicamento", "enfermedad", "discapacidad",
            "historial", "clinica", "hospital", "sangre", "sanguineo", "alergia",
            "dx", "hcl",
        ],
        "label": "Datos de salud",
    },
    "financieros": {
        "keywords": [
            "banco", "cuenta", "salario", "sueldo", "beca", "matricula",
            "afp", "isapre", "remuneracion", "liquido", "tarjeta", "pago",
        ],
        "label": "Datos financieros",
    },
    "laborales": {
        "keywords": [
            "cargo", "contrato", "departamento", "ingreso", "puesto",
            "laboral", "supervisor", "operario",
        ],
        "label": "Datos laborales",
    },
    "academicos": {
        "keywords": ["nota", "curso", "nivel", "asistencia", "promedio", "situacion"],
        "label": "Datos académicos",
    },
    "biometricos": {
        # "imagen" y "fotografia" fueron excluidos: son demasiado genéricos y
        # generan falsos positivos en columnas como imagen_producto, url_imagen.
        # Se usan tokens específicos del dominio biométrico.
        "keywords": ["huella", "iris", "biometrico", "dactilar", "facial"],
        "label": "Datos biométricos",
    },
}


# ─────────────────────────────────────────────────────────────────────────────
# LECTURA DE ARCHIVOS
# ─────────────────────────────────────────────────────────────────────────────


def leer_columnas_csv(contenido: bytes) -> list[str]:
    """
    Recibe los bytes de un archivo CSV y devuelve la lista de nombres
    de columnas tal como vienen (sin lowercase — eso lo hace clasificar_columnas).
    """
    try:
        df = pd.read_csv(io.BytesIO(contenido))
    except pd.errors.EmptyDataError:
        raise ValueError("El archivo CSV está vacío.")
    except Exception as e:
        raise ValueError(f"No se pudo leer el archivo CSV: {str(e)}")

    if len(df.columns) == 0:
        raise ValueError("El archivo CSV no tiene columnas.")

    return [str(col).strip() for col in df.columns]


def leer_columnas_excel(contenido: bytes) -> list[str]:
    """
    Recibe los bytes de un archivo Excel y devuelve la lista de nombres
    de columnas de la primera hoja.
    """
    try:
        df = pd.read_excel(io.BytesIO(contenido), sheet_name=0, engine="openpyxl")
    except Exception as e:
        raise ValueError(f"No se pudo leer el archivo Excel: {str(e)}")

    if df.empty and len(df.columns) == 0:
        raise ValueError("El archivo Excel está vacío o no tiene columnas.")

    return [str(col).strip() for col in df.columns]


# ─────────────────────────────────────────────────────────────────────────────
# CLASIFICACIÓN
# ─────────────────────────────────────────────────────────────────────────────


def _tokenizar(nombre_columna: str) -> set[str]:
    """
    Convierte un nombre de columna en un set de tokens en minúsculas.
    Separa por espacios, guiones bajos y guiones.

    Ejemplos:
        "fecha_nacimiento" → {"fecha", "nacimiento"}
        "FIRST-NAME"       → {"first", "name"}
        "emailCliente"     → {"emailcliente"}  y además elimina los tildes para más coincidencias
        "fec_nac"          → {"fec", "nac"}
    """

    normalizado = nombre_columna.lower().replace("_", " ").replace("-", " ")
    # Eliminar tildes y diacríticos
    sin_tildes = "".join(
        c
        for c in unicodedata.normalize("NFD", normalizado)
        if unicodedata.category(c) != "Mn"
    )
    return set(sin_tildes.split())


def _raiz(palabra: str, largo: int = 7) -> str:
    """
    Devuelve los primeros `largo` caracteres de la palabra.
    Ej: "psicologico" → "psicolo"
        "psicologicas" → "psicolo"
        "genetico" → "genetic"
        "geneticas" → "genetic"
    """
    return palabra[:largo]


def _detectar_categoria(tokens: set[str]) -> str:
    """
    Retorna el label de la categoría temática para un conjunto de tokens,
    o "Otros" si ninguna categoría hace match.
    La búsqueda respeta el orden de CATEGORIAS_TEMATICAS (prioridad implícita).
    """
    for config in CATEGORIAS_TEMATICAS.values():
        keywords = config["keywords"]
        kw_largas = {_raiz(k) for k in keywords if len(k) >= 8}
        kw_cortas = {k for k in keywords if len(k) < 8}
        for token in tokens:
            if (len(token) >= 8 and _raiz(token) in kw_largas) or token in kw_cortas:
                return config["label"]
    return "Otros"


def _coincide(tokens: set[str], palabras: list[str], abreviaciones: list[str]) -> bool:
    # Para palabras largas (8+ chars): comparar por raíz truncada de 7 chars
    palabras_largas = [p for p in palabras if len(p) >= 8]
    raices_dict = {_raiz(p) for p in palabras_largas}

    for token in tokens:
        if len(token) >= 8:
            if _raiz(token) in raices_dict:
                return True
        # Exacto para tokens cortos
        if token in palabras:
            return True

    # Abreviaciones siempre exactas (son cortas, no tienen inflexión)
    return any(abr in tokens for abr in abreviaciones)


def clasificar_columnas(columnas: list[str]) -> dict:
    """
    Recibe una lista de nombres de columnas y clasifica cada una como
    SENSIBLE, PERSONAL o pendiente (no reconocida).

    Regla de prioridad: sensibles > personales.
    Si una columna coincide con ambas listas, se clasifica como SENSIBLE.

    Retorna:
    {
        "detectados": [{"nombre_columna": "...", "tipo": "PERSONAL|SENSIBLE"}],
        "pendientes": [{"nombre_columna": "..."}]
    }

    Ejemplos de columnas y resultado esperado:
        "rut_cliente"          → PERSONAL   (token "rut" en abrev_personales)
        "fecha_nacimiento"     → PERSONAL   (token "nacimiento" en personales)
        "diagnostico_medico"   → SENSIBLE   (token "diagnostico" en sensibles)
        "medidas_seguridad"    → pendiente  ✅ (ningún token coincide)
        "medios_tratamiento"   → pendiente  ✅ ("tratamiento" removido de sensibles)
        "nombre_tratamiento"   → PERSONAL   ✅ (token "nombre" en personales)
        "base_legal"           → pendiente  ✅
        "plazo_conservacion"   → pendiente  ✅
    """
    detectados = []
    pendientes = []

    for col in columnas:
        tokens = _tokenizar(col)
        categoria = _detectar_categoria(tokens)

        if _coincide(tokens, TODAS_SENSIBLES, TODAS_ABREV_SENSIBLES):
            detectados.append({"nombre_columna": col, "tipo": "SENSIBLE", "categoria_tematica": categoria})
        elif _coincide(tokens, TODAS_PERSONALES, TODAS_ABREV_PERSONALES):
            detectados.append({"nombre_columna": col, "tipo": "PERSONAL", "categoria_tematica": categoria})
        else:
            pendientes.append({"nombre_columna": col, "categoria_tematica": "Otros"})

    return {"detectados": detectados, "pendientes": pendientes}


def generar_texto_categoria(campos_seleccionados: list) -> str:
    """
    Recibe una lista de campos (cada uno con "nombre_columna" y "categoria_tematica")
    y devuelve el texto agrupado por categoría en formato RAT oficial.
    El texto es editable por el usuario — es una sugerencia de partida.

    Ejemplo:
        Input:  [rut_alumno(identificatorios), correo_apoderado(contacto), diagnostico_medico(salud)]
        Output: "Datos identificatorios — Rut Alumno.\nDatos de contacto — Correo Apoderado.\n..."
    """
    grupos: dict[str, list[str]] = {}
    for campo in campos_seleccionados:
        categoria = campo.get("categoria_tematica", "Otros")
        nombre = campo["nombre_columna"].replace("_", " ").title()
        grupos.setdefault(categoria, []).append(nombre)

    orden = [cfg["label"] for cfg in CATEGORIAS_TEMATICAS.values()] + ["Otros"]

    lineas = []
    for categoria in orden:
        if categoria in grupos:
            nombres = ", ".join(grupos[categoria])
            lineas.append(f"{categoria} — {nombres}.")

    return "\n".join(lineas)
