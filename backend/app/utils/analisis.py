import io
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
    'nombre', 'apellido', 'apellidos',
    'cedula', 'pasaporte',
    'correo', 'email', 'mail',
    'telefono', 'celular', 'movil',
    'direccion', 'domicilio', 'calle', 'ciudad', 'comuna', 'region',
    'nacimiento', 'edad', 'sexo', 'genero', 'nacionalidad',
    'banco', 'cuenta', 'bancaria',
    'afp', 'prevision', 'previsional',
    'remuneracion', 'sueldo', 'salario', 'liquido',
    'contrato', 'laboral', 'ingreso', 'cargo', 'puesto',
    'departamento', 'area', 'postal', 'pais',
]
 
# ── Datos PERSONALES — abreviaciones de BDs reales (español) ─────────────────
# SAP: KUNNR (cliente), PERNR (empleado), BUKRS (empresa)
# Oracle: EMPNO, DEPTNO
# Sistemas chilenos comunes
ABREV_PERSONALES_ES = [
    'rut', 'dni',
    'tel', 'fono', 'cel',
    'dir', 'dom',
    'fec', 'nac',                    # fec_nac, fecha_nac
    'rem', 'sue',                    # remuneracion, sueldo
    'emp', 'empl',                   # empleado
    'usr', 'user',
]
 
# ── Datos PERSONALES — palabras completas (inglés) ───────────────────────────
PERSONALES_EN = [
    'name', 'lastname', 'surname', 'firstname',
    'email', 'phone', 'mobile', 'cellphone',
    'address', 'street', 'city', 'country', 'zipcode',
    'birthdate', 'birthday', 'age', 'gender', 'sex', 'nationality',
    'passport', 'username',
    'bank', 'account', 'salary', 'wage', 'income',
    'pension', 'department', 'position', 'contract',
    'hire', 'employee',
]
 
# ── Datos PERSONALES — abreviaciones (inglés / SAP / Oracle) ─────────────────
ABREV_PERSONALES_EN = [
    'id',
    'dob',                           # date of birth
    'ssn',                           # social security number
    'addr',
    'dept', 'deptno',
    'empno', 'pernr', 'kunnr',       # SAP
]
 
# ── Datos SENSIBLES — palabras completas (español) ───────────────────────────
# NOTA: "tratamiento" fue REMOVIDO intencionalmente.
#       En el contexto de DataCL siempre significa "tratamiento de datos"
#       (jurídico), nunca "tratamiento médico". Dejarlo causaba falsos positivos
#       en campos como "nombre del tratamiento", "titular del tratamiento".
SENSIBLES_ES = [
    'salud', 'diagnostico', 'enfermedad', 'medicamento',
    'discapacidad', 'discapacidades'
    'religion', 'creencia', 'religioso', 'religiosos', 'creencias', 'fe'
    'etnia', 'raza',
    'orientacion',
    'politico', 'sindical',
    'biometrico', 'huella', 'iris',
    'hospital', 'clinica',
    'sangre',
    'psicologico', 'psiquiatrico', 'genetico', 'genotipo',
]
 
# ── Datos SENSIBLES — abreviaciones (español) ────────────────────────────────
ABREV_SENSIBLES_ES = [
    'dx',                            # diagnóstico clínico
    'hcl',                           # historia clínica
    'discap',                        # discapacidad
]
 
# ── Datos SENSIBLES — palabras completas (inglés) ────────────────────────────
SENSIBLES_EN = [
    'health', 'diagnosis', 'disease', 'medication',
    'disability',
    'religion', 'belief',
    'ethnicity', 'race',
    'orientation',
    'political', 'biometric', 'fingerprint', 'syndical',
    'hospital', 'clinic',
    'blood', 'genetic', 'psychiatric', 'psychological',
]
 
# ── Datos SENSIBLES — abreviaciones (inglés) ─────────────────────────────────
ABREV_SENSIBLES_EN = [
    'dna',
    'ehr',                           # electronic health record
    'emr',                           # electronic medical record
]
 
# ── Listas unificadas para usar en clasificar_columnas ───────────────────────
TODAS_PERSONALES       = list(set(PERSONALES_ES + PERSONALES_EN))
TODAS_ABREV_PERSONALES = list(set(ABREV_PERSONALES_ES + ABREV_PERSONALES_EN))
TODAS_SENSIBLES        = list(set(SENSIBLES_ES + SENSIBLES_EN))
TODAS_ABREV_SENSIBLES  = list(set(ABREV_SENSIBLES_ES + ABREV_SENSIBLES_EN))
 
 
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
        df = pd.read_excel(io.BytesIO(contenido), sheet_name=0, engine='openpyxl')
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
        "emailCliente"     → {"emailcliente"}   ← camelCase no se separa, ok para la mayoría
        "fec_nac"          → {"fec", "nac"}
    """
    normalizado = nombre_columna.lower().replace('_', ' ').replace('-', ' ')
    return set(normalizado.split())
 
 
def _coincide(tokens: set[str], palabras: list[str], abreviaciones: list[str]) -> bool:
    """
    Retorna True si algún token coincide exactamente con alguna palabra
    de la lista larga O con alguna abreviación.
 
    Por qué separamos palabras y abreviaciones en dos listas si hacemos
    lo mismo con ambas? Porque en el futuro puede ser útil distinguirlas
    (ej: logging, confianza diferente). Por ahora el comportamiento es igual.
    """
    return (
        any(p in tokens for p in palabras) or
        any(abr in tokens for abr in abreviaciones)
    )
 
 
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
 
        if _coincide(tokens, TODAS_SENSIBLES, TODAS_ABREV_SENSIBLES):
            detectados.append({"nombre_columna": col, "tipo": "SENSIBLE"})
        elif _coincide(tokens, TODAS_PERSONALES, TODAS_ABREV_PERSONALES):
            detectados.append({"nombre_columna": col, "tipo": "PERSONAL"})
        else:
            pendientes.append({"nombre_columna": col})
 
    return {"detectados": detectados, "pendientes": pendientes}