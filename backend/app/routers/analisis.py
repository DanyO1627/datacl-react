import io
from typing import Annotated
import pandas as pd
from pandas.errors import EmptyDataError, ParserError
from fastapi import APIRouter, UploadFile, File, HTTPException

from app.utils.analisis import leer_columnas_csv, leer_columnas_excel, clasificar_columnas

router = APIRouter(prefix="/analizar", tags=["analisis"])

EXTENSIONES_CSV   = ('.csv',)
EXTENSIONES_EXCEL = ('.xlsx', '.xls')


def _detectar_tipo_archivo(nombre: str) -> str:
    """
    Recibe el nombre del archivo y devuelve 'csv', 'excel' o lanza HTTPException 400
    si el formato no está soportado.
    """
    nombre = nombre.lower()
    if nombre.endswith(EXTENSIONES_CSV):
        return 'csv'
    elif nombre.endswith(EXTENSIONES_EXCEL):
        return 'excel'
    else:
        raise HTTPException(
            status_code=400,
            detail="Formato no soportado. Usa CSV o Excel (.xlsx, .xls)"
        )


def _leer_dataframe(contenido: bytes, tipo: str) -> pd.DataFrame:
    """
    Lee bytes y devuelve un DataFrame según el tipo ('csv' o 'excel').
    Captura errores conocidos de Pandas con mensajes en español.
    Solo se usa internamente para el diccionario (necesitamos el df completo).
    """
    try:
        if tipo == 'csv':
            return pd.read_csv(io.BytesIO(contenido))
        else:
            return pd.read_excel(io.BytesIO(contenido), sheet_name=0, engine='openpyxl')

    except EmptyDataError:
        raise HTTPException(status_code=400, detail="El archivo no tiene datos.")

    except ParserError:
        raise HTTPException(status_code=400, detail="El archivo está corrupto o tiene formato incorrecto.")

    except UnicodeDecodeError:
        # Segunda oportunidad con latin-1 solo para CSV (común en archivos chilenos con tildes)
        if tipo == 'csv':
            try:
                return pd.read_csv(io.BytesIO(contenido), encoding='latin-1')
            except Exception:
                pass
        raise HTTPException(
            status_code=400,
            detail="El archivo tiene caracteres no reconocidos. Guárdalo en formato UTF-8 e intenta nuevamente."
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"El archivo tiene un formato inválido: {str(e)}")

    except Exception:
        raise HTTPException(status_code=500, detail="Error al procesar el archivo.")


@router.post("/archivo")
async def analizar_archivo(archivo: Annotated[UploadFile, File(...)]):
    """
    Nivel 1 — recibe un archivo CSV o Excel y clasifica sus columnas
    comparando los nombres contra el diccionario de palabras clave.

    Los datos del archivo se analizan SOLO en memoria; nunca se persisten en la BD.

    Respuesta:
    {
        "detectados": [{"nombre_columna": "...", "tipo": "PERSONAL|SENSIBLE"}],
        "pendientes": [{"nombre_columna": "..."}],
        "total_columnas": N,
        "resumen": { "personales": N, "sensibles": N, "sin_clasificar": N }
    }
    """
    tipo = _detectar_tipo_archivo(archivo.filename)

    # Leemos el contenido completo en memoria — nunca se guarda en disco ni en BD
    contenido: bytes = await archivo.read()

    if len(contenido) == 0:
        raise HTTPException(status_code=400, detail="El archivo está vacío.")

    try:
        if tipo == 'csv':
            columnas = leer_columnas_csv(contenido)
        else:
            columnas = leer_columnas_excel(contenido)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    resultado = clasificar_columnas(columnas)

    return {
        "detectados":     resultado["detectados"],
        "pendientes":     resultado["pendientes"],
        "total_columnas": len(columnas),
        "resumen": {
            "personales":     sum(1 for d in resultado["detectados"] if d["tipo"] == "PERSONAL"),
            "sensibles":      sum(1 for d in resultado["detectados"] if d["tipo"] == "SENSIBLE"),
            "sin_clasificar": len(resultado["pendientes"]),
        },
    }


