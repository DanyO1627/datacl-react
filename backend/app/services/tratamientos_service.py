from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session, joinedload

from app import models
from app.schemas import TratamientoCrear, TratamientoEditar
from app.utils.riesgo import calcular_probabilidad, calcular_impacto, determinar_nivel_riesgo
from app.utils.analisis import generar_texto_categoria


def _determinar_estado(datos) -> str:
    """COMPLETO solo si los 5 campos clave del RAT están rellenos."""
    campos_clave = [
        datos.finalidad,
        datos.base_legal,
        datos.plazo_conservacion,
        datos.destinatarios,
        datos.medidas_seguridad,
    ]
    return "COMPLETO" if all(campos_clave) else "PENDIENTE"


def crear_tratamiento(
    db: Session,
    datos: TratamientoCrear,
    organizacion_id: int,
) -> models.Tratamiento:
    try:
        probabilidad = calcular_probabilidad(datos)
        impacto = calcular_impacto(datos)
        nivel_riesgo = determinar_nivel_riesgo(probabilidad, impacto)

        estado_final = "BORRADOR" if datos.estado == "BORRADOR" else _determinar_estado(datos)
        nuevo = models.Tratamiento(
            organizacion_id=organizacion_id,
            nombre=datos.nombre,
            finalidad=datos.finalidad,
            base_legal=datos.base_legal,
            datos_sensibles=datos.datos_sensibles,
            destinatarios=datos.destinatarios,
            plazo_conservacion=datos.plazo_conservacion,
            plazo_otro=datos.plazo_otro,
            medidas_seguridad=datos.medidas_seguridad,
            sale_extranjero=datos.sale_extranjero,
            decisiones_automatizadas=datos.decisiones_automatizadas,
            estado=estado_final,
            probabilidad=probabilidad,
            impacto=impacto,
            nivel_riesgo=nivel_riesgo,
            fecha_evaluacion=datetime.now(),
        )
        db.add(nuevo)
        db.flush()  # obtenemos el ID sin hacer commit todavía

        for campo in datos.campos_detectados:
            db.add(models.CampoRat(
                tratamiento_id=nuevo.id,
                nombre_columna=campo.nombre_columna,
                tipo_dato=campo.tipo_dato,
                es_sensible=campo.es_sensible,
                fuente=campo.fuente,
            ))

        # Siempre crear DetalleRat (si no vienen datos, queda con null)
        detalle_campos = datos.detalle.model_dump() if datos.detalle else {}

        # Auto-generar categoria_datos si no viene del frontend pero hay campos con categoría temática
        if not detalle_campos.get("categoria_datos") and datos.campos_detectados:
            campos_con_cat = [
                {"nombre_columna": c.nombre_columna, "categoria_tematica": c.categoria_tematica or "Otros"}
                for c in datos.campos_detectados
                if c.categoria_tematica
            ]
            if campos_con_cat:
                detalle_campos["categoria_datos"] = generar_texto_categoria(campos_con_cat)

        db.add(models.DetalleRat(tratamiento_id=nuevo.id, **detalle_campos))

        if datos.detalle_extendido:
            ext_campos = datos.detalle_extendido.model_dump(exclude_none=True)
            if ext_campos:
                db.add(models.DetalleRatExtendido(tratamiento_id=nuevo.id, **ext_campos))

        # Vincular a sesión de análisis si viene sesion_id
        if datos.sesion_id:
            db.add(models.SesionActividad(
                sesion_id=datos.sesion_id,
                tratamiento_id=nuevo.id,
                campos_usados=datos.campos_usados,
            ))

        db.commit()
        db.refresh(nuevo)
        return nuevo
    except Exception:
        db.rollback()
        raise


def listar_tratamientos(
    db: Session,
    organizacion_id: int,
    nivel_riesgo: Optional[str] = None,
    estado: Optional[str] = None,
) -> list[models.Tratamiento]:
    query = db.query(models.Tratamiento).filter(
        models.Tratamiento.organizacion_id == organizacion_id
    )
    if nivel_riesgo:
        query = query.filter(models.Tratamiento.nivel_riesgo == nivel_riesgo.upper())
    if estado:
        query = query.filter(models.Tratamiento.estado == estado.upper())
    return query.order_by(models.Tratamiento.creado_en.desc()).all()


