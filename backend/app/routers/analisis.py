import io
from typing import Annotated, Optional
import pandas as pd
from pandas.errors import EmptyDataError, ParserError
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends

from app.utils.analisis import leer_columnas_csv, leer_columnas_excel, clasificar_columnas
from app.utils.jwt import obtener_usuario_actual

# ─────────────────────────────────────────────────────────────────────────────
# DECISIÓN: ¿Requiere autenticación /analizar?
#
# SÍ requiere JWT: razones:
#
# 1. ABUSO DE RECURSOS: sin autenticación cualquier persona o bot puede subir
#    archivos de forma masiva y consumir CPU/RAM del servidor indefinidamente.
#
# 2. COHERENCIA DE FLUJO: el análisis es el paso previo a crear un tratamiento,
#    que sí requiere JWT. No tiene sentido que el paso previo sea público.
#
# 3. TRAZABILIDAD: si en el futuro queremos registrar qué organización analizó
#    qué archivos, ya tenemos el usuario disponible en el contexto.
#
# IMPLEMENTACIÓN: se agrega Depends(obtener_usuario_actual) a ambos endpoints.
# El frontend (analisisService.js) ya envía el JWT automáticamente via interceptor,
# por lo que no requiere ningún cambio en el frontend.
# ─────────────────────────────────────────────────────────────────────────────

router = APIRouter(prefix="/analizar", tags=["analisis"])

EXTENSIONES_CSV   = ('.csv',)
EXTENSIONES_EXCEL = ('.xlsx', '.xls')
TAMANO_MAXIMO     = 5 * 1024 * 1024  # 5 MB por archivo
MAX_ARCHIVOS      = 10


def _detectar_tipo_archivo(nombre: str) -> str:
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
async def analizar_archivo(
    archivos: Annotated[list[UploadFile], File(...)],
    _usuario=Depends(obtener_usuario_actual),
):
    """
    Nivel 1: recibe uno o más archivos CSV/Excel y clasifica sus columnas.
    Cada campo lleva archivo_origen indicando de qué archivo proviene.
    Los datos se analizan SOLO en memoria; nunca se persisten en la BD.
    Requiere autenticación JWT.
    """
    if len(archivos) == 0:
        raise HTTPException(status_code=400, detail="Debes enviar al menos un archivo.")
    if len(archivos) > MAX_ARCHIVOS:
        raise HTTPException(
            status_code=400,
            detail=f"Máximo {MAX_ARCHIVOS} archivos por análisis.",
        )

    detectados_totales: list[dict] = []
    pendientes_totales: list[dict] = []
    total_columnas = 0
    errores: list[dict] = []
    archivos_procesados: list[str] = []

    for archivo in archivos:
        nombre = archivo.filename or "sin_nombre"

        try:
            tipo = _detectar_tipo_archivo(nombre)
        except HTTPException as e:
            errores.append({"archivo": nombre, "error": e.detail})
            continue

        contenido: bytes = await archivo.read()

        if len(contenido) == 0:
            errores.append({"archivo": nombre, "error": "El archivo está vacío."})
            continue
        if len(contenido) > TAMANO_MAXIMO:
            errores.append({"archivo": nombre, "error": "Supera el tamaño máximo (5 MB)."})
            continue

        try:
            columnas = (
                leer_columnas_csv(contenido) if tipo == "csv"
                else leer_columnas_excel(contenido)
            )
        except ValueError as e:
            errores.append({"archivo": nombre, "error": str(e)})
            continue

        resultado = clasificar_columnas(columnas)

        for campo in resultado["detectados"]:
            campo["archivo_origen"] = nombre
        for campo in resultado["pendientes"]:
            campo["archivo_origen"] = nombre

        detectados_totales.extend(resultado["detectados"])
        pendientes_totales.extend(resultado["pendientes"])
        total_columnas += len(columnas)
        archivos_procesados.append(nombre)

    if not archivos_procesados and errores:
        raise HTTPException(
            status_code=400,
            detail="Ningún archivo pudo procesarse. "
                   + "; ".join(e["error"] for e in errores),
        )

    respuesta = {
        "detectados":     detectados_totales,
        "pendientes":     pendientes_totales,
        "total_columnas": total_columnas,
        "resumen": {
            "personales":     sum(1 for d in detectados_totales if d["tipo"] == "PERSONAL"),
            "sensibles":      sum(1 for d in detectados_totales if d["tipo"] == "SENSIBLE"),
            "sin_clasificar": len(pendientes_totales),
        },
    }

    if len(archivos) > 1:
        respuesta["archivos"] = archivos_procesados
    if errores:
        respuesta["errores"] = errores

    return respuesta