@router.post("/diccionario")
async def analizar_con_diccionario(
    archivo:     Annotated[UploadFile, File(...)],
    diccionario: Annotated[UploadFile, File(...)],
):
    """
    Nivel 2 — recibe el archivo de datos y un diccionario técnico
    (2 columnas: nombre_tecnico | descripcion).

    Primero aplica detección por nombre de columna (nivel 1) y luego
    usa las descripciones del diccionario para intentar clasificar
    las columnas que quedaron pendientes.
    """
    # --- Leer archivo principal en memoria ---
    tipo_datos = _detectar_tipo_archivo(archivo.filename)
    contenido_datos: bytes = await archivo.read()

    if len(contenido_datos) == 0:
        raise HTTPException(status_code=400, detail="El archivo de datos está vacío.")

    try:
        columnas_datos = (
            leer_columnas_csv(contenido_datos)
            if tipo_datos == 'csv'
            else leer_columnas_excel(contenido_datos)
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Error en archivo de datos: {e}")

    # --- Leer diccionario en memoria ---
    tipo_dic = _detectar_tipo_archivo(diccionario.filename)
    contenido_dic: bytes = await diccionario.read()

    if len(contenido_dic) == 0:
        raise HTTPException(status_code=400, detail="El archivo diccionario está vacío.")

    # Para el diccionario necesitamos el DataFrame completo para leer ambas columnas
    df_dic = _leer_dataframe(contenido_dic, tipo_dic)

    # Validaciones separadas para dar mensajes claros — aporte de Dani
    if len(df_dic.columns) < 2:
        raise HTTPException(
            status_code=400,
            detail="El diccionario debe tener exactamente 2 columnas: nombre_tecnico y descripcion."
        )
    if len(df_dic.columns) > 2:
        raise HTTPException(
            status_code=400,
            detail=f"El diccionario tiene {len(df_dic.columns)} columnas. Solo se permiten 2: nombre_tecnico y descripcion."
        )
    if len(df_dic) == 0:
        raise HTTPException(status_code=400, detail="El diccionario no tiene filas de datos.")

    # --- Nivel 1: detección por nombre de columna ---
    resultado_n1 = clasificar_columnas(columnas_datos)
    detectados   = resultado_n1["detectados"]
    pendientes_n1 = [p["nombre_columna"] for p in resultado_n1["pendientes"]]

    # Construir mapa: nombre_tecnico (minúsculas) → descripcion
    col_tecnica, col_descripcion = df_dic.columns[0], df_dic.columns[1]
    try:
        mapa_dic = {
            str(row[col_tecnica]).strip().lower(): str(row[col_descripcion]).strip()
            for _, row in df_dic.iterrows()
        }
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="No se pudo leer el contenido del diccionario. Verifica que las celdas tengan texto válido."
        )

    # --- Nivel 2: buscar columnas pendientes en el diccionario ---
    pendientes_final = []
    for col in pendientes_n1:
        descripcion = mapa_dic.get(col.lower())

        if descripcion:
            resultado_desc = clasificar_columnas([descripcion])
            if resultado_desc["detectados"]:
                tipo_col = resultado_desc["detectados"][0]["tipo"]
                detectados.append({
                    "nombre_columna": col,
                    "tipo":           tipo_col,
                    "origen":         "diccionario",
                    "descripcion":    descripcion,
                })
            else:
                pendientes_final.append({"nombre_columna": col})
        else:
            pendientes_final.append({"nombre_columna": col})

    return {
        "detectados":     detectados,
        "pendientes":     pendientes_final,
        "total_columnas": len(columnas_datos),
        "resumen": {
            "personales":     sum(1 for d in detectados if d["tipo"] == "PERSONAL"),
            "sensibles":      sum(1 for d in detectados if d["tipo"] == "SENSIBLE"),
            "sin_clasificar": len(pendientes_final),
        },
    }