def obtener_tratamiento_por_id(
    db: Session,
    tratamiento_id: int,
    organizacion_id: int,
) -> models.Tratamiento | None:
    return (
        db.query(models.Tratamiento)
        .options(
            joinedload(models.Tratamiento.detalle),
            joinedload(models.Tratamiento.detalle_extendido),
            joinedload(models.Tratamiento.sesiones_actividad)
            .joinedload(models.SesionActividad.sesion),
        )
        .filter(
            models.Tratamiento.id == tratamiento_id,
            models.Tratamiento.organizacion_id == organizacion_id,
        )
        .first()
    )

# (son funciones _con ese guión bajo porque son de uso interno del sistema _)

# Campos "de contenido" del RAT que se guardan en cada snapshot de versión
# A propósito NO incluye ids, timestamps ni probabilidad/impacto/fecha_evaluacion:
# esos se recalculan SIEMPRE en cada PUT, así que si entraran en el diff (comparación antes/después de las versiones) 
# "guardar sin cambios" generaría una versión falsa.
_CAMPOS_SNAPSHOT_TRATAMIENTO = [
    "nombre", "finalidad", "base_legal", "datos_sensibles", "destinatarios",
    "plazo_conservacion", "plazo_otro", "medidas_seguridad",
    "sale_extranjero", "decisiones_automatizadas",
]

_CAMPOS_SNAPSHOT_DETALLE = [
    "responsable_tratamiento", "es_responsable", "departamento",
    "categorias_titulares", "universo_titulares", "origen_datos", "categoria_datos",
]


# nueva función: junta los campos de Tratamiento + DetalleRat en UN SOLO dict
# plano (sin sub-dict "detalle"), para poder comparar snapshots campo por
# campo y que el historial muestre cada cambio como una pill legible.
def _serializar_tratamiento(tratamiento: models.Tratamiento) -> dict:
    snapshot = {campo: getattr(tratamiento, campo) for campo in _CAMPOS_SNAPSHOT_TRATAMIENTO}
    detalle = tratamiento.detalle
    for campo in _CAMPOS_SNAPSHOT_DETALLE:
        snapshot[campo] = getattr(detalle, campo) if detalle else None
    return snapshot


# nueva función: pasa valores python a texto legible para campos_modificados
# (True/False -> "Sí"/"No", None -> "", el resto a str).
def _formatear_valor(valor) -> str:
    if valor is None:
        return ""
    if isinstance(valor, bool):
        return "Sí" if valor else "No"
    return str(valor)


# nueva función: compara snapshot antes/después campo por campo y devuelve
# solo los que cambiaron, en el formato que espera CampoModificado.
def _comparar_snapshots(antes: dict, despues: dict) -> list[dict]:
    cambios = []
    for campo, valor_despues in despues.items():
        valor_antes = antes.get(campo)
        if valor_antes != valor_despues:
            cambios.append({
                "campo": campo,
                "antes": _formatear_valor(valor_antes),
                "despues": _formatear_valor(valor_despues),
            })
    return cambios


_ETIQUETAS_CAMPOS = {
    "nombre": "Nombre",
    "finalidad": "Finalidad",
    "base_legal": "Base legal",
    "datos_sensibles": "Datos sensibles",
    "destinatarios": "Destinatarios",
    "plazo_conservacion": "Plazo de conservación",
    "plazo_otro": "Plazo (otro)",
    "medidas_seguridad": "Medidas de seguridad",
    "sale_extranjero": "Transferencia internacional",
    "decisiones_automatizadas": "Decisiones automatizadas",
    "nivel_riesgo": "Nivel de riesgo",
    "estado": "Estado",
    "categoria_datos": "Categoría de datos",
    "categorias_titulares": "Categorías de titulares",
    "universo_titulares": "Universo de titulares",
    "origen_datos": "Origen de los datos",
    "responsable_tratamiento": "Responsable",
    "departamento": "Departamento",
    "es_responsable": "Rol del responsable",
}


