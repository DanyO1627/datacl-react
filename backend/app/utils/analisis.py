# Diccionario de palabras clave para detección de datos personales y sensibles
# Basado en la Ley 21.719 de Protección de Datos Personales (Chile)
# Se usan en minúsculas para facilitar la comparación con nombres de columnas

# Palabras que indican que una columna contiene datos personales identificables
PALABRAS_PERSONALES_ES = [
    'nombre',
    'apellido',
    'apellidos',
    'rut',
    'dni',
    'cedula',
    'pasaporte',
    'correo',
    'email',
    'mail',
    'telefono',
    'fono',
    'celular',
    'movil',
    'direccion',
    'domicilio',
    'calle',
    'ciudad',
    'comuna',
    'region',
    'fecha_nac',
    'nacimiento',
    'edad',
    'sexo',
    'genero',
    'nacionalidad',
]

# Palabras que indican que una columna contiene datos sensibles
# (categoría especial que requiere mayor protección según Ley 21.719)
PALABRAS_SENSIBLES_ES = [
    'salud',
    'diagnostico',
    'enfermedad',
    'medicamento',
    'tratamiento',
    'discapacidad',
    'religion',
    'creencia',
    'etnia',
    'raza',
    'orientacion',
    'politico',
    'sindical',
    'biometrico',
    'huella',
    'iris',
    'ficha_medica',
    'hospital',
    'clinica',
]

# Palabras en inglés que indican que una columna contiene datos personales identificables
PALABRAS_PERSONALES_EN = [
    'name',
    'lastname',
    'surname',
    'firstname',
    'id',
    'rut',
    'email',
    'phone',
    'mobile',
    'cellphone',
    'address',
    'street',
    'city',
    'country',
    'zipcode',
    'birthdate',
    'birthday',
    'age',
    'gender',
    'sex',
    'nationality',
    'passport',
    'username',
]

# Palabras en inglés que indican que una columna contiene datos sensibles
PALABRAS_SENSIBLES_EN = [
    'health',
    'diagnosis',
    'disease',
    'medication',
    'treatment',
    'disability',
    'religion',
    'belief',
    'ethnicity',
    'race',
    'orientation',
    'political',
    'biometric',
    'fingerprint',
    'syndical',
    'medical',
    'hospital',
    'clinic',
]

# Listas unificadas (español + inglés) para usar en la detección
PALABRAS_PERSONALES = list(set(PALABRAS_PERSONALES_ES + PALABRAS_PERSONALES_EN))
PALABRAS_SENSIBLES = list(set(PALABRAS_SENSIBLES_ES + PALABRAS_SENSIBLES_EN))


import io
import pandas as pd


def leer_columnas_csv(contenido: bytes) -> list[str]:
    """
    Recibe los bytes de un archivo CSV y devuelve la lista de nombres
    de columnas en minúsculas.
    """
    try:
        df = pd.read_csv(io.BytesIO(contenido))
    except pd.errors.EmptyDataError:
        raise ValueError("El archivo está vacío.")
    except Exception as e:
        raise ValueError(f"No se pudo leer el archivo CSV: {str(e)}")

    if len(df.columns) == 0:
        raise ValueError("El archivo CSV está vacío o no tiene columnas.")

    return [str(col).strip().lower() for col in df.columns]


def leer_columnas_excel(contenido: bytes) -> list[str]:
    """
    Recibe los bytes de un archivo Excel y devuelve la lista de nombres
    de columnas de la primera hoja en minúsculas.

    Lanza ValueError si el archivo está vacío o no tiene columnas.
    Lanza ValueError si el archivo es inválido o no se puede leer.
    """
    try:
        df = pd.read_excel(io.BytesIO(contenido), sheet_name=0, engine='openpyxl')
    except Exception as e:
        raise ValueError(f"No se pudo leer el archivo Excel: {str(e)}")

    if df.empty and len(df.columns) == 0:
        raise ValueError("El archivo Excel está vacío o no tiene columnas.")

    return [str(col).strip().lower() for col in df.columns]


def clasificar_columnas(columnas: list[str]) -> dict:
    """
    Recibe una lista de nombres de columnas y determina si cada una
    contiene datos personales, sensibles, o ninguno.

    Regla: sensibles tienen prioridad — si una columna coincide con ambas
    listas, se clasifica como SENSIBLE.

    Retorna:
    {
        "detectados": [{"nombre_columna": "...", "tipo": "PERSONAL|SENSIBLE"}],
        "pendientes": [{"nombre_columna": "..."}]
    }
    """
    detectados = []
    pendientes = []

    for col in columnas:
        # Normalizamos: todo minúscula, guiones y underscores como espacio
        col_normalizada = col.lower().replace('_', ' ').replace('-', ' ')

        # any() recorre la lista y para apenas encuentra la primera coincidencia — es eficiente
        # Sensibles PRIMERO ( tienen prioridad sobre personales)
        if any(palabra in col_normalizada for palabra in PALABRAS_SENSIBLES):
            detectados.append({"nombre_columna": col, "tipo": "SENSIBLE"})
        elif any(palabra in col_normalizada for palabra in PALABRAS_PERSONALES):
            detectados.append({"nombre_columna": col, "tipo": "PERSONAL"})
        else:
            pendientes.append({"nombre_columna": col})

    return {"detectados": detectados, "pendientes": pendientes}