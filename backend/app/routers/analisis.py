import io
import pandas as pd
from pandas.errors import EmptyDataError, ParserError
from fastapi import APIRouter, UploadFile, File, HTTPException

from app.utils.analisis import PALABRAS_PERSONALES, PALABRAS_SENSIBLES

router = APIRouter(prefix="/analizar", tags=["analisis"])


def _leer_archivo(archivo: UploadFile) -> pd.DataFrame:
    """
    Lee un archivo CSV o Excel y devuelve un DataFrame.
    Captura todos los errores conocidos de Pandas y devuelve
    mensajes en español entendibles para el usuario.
    """
    contenido = archivo.file.read()
    nombre = archivo.filename.lower()

    if not nombre.endswith(('.csv', '.xlsx', '.xls')):
        raise HTTPException(
            status_code=400,
            detail="Formato no soportado. Usa CSV o Excel (.xlsx, .xls)"
        )

    try:
        if nombre.endswith('.csv'):
            return pd.read_csv(io.BytesIO(contenido))
        else:
            return pd.read_excel(io.BytesIO(contenido))

    except EmptyDataError:
        # El archivo existe pero está completamente vacío (0 bytes de datos)
        raise HTTPException(
            status_code=400,
            detail="El archivo no tiene datos"
        )

    except ParserError:
        # El archivo tiene contenido pero no se puede interpretar como tabla
        raise HTTPException(
            status_code=400,
            detail="El archivo está corrupto o tiene formato incorrecto"
        )

    except UnicodeDecodeError:
        # El archivo tiene caracteres especiales que no son UTF-8
        # Intenta con latin-1 como segunda oportunidad solo para CSV
        if nombre.endswith('.csv'):
            try:
                return pd.read_csv(io.BytesIO(contenido), encoding='latin-1')
            except Exception:
                pass
        raise HTTPException(
            status_code=400,
            detail="El archivo tiene caracteres no reconocidos. Guárdalo en formato UTF-8 e intenta nuevamente"
        )

    except ValueError as e:
        # Errores de valor: columnas mal formadas, tipos incompatibles, etc.
        raise HTTPException(
            status_code=400,
            detail=f"El archivo tiene un formato inválido: {str(e)}"
        )

    except Exception:
        # Cualquier otro error inesperado — nunca se muestra el traceback al usuario
        raise HTTPException(
            status_code=500,
            detail="Error al procesar el archivo"
        )


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
    # _leer_archivo ya maneja todos los errores con mensajes en español
    df = _leer_archivo(archivo)

    if len(df.columns) == 0:
        raise HTTPException(
            status_code=400,
            detail="El archivo no tiene columnas"
        )

    if len(df) == 0:
        raise HTTPException(
            status_code=400,
            detail="El archivo tiene columnas pero no tiene filas de datos"
        )

    columnas = list(df.columns)
    resultado = _deteccion_nivel1(columnas)

    return {
        'total_columnas': len(columnas),
        'detectados': resultado['detectados'],
        'pendientes': resultado['pendientes'],
        'resumen': {
            'personales': sum(1 for d in resultado['detectados'] if d['tipo'] == 'personal'),
            'sensibles':  sum(1 for d in resultado['detectados'] if d['tipo'] == 'sensible'),
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
    df_datos = _leer_archivo(archivo)

    # Leer diccionario — misma función, mismos errores manejados
    df_dic = _leer_archivo(diccionario)

    # Validar estructura del diccionario
    if len(df_dic.columns) < 2:
        raise HTTPException(
            status_code=400,
            detail="El diccionario debe tener exactamente 2 columnas: nombre_tecnico y descripcion"
        )

    if len(df_dic.columns) > 2:
        raise HTTPException(
            status_code=400,
            detail=f"El diccionario tiene {len(df_dic.columns)} columnas. Solo se permiten 2: nombre_tecnico y descripcion"
        )

    if len(df_dic) == 0:
        raise HTTPException(
            status_code=400,
            detail="El diccionario no tiene filas de datos"
        )

    columnas_datos = list(df_datos.columns)

    # Nivel 1: detección por nombre de columna
    resultado_n1  = _deteccion_nivel1(columnas_datos)
    detectados    = resultado_n1['detectados']
    pendientes_n1 = resultado_n1['pendientes']

    # Construir mapa del diccionario: nombre_tecnico → descripcion
    col_tecnica     = df_dic.columns[0]
    col_descripcion = df_dic.columns[1]

    try:
        mapa_dic = {
            str(row[col_tecnica]).strip().lower(): str(row[col_descripcion]).strip()
            for _, row in df_dic.iterrows()
        }
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="No se pudo leer el contenido del diccionario. Verifica que las celdas tengan texto válido"
        )

    # Nivel 2: buscar las columnas pendientes en el diccionario
    pendientes_final = []
    for col in pendientes_n1:
        descripcion = mapa_dic.get(col.lower())
        if descripcion:
            tipo = _clasificar_columna(descripcion)
            if tipo:
                detectados.append({
                    'columna':     col,
                    'tipo':        tipo,
                    'origen':      'diccionario',
                    'descripcion': descripcion
                })
            else:
                pendientes_final.append(col)
        else:
            pendientes_final.append(col)

    return {
        'total_columnas': len(columnas_datos),
        'detectados':     detectados,
        'pendientes':     pendientes_final,
        'resumen': {
            'personales':     sum(1 for d in detectados if d['tipo'] == 'personal'),
            'sensibles':      sum(1 for d in detectados if d['tipo'] == 'sensible'),
            'sin_clasificar': len(pendientes_final)
        }
    }