def _etiqueta_campo(campo: str) -> str:
    return _ETIQUETAS_CAMPOS.get(campo, campo)


def _generar_descripcion_cambio(campos_modificados: list[dict]) -> str:
    nombres = [_etiqueta_campo(c["campo"]) for c in campos_modificados]
    if len(nombres) == 1:
        return f"Se modificó {nombres[0]}"
    if len(nombres) == 2:
        return f"Se modificaron {nombres[0]} y {nombres[1]}"
    return f"Se modificaron {len(nombres)} campos: {', '.join(nombres)}"


def editar_tratamiento(
    db: Session,
    tratamiento_id: int,
    datos: TratamientoEditar,
    organizacion_id: int,
) -> models.Tratamiento | None:
    tratamiento = (
        db.query(models.Tratamiento)
        .options(
            joinedload(models.Tratamiento.detalle),
            joinedload(models.Tratamiento.detalle_extendido),
        )
        .filter(
            models.Tratamiento.id == tratamiento_id,
            models.Tratamiento.organizacion_id == organizacion_id,
        )
        .first()
    )
    if not tratamiento:
        return None

    try:
        # snapshot "antes": se guarda cómo estaba el tratamiento ANTES de aplicar
        # los cambios, para compararlo después y detectar qué campos cambiaron.
        snapshot_antes = _serializar_tratamiento(tratamiento)

        campos_simples = [
            "nombre", "finalidad", "base_legal", "datos_sensibles", "destinatarios",
            "plazo_conservacion", "plazo_otro", "medidas_seguridad", "sale_extranjero", "decisiones_automatizadas",
        ]
        for campo in campos_simples:
            valor = getattr(datos, campo, None)
            if valor is not None:
                setattr(tratamiento, campo, valor)

        if datos.estado is not None:
            tratamiento.estado = datos.estado.upper()

        # El riesgo SIEMPRE LO VAMOS A RECALCULAR después de editar
        tratamiento.probabilidad = calcular_probabilidad(tratamiento)
        tratamiento.impacto = calcular_impacto(tratamiento)
        tratamiento.nivel_riesgo = determinar_nivel_riesgo(tratamiento.probabilidad, tratamiento.impacto)
        tratamiento.fecha_evaluacion = datetime.now()

        if datos.detalle is not None:
            if tratamiento.detalle is None:
                # Tratamientos viejos sin detalle_rat se crean ahora.
                # Se asigna por la relación (no por tratamiento_id a mano) para que
                # tratamiento.detalle quede disponible de inmediato y el snapshot
                # "después" no lo vea como None.
                tratamiento.detalle = models.DetalleRat(**datos.detalle.model_dump())
            else:
                # Y solo se actualizan los campos que llegaron explícitamente
                for campo, valor in datos.detalle.model_dump(exclude_unset=True).items():
                    setattr(tratamiento.detalle, campo, valor)

        if datos.detalle_extendido is not None:
            ext_campos = datos.detalle_extendido.model_dump(exclude_unset=True)
            if tratamiento.detalle_extendido is None:
                tratamiento.detalle_extendido = models.DetalleRatExtendido(**ext_campos)
            else:
                for campo, valor in ext_campos.items():
                    setattr(tratamiento.detalle_extendido, campo, valor)

        db.flush()  # aplica los cambios en memoria antes de tomar el snapshot "después"

        # Historial de versiones: se registra en cualquier estado del tratamiento.
        snapshot_despues = _serializar_tratamiento(tratamiento)

        # Si el usuario indicó quién está editando, se usa ese nombre;
        # si no, se usa el nombre de la organización como respaldo.
        modificado_por = datos.modificado_por.strip() if datos.modificado_por and datos.modificado_por.strip() else None
        if not modificado_por:
            organizacion = (
                db.query(models.Organizacion)
                .filter(models.Organizacion.id == organizacion_id)
                .first()
            )
            modificado_por = organizacion.nombre if organizacion else None

        ultima_version = (
            db.query(models.VersionTratamiento)
            .filter(models.VersionTratamiento.tratamiento_id == tratamiento.id)
            .order_by(models.VersionTratamiento.numero_version.desc())
            .first()
        )

        if ultima_version:
            # Ya existía al menos una versión -> comparamos antes/después
            campos_modificados = _comparar_snapshots(snapshot_antes, snapshot_despues)
            if campos_modificados:
                db.add(models.VersionTratamiento(
                    tratamiento_id=tratamiento.id,
                    numero_version=ultima_version.numero_version + 1,
                    datos_snapshot=snapshot_despues,
                    campos_modificados=campos_modificados,
                    modificado_por=modificado_por,
                    descripcion_cambio=_generar_descripcion_cambio(campos_modificados),
                    nivel_riesgo=tratamiento.nivel_riesgo,
                ))
            # si no hubo cambios reales, no se crea una versión vacía
        else:
            # Primera versión del tratamiento
            db.add(models.VersionTratamiento(
                tratamiento_id=tratamiento.id,
                numero_version=1,
                datos_snapshot=snapshot_despues,
                campos_modificados=[],
                modificado_por=modificado_por,
                descripcion_cambio="Versión inicial del RAT",
                nivel_riesgo=tratamiento.nivel_riesgo,
            ))

        db.commit()
        db.refresh(tratamiento)
        return tratamiento
    except Exception:
        db.rollback()
        raise