@router.post("/diccionario")
async def analizar_con_diccionario(
    diccionario: Annotated[UploadFile, File(...)],
    archivos: list[UploadFile] = File(default=[]),
    _usuario=Depends(obtener_usuario_actual),
):
    """
    Nivel 2 — recibe un diccionario técnico (nombre_tecnico + descripcion) y,
    opcionalmente, uno o más archivos de datos reales.

    Si se envían archivos, las columnas vienen de ellos (cada campo lleva
    archivo_origen) y el diccionario reclasifica las que quedan pendientes.

    Si NO se envían archivos, las columnas a clasificar son los nombres
    técnicos del propio diccionario.

    Requiere autenticación JWT.
    """
    tipo_dic = _detectar_tipo_archivo(diccionario.filename)
    contenido_dic: bytes = await diccionario.read()

    if len(contenido_dic) == 0:
        raise HTTPException(status_code=400, detail="El archivo diccionario está vacío.")

    df_dic = _leer_dataframe(contenido_dic, tipo_dic)

    if len(df_dic.columns) < 2:
        raise HTTPException(status_code=400, detail="El diccionario debe tener exactamente 2 columnas: nombre_tecnico y descripcion.")
    if len(df_dic.columns) > 2:
        raise HTTPException(status_code=400, detail=f"El diccionario tiene {len(df_dic.columns)} columnas. Solo se permiten 2.")
    if len(df_dic) == 0:
        raise HTTPException(status_code=400, detail="El diccionario no tiene filas de datos.")

    col_tecnica, col_descripcion = df_dic.columns[0], df_dic.columns[1]
    try:
        mapa_dic = {
            str(row[col_tecnica]).strip().lower(): str(row[col_descripcion]).strip()
            for _, row in df_dic.iterrows()
        }
    except Exception:
        raise HTTPException(status_code=400, detail="No se pudo leer el contenido del diccionario.")

    # ── Con archivos de datos: clasificar por archivo + diccionario ──
    if archivos:
        detectados_totales: list[dict] = []
        pendientes_totales: list[dict] = []
        total_columnas = 0
        errores: list[dict] = []
        archivos_procesados: list[str] = []

        for archivo in archivos:
            nombre = archivo.filename or "sin_nombre"
            try:
                tipo = _detectar_tipo_archivo(nombre)
            except HTTPException as e:
                errores.append({"archivo": nombre, "error": e.detail})
                continue
            contenido: bytes = await archivo.read()
            if len(contenido) == 0:
                errores.append({"archivo": nombre, "error": "El archivo está vacío."})
                continue
            if len(contenido) > TAMANO_MAXIMO:
                errores.append({"archivo": nombre, "error": "Supera el tamaño máximo (5 MB)."})
                continue
            try:
                columnas = (
                    leer_columnas_csv(contenido) if tipo == "csv"
                    else leer_columnas_excel(contenido)
                )
            except ValueError as e:
                errores.append({"archivo": nombre, "error": str(e)})
                continue

            resultado = clasificar_columnas(columnas)
            for campo in resultado["detectados"]:
                campo["archivo_origen"] = nombre
            for campo in resultado["pendientes"]:
                campo["archivo_origen"] = nombre
            detectados_totales.extend(resultado["detectados"])
            pendientes_totales.extend(resultado["pendientes"])
            total_columnas += len(columnas)
            archivos_procesados.append(nombre)

        if not archivos_procesados and errores:
            raise HTTPException(
                status_code=400,
                detail="Ningún archivo pudo procesarse. "
                       + "; ".join(e["error"] for e in errores),
            )

        pendientes_reclasificados: list[dict] = []
        for campo in pendientes_totales:
            col = campo["nombre_columna"]
            descripcion = mapa_dic.get(col.lower())
            if descripcion:
                resultado_desc = clasificar_columnas([descripcion])
                if resultado_desc["detectados"]:
                    clasificado = resultado_desc["detectados"][0]
                    detectados_totales.append({
                        "nombre_columna":    col,
                        "tipo":              clasificado["tipo"],
                        "categoria_tematica": clasificado.get("categoria_tematica", "Otros"),
                        "origen":            "diccionario",
                        "descripcion":       descripcion,
                        "archivo_origen":    campo.get("archivo_origen"),
                    })
                else:
                    pendientes_reclasificados.append(campo)
            else:
                pendientes_reclasificados.append(campo)

        respuesta = {
            "detectados":     detectados_totales,
            "pendientes":     pendientes_reclasificados,
            "total_columnas": total_columnas,
            "resumen": {
                "personales":     sum(1 for d in detectados_totales if d["tipo"] == "PERSONAL"),
                "sensibles":      sum(1 for d in detectados_totales if d["tipo"] == "SENSIBLE"),
                "sin_clasificar": len(pendientes_reclasificados),
            },
        }
        if len(archivos) > 1:
            respuesta["archivos"] = archivos_procesados
        if errores:
            respuesta["errores"] = errores
        return respuesta

    # ── Sin archivos: usar nombres técnicos del diccionario ──
    columnas_datos = [str(row[col_tecnica]).strip() for _, row in df_dic.iterrows()]

    resultado_n1  = clasificar_columnas(columnas_datos)
    detectados    = resultado_n1["detectados"]
    pendientes_n1 = [p["nombre_columna"] for p in resultado_n1["pendientes"]]

    pendientes_final: list[dict] = []
    for col in pendientes_n1:
        descripcion = mapa_dic.get(col.lower())
        if descripcion:
            resultado_desc = clasificar_columnas([descripcion])
            if resultado_desc["detectados"]:
                clasificado = resultado_desc["detectados"][0]
                detectados.append({
                    "nombre_columna":     col,
                    "tipo":               clasificado["tipo"],
                    "categoria_tematica": clasificado.get("categoria_tematica", "Otros"),
                    "origen":             "diccionario",
                    "descripcion":        descripcion,
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

# ─────────────────────────────────────────────────────────────────────────────
# Agregar al final de backend/app/routers/analisis.py
# ─────────────────────────────────────────────────────────────────────────────
from pydantic import BaseModel

class ConexionBDRequest(BaseModel):
    motor:      str          # 'mysql' | 'postgresql' | 'sqlserver'
    host:       str
    puerto:     int
    base_datos: str
    usuario:    str
    password:   str
    tablas:     list[str] | None = None
    diccionario: dict[str, str] | None = None  # {nombre_columna: descripcion}


def _crear_url_conexion(motor: str, host: str, puerto: int,
                         base_datos: str, usuario: str, password: str) -> str:
    if motor == "mysql":
        return f"mysql+pymysql://{usuario}:{password}@{host}:{puerto}/{base_datos}?charset=utf8mb4"
    elif motor == "postgresql":
        return f"postgresql+psycopg2://{usuario}:{password}@{host}:{puerto}/{base_datos}"
    elif motor == "sqlserver":
        return (
            f"mssql+pyodbc://{usuario}:{password}@{host}:{puerto}/{base_datos}"
            "?driver=ODBC+Driver+17+for+SQL+Server"
        )
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Motor '{motor}' no soportado. Usa: mysql, postgresql, sqlserver"
        )


def _engine_temporal(url: str):
    from sqlalchemy import create_engine
    from sqlalchemy.pool import NullPool
    return create_engine(
        url,
        poolclass=NullPool,
        connect_args={"connect_timeout": 10},
    )


@router.post("/conexion/probar")
async def probar_conexion(
    datos: ConexionBDRequest,
    _usuario=Depends(obtener_usuario_actual),
):
    """
    Verifica que la conexión es válida y devuelve la lista de tablas.
    Las credenciales NUNCA se loggean ni se guardan.
    """
    from sqlalchemy import inspect as sa_inspect

    url = _crear_url_conexion(
        datos.motor, datos.host, datos.puerto,
        datos.base_datos, datos.usuario, datos.password
    )
    engine = None
    try:
        engine = _engine_temporal(url)
        with engine.connect():          # solo verifica que abre conexión
            inspector = sa_inspect(engine)
            tablas = inspector.get_table_names()
        return {"ok": True, "tablas": tablas}

    except HTTPException:
        raise

    except Exception as exc:
        msg = str(exc).lower()
        # Mensajes amigables para los errores más comunes
        if "access denied" in msg or "authentication" in msg or "password" in msg:
            raise HTTPException(
                status_code=401,
                detail="Credenciales incorrectas. Verifica usuario y contraseña."
            )
        if "can't connect" in msg or "connection refused" in msg or "timed out" in msg:
            raise HTTPException(
                status_code=503,
                detail="No se pudo alcanzar el servidor. Verifica host, puerto y que el servidor esté activo."
            )
        if "unknown database" in msg or "does not exist" in msg:
            raise HTTPException(
                status_code=404,
                detail=f"La base de datos '{datos.base_datos}' no existe en ese servidor."
            )
        raise HTTPException(
            status_code=500,
            detail="Error al conectar con la base de datos."
        )
    finally:
        if engine:
            engine.dispose()   # cierra pool inmediatamente, no queda nada abierto


@router.post("/conexion/columnas")
async def obtener_columnas_bd(
    datos: ConexionBDRequest,
    _usuario=Depends(obtener_usuario_actual),
):
    """
    Devuelve los nombres de columnas de las tablas seleccionadas,
    sin clasificarlas. Sirve para que el frontend muestre la tabla
    editable del diccionario antes de analizar.
    """
    from sqlalchemy import inspect as sa_inspect

    if not datos.tablas:
        raise HTTPException(status_code=400, detail="Debes indicar al menos una tabla.")

    url = _crear_url_conexion(
        datos.motor, datos.host, datos.puerto,
        datos.base_datos, datos.usuario, datos.password
    )
    engine = None
    try:
        engine = _engine_temporal(url)
        with engine.connect():
            inspector = sa_inspect(engine)
            tablas_disponibles = inspector.get_table_names()
            columnas = []
            for nombre_tabla in datos.tablas:
                if nombre_tabla not in tablas_disponibles:
                    raise HTTPException(
                        status_code=404,
                        detail=f"La tabla '{nombre_tabla}' no existe en la base de datos."
                    )
                for col in inspector.get_columns(nombre_tabla):
                    columnas.append({"nombre": col["name"], "tabla_origen": nombre_tabla})
        return {"columnas": columnas}
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Error al leer columnas de la base de datos.")
    finally:
        if engine:
            engine.dispose()


@router.post("/conexion")
async def analizar_conexion_bd(
    datos: ConexionBDRequest,
    _usuario=Depends(obtener_usuario_actual),
):
    
    """
    Conecta a la BD del cliente, extrae los nombres de columnas de cada tabla
    indicada, dsp los clasifica con el mismo algoritmo que /archivo y devuelve
    el resultado combinado de todas las tablas. Cada campo (detectado o
    pendiente) lleva "tabla_origen" para saber de qué tabla viene.
    Y las credenciales NUNCA se loggean ni se guardan.
    """
    from sqlalchemy import inspect as sa_inspect

    if not datos.tablas:
        raise HTTPException(
            status_code=400,
            detail="Debes indicar al menos una tabla a analizar."
        )

    url = _crear_url_conexion(
        datos.motor, datos.host, datos.puerto,
        datos.base_datos, datos.usuario, datos.password
    )

    # En estos acumuladores se van juntando los CAMPOS de todas las TABLAS.
    detectados_totales = []
    pendientes_totales = []
    total_columnas = 0

    engine = None
    try:
        engine = _engine_temporal(url)
        with engine.connect():
            inspector = sa_inspect(engine)
            tablas_disponibles = inspector.get_table_names()

            # Se recorre cada tabla seleccionada y se etiqueta cada campo
            # con su tabla de origen (tabla_origen), para que el frontend
            # pueda agruparlos/filtrarlos en AsignacionCampos.
            for nombre_tabla in datos.tablas:
                if nombre_tabla not in tablas_disponibles:
                    raise HTTPException(
                        status_code=404,
                        detail=f"La tabla '{nombre_tabla}' no existe en la base de datos."
                    )

                columnas_raw = inspector.get_columns(nombre_tabla)
                columnas = [col["name"] for col in columnas_raw]

                if not columnas:
                    raise HTTPException(
                        status_code=400,
                        detail=f"La tabla '{nombre_tabla}' no tiene columnas."
                    )

                resultado = clasificar_columnas(columnas)

                for campo in resultado["detectados"]:
                    campo["tabla_origen"] = nombre_tabla
                for campo in resultado["pendientes"]:
                    campo["tabla_origen"] = nombre_tabla

                detectados_totales.extend(resultado["detectados"])
                pendientes_totales.extend(resultado["pendientes"])
                total_columnas += len(columnas)

    except HTTPException:
        raise

    except Exception as exc:
        msg = str(exc).lower()
        if "access denied" in msg or "authentication" in msg:
            raise HTTPException(
                status_code=401,
                detail="Credenciales incorrectas. Verifica usuario y contraseña."
            )
        if "can't connect" in msg or "connection refused" in msg or "timed out" in msg:
            raise HTTPException(
                status_code=503,
                detail="No se pudo alcanzar el servidor."
            )
        raise HTTPException(
            status_code=500,
            detail="Error al analizar la base de datos."
        )
    finally:
        if engine:
            engine.dispose()

    if datos.diccionario:
        mapa_dic = {k.strip().lower(): v.strip() for k, v in datos.diccionario.items() if v.strip()}
        pendientes_reclasificados = []
        for campo in pendientes_totales:
            col = campo["nombre_columna"]
            descripcion = mapa_dic.get(col.lower())
            if descripcion:
                resultado_desc = clasificar_columnas([descripcion])
                if resultado_desc["detectados"]:
                    clasificado = resultado_desc["detectados"][0]
                    detectados_totales.append({
                        "nombre_columna":    col,
                        "tipo":              clasificado["tipo"],
                        "categoria_tematica": clasificado.get("categoria_tematica", "Otros"),
                        "origen":            "diccionario",
                        "descripcion":       descripcion,
                        "tabla_origen":      campo.get("tabla_origen"),
                    })
                else:
                    pendientes_reclasificados.append(campo)
            else:
                pendientes_reclasificados.append(campo)
        pendientes_totales = pendientes_reclasificados

    return {
        "tablas":         datos.tablas,
        "detectados":     detectados_totales,
        "pendientes":     pendientes_totales,
        "total_columnas": total_columnas,
        "resumen": {
            "personales":     sum(1 for d in detectados_totales if d["tipo"] == "PERSONAL"),
            "sensibles":      sum(1 for d in detectados_totales if d["tipo"] == "SENSIBLE"),
            "sin_clasificar": len(pendientes_totales),
        },
    }