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

        # Siempre crear DetalleRat — si no vienen datos, queda con nulls
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
        .options(joinedload(models.Tratamiento.detalle))
        .filter(
            models.Tratamiento.id == tratamiento_id,
            models.Tratamiento.organizacion_id == organizacion_id,
        )
        .first()
    )


def editar_tratamiento(
    db: Session,
    tratamiento_id: int,
    datos: TratamientoEditar,
    organizacion_id: int,
) -> models.Tratamiento | None:
    tratamiento = (
        db.query(models.Tratamiento)
        .options(joinedload(models.Tratamiento.detalle))
        .filter(
            models.Tratamiento.id == tratamiento_id,
            models.Tratamiento.organizacion_id == organizacion_id,
        )
        .first()
    )
    if not tratamiento:
        return None

    try:
        campos_simples = [
            "nombre", "finalidad", "base_legal", "datos_sensibles", "destinatarios",
            "plazo_conservacion", "medidas_seguridad", "sale_extranjero", "decisiones_automatizadas",
        ]
        for campo in campos_simples:
            valor = getattr(datos, campo, None)
            if valor is not None:
                setattr(tratamiento, campo, valor)

        if datos.estado is not None:
            tratamiento.estado = datos.estado.upper()

        # El riesgo siempre se recalcula tras editar
        tratamiento.probabilidad = calcular_probabilidad(tratamiento)
        tratamiento.impacto = calcular_impacto(tratamiento)
        tratamiento.nivel_riesgo = determinar_nivel_riesgo(tratamiento.probabilidad, tratamiento.impacto)
        tratamiento.fecha_evaluacion = datetime.now()

        if datos.detalle is not None:
            if tratamiento.detalle is None:
                # Tratamientos viejos sin detalle_rat — se crea ahora
                db.add(models.DetalleRat(
                    tratamiento_id=tratamiento.id,
                    **datos.detalle.model_dump(),
                ))
            else:
                # Solo actualizar los campos que llegaron explícitamente
                for campo, valor in datos.detalle.model_dump(exclude_unset=True).items():
                    setattr(tratamiento.detalle, campo, valor)

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