def evaluar_riesgo(
    db: Session,
    tratamiento_id: int,
    organizacion_id: int,
) -> models.Tratamiento | None:
    tratamiento = (
        db.query(models.Tratamiento)
        .filter(
            models.Tratamiento.id == tratamiento_id,
            models.Tratamiento.organizacion_id == organizacion_id,
        )
        .first()
    )
    if not tratamiento:
        return None

    tratamiento.probabilidad = calcular_probabilidad(tratamiento)
    tratamiento.impacto = calcular_impacto(tratamiento)
    tratamiento.nivel_riesgo = determinar_nivel_riesgo(tratamiento.probabilidad, tratamiento.impacto)
    tratamiento.fecha_evaluacion = datetime.now()

    db.commit()
    db.refresh(tratamiento)
    return tratamiento


def eliminar_tratamiento(
    db: Session,
    tratamiento_id: int,
    organizacion_id: int,
) -> bool:
    tratamiento = (
        db.query(models.Tratamiento)
        .filter(
            models.Tratamiento.id == tratamiento_id,
            models.Tratamiento.organizacion_id == organizacion_id,
        )
        .first()
    )
    if not tratamiento:
        return False
    db.delete(tratamiento)
    db.commit()
    return True


# ================================================
# Para lectura de los historiales de versiones
# =================================================
# Estas funciones NO verifican que el tratamiento pertenezca a la organización:
# ese chequeo (que cubre el acceso de otra org a una que no es suya) ya lo hace el router 
# llamando primero a la función: 
# obtener_tratamiento_por_id(db, tratamiento_id, organizacion_id).

def obtener_versiones(db: Session, tratamiento_id: int) -> list[models.VersionTratamiento]:
    """Lista todas las versiones de un tratamiento, de la más nueva a la más antigua."""
    return (
        db.query(models.VersionTratamiento)
        .filter(models.VersionTratamiento.tratamiento_id == tratamiento_id)
        .order_by(models.VersionTratamiento.numero_version.desc())
        .all()
    )


def obtener_version_por_numero(
    db: Session,
    tratamiento_id: int,
    numero: int,
) -> models.VersionTratamiento | None:
    """Devuelve una versión puntual (incluye datos_snapshot) o none si no existe."""
    return (
        db.query(models.VersionTratamiento)
        .filter(
            models.VersionTratamiento.tratamiento_id == tratamiento_id,
            models.VersionTratamiento.numero_version == numero,
        )
        .first()
    )
