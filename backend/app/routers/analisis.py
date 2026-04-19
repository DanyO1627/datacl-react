import io
import pandas as pd
from fastapi import APIRouter, UploadFile, File, HTTPException

from app.utils.analisis import PALABRAS_PERSONALES, PALABRAS_SENSIBLES

router = APIRouter(prefix="/analizar", tags=["analisis"])

TAMANO_MAXIMO = 5 * 1024 * 1024  # 5 MB
EXTENSIONES_PERMITIDAS = ('.csv', '.xlsx', '.xls')


def _validar_archivo(archivo: UploadFile, contenido: bytes):
    """Valida extensión, tamaño y que no esté vacío."""
    nombre = archivo.filename.lower()

    if not nombre.endswith(EXTENSIONES_PERMITIDAS):
        raise HTTPException(
            status_code=400,
            detail="Formato no soportado. Use CSV o Excel."
        )

    if len(contenido) == 0:
        raise HTTPException(
            status_code=400,
            detail="El archivo está vacío."
        )

    if len(contenido) > TAMANO_MAXIMO:
        raise HTTPException(
            status_code=400,
            detail="El archivo supera el tamaño máximo permitido (5MB)."
        )


def _leer_archivo(archivo: UploadFile) -> tuple[pd.DataFrame, bytes]:
    """Lee un archivo CSV o Excel y devuelve un DataFrame y los bytes leídos."""
    contenido = archivo.file.read()
    _validar_archivo(archivo, contenido)

    nombre = archivo.filename.lower()
    try:
        if nombre.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(contenido))
        else:
            df = pd.read_excel(io.BytesIO(contenido), engine='openpyxl')
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"No se pudo leer el archivo: {str(e)}")

    if len(df.columns) == 0:
        raise HTTPException(status_code=400, detail="El archivo está vacío.")

    return df, contenido


def _clasificar_columna(texto: str) -> str | None:
    """
    Revisa si alguna palabra clave aparece dentro del texto dado.
    Devuelve 'sensible', 'personal' o None.
    """
    texto = texto.lower().replace('_', ' ').replace('-', ' ')
    for palabra in PALABRAS_SENSIBLES:
        if palabra in texto:
            return 'sensible'
    for palabra in PALABRAS_PERSONALES:
        if palabra in texto:
            return 'personal'
    return None


def _deteccion_nivel1(columnas: list[str]) -> dict:
    """
    Nivel 1: compara los nombres de columna directamente contra el diccionario.
    Devuelve un dict con listas 'detectados' y 'pendientes'.
    """
    detectados = []
    pendientes = []

    for col in columnas:
        tipo = _clasificar_columna(col)
        if tipo:
            detectados.append({'columna': col, 'tipo': tipo, 'origen': 'nombre_columna'})
        else:
            pendientes.append(col)

    return {'detectados': detectados, 'pendientes': pendientes}


@router.post("/archivo")
async def analizar_archivo(archivo: UploadFile = File(...)):
    """
    Nivel 1: recibe un archivo CSV o Excel y clasifica sus columnas
    comparando los nombres directamente contra el diccionario de palabras clave.
    """
    df, _ = _leer_archivo(archivo)
    columnas = list(df.columns)
    resultado = _deteccion_nivel1(columnas)

    return {
        'total_columnas': len(columnas),
        'detectados': resultado['detectados'],
        'pendientes': resultado['pendientes'],
        'resumen': {
            'personales': sum(1 for d in resultado['detectados'] if d['tipo'] == 'personal'),
            'sensibles': sum(1 for d in resultado['detectados'] if d['tipo'] == 'sensible'),
            'sin_clasificar': len(resultado['pendientes'])
        }
    }


@router.post("/diccionario")
async def analizar_con_diccionario(
    archivo: UploadFile = File(...),
    diccionario: UploadFile = File(...)
):
    """
    Nivel 2: recibe el archivo de datos y un diccionario técnico (2 columnas:
    nombre_tecnico | descripcion). Aplica detección por nombre de columna (nivel 1)
    y luego busca en las descripciones del diccionario (nivel 2) para columnas
    que nivel 1 no pudo clasificar.
    """
    # Leer archivo principal
    df_datos, _ = _leer_archivo(archivo)

    # Leer diccionario
    df_dic, _ = _leer_archivo(diccionario)

    # Validar que el diccionario tiene exactamente 2 columnas
    if len(df_dic.columns) != 2:
        raise HTTPException(
            status_code=400,
            detail=f"El diccionario debe tener exactamente 2 columnas (nombre_tecnico, descripcion). Tiene {len(df_dic.columns)}."
        )

    columnas_datos = list(df_datos.columns)

    # Nivel 1: detección por nombre de columna
    resultado_n1 = _deteccion_nivel1(columnas_datos)
    detectados = resultado_n1['detectados']
    pendientes_n1 = resultado_n1['pendientes']

    # Construir mapa del diccionario: nombre_tecnico -> descripcion
    col_tecnica = df_dic.columns[0]
    col_descripcion = df_dic.columns[1]
    mapa_dic = {
        str(row[col_tecnica]).strip().lower(): str(row[col_descripcion]).strip()
        for _, row in df_dic.iterrows()
    }

    # Nivel 2: buscar las columnas pendientes en el diccionario
    pendientes_final = []
    for col in pendientes_n1:
        descripcion = mapa_dic.get(col.lower())
        if descripcion:
            tipo = _clasificar_columna(descripcion)
            if tipo:
                detectados.append({
                    'columna': col,
                    'tipo': tipo,
                    'origen': 'diccionario',
                    'descripcion': descripcion
                })
            else:
                pendientes_final.append(col)
        else:
            pendientes_final.append(col)

    return {
        'total_columnas': len(columnas_datos),
        'detectados': detectados,
        'pendientes': pendientes_final,
        'resumen': {
            'personales': sum(1 for d in detectados if d['tipo'] == 'personal'),
            'sensibles': sum(1 for d in detectados if d['tipo'] == 'sensible'),
            'sin_clasificar': len(pendientes_final)
        }
    }
