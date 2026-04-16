import io
from typing import Annotated
import pandas as pd
from fastapi import APIRouter, UploadFile, File, HTTPException

# Importamos las tres funciones de utilidad del módulo de análisis
from app.utils.analisis import leer_columnas_csv, leer_columnas_excel, clasificar_columnas

router = APIRouter(prefix="/analizar", tags=["analisis"])

# Extensiones aceptadas por el sistema
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
    # --- Validación de formato (antes de leer el contenido) ---
    tipo = _detectar_tipo_archivo(archivo.filename)

    # Leemos el contenido completo en memoria — nunca se guarda en disco ni en BD
    contenido: bytes = await archivo.read()

    # Archivo vacío (0 bytes)
    if len(contenido) == 0:
        raise HTTPException(status_code=400, detail="El archivo está vacío.")

    # --- Lectura de columnas según tipo de archivo ---
    try:
        if tipo == 'csv':
            columnas = leer_columnas_csv(contenido)
        else:
            columnas = leer_columnas_excel(contenido)
    except ValueError as e:
        # ValueError es lanzado por leer_columnas_* cuando el archivo no tiene columnas
        # o cuando pandas no puede parsearlo
        raise HTTPException(status_code=400, detail=str(e))

    # --- Clasificación usando el diccionario de palabras clave ---
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

    try:
        # Para el diccionario necesitamos el DataFrame completo (2 columnas)
        df_dic = (
            pd.read_csv(io.BytesIO(contenido_dic))
            if tipo_dic == 'csv'
            else pd.read_excel(io.BytesIO(contenido_dic), sheet_name=0, engine='openpyxl')
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error al leer el diccionario: {e}")

    # El diccionario debe tener exactamente 2 columnas: nombre_tecnico y descripcion
    if len(df_dic.columns) != 2:
        raise HTTPException(
            status_code=400,
            detail=f"El diccionario debe tener exactamente 2 columnas. Tiene {len(df_dic.columns)}."
        )

    # --- Nivel 1: detección por nombre de columna ---
    resultado_n1 = clasificar_columnas(columnas_datos)
    detectados = resultado_n1["detectados"]
    pendientes_n1 = [p["nombre_columna"] for p in resultado_n1["pendientes"]]

    # Construir mapa: nombre_tecnico (minúsculas) → descripcion
    col_tecnica, col_descripcion = df_dic.columns[0], df_dic.columns[1]
    mapa_dic = {
        str(row[col_tecnica]).strip().lower(): str(row[col_descripcion]).strip()
        for _, row in df_dic.iterrows()
    }

    # --- Nivel 2: buscar columnas pendientes en el diccionario ---
    pendientes_final = []
    for col in pendientes_n1:
        descripcion = mapa_dic.get(col.lower())

        if descripcion:
            # Reutilizamos clasificar_columnas sobre la descripción del campo
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
