import os
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session, joinedload
from dotenv import load_dotenv

from app.basededatos import get_db
from app import models
from app.utils.jwt import obtener_usuario_actual
from app.utils.pdf_builder import construir_pdf
from app.schemas import InformeRespuesta, GenerarInformeRequest

load_dotenv()

router = APIRouter(prefix="/informes", tags=["Informes"])

# Carpeta donde se guardan los PDFs — se crea automáticamente si no existe
CARPETA_INFORMES = Path("informes_generados")
CARPETA_INFORMES.mkdir(exist_ok=True)


# ─────────────────────────────────────────────────────────────────────────────
# GROQ — análisis IA
# ─────────────────────────────────────────────────────────────────────────────

def _pedir_analisis_ia(tratamientos: list) -> str | None:
    """
    Llama a Groq con un resumen de los tratamientos y devuelve el análisis.
    Si falla por cualquier motivo devuelve None — el PDF se genera igual.
    """
    try:
        from groq import Groq
        cliente = Groq(api_key=os.getenv("GROQ_API_KEY"))

        resumen = []
        for t in tratamientos:
            resumen.append(
                f"- {t.nombre}: nivel_riesgo={t.nivel_riesgo}, "
                f"probabilidad={t.probabilidad}, impacto={t.impacto}, "
                f"datos_sensibles={t.datos_sensibles}, "
                f"sale_extranjero={t.sale_extranjero}, "
                f"decisiones_automatizadas={t.decisiones_automatizadas}"
            )

        prompt = f"""Eres un especialista en protección de datos personales bajo la Ley 21.719 de Chile (vigente desde 2024), equivalente funcional del RGPD europeo pero con particularidades del sistema jurídico chileno.

Analiza los siguientes tratamientos de datos registrados en el RAT (Registro de Actividades de Tratamiento) de la organización:

{chr(10).join(resumen)}

Para cada tratamiento evalúa:

1. BASE DE LICITUD (Art. 12 Ley 21.719)
   - ¿Qué base de licitud justifica este tratamiento? (consentimiento, contrato, obligación legal, interés legítimo, etc.)
   - Si no es evidente, indicar qué base debería documentarse.

2. NIVEL DE RIESGO Y MEDIDAS
   - Justifica el nivel_riesgo indicado.
   - Si nivel_riesgo es ALTO: señala si corresponde realizar una Evaluación de Impacto (EIPD).
   - Recomendaciones técnicas y organizativas concretas para reducir el riesgo.

3. DATOS SENSIBLES Y CATEGORÍAS ESPECIALES
   - Si datos_sensibles=true: identificar qué categoría especial aplica (salud, biometría, origen étnico, etc.) y las medidas adicionales requeridas por la ley.

4. TRANSFERENCIAS INTERNACIONALES
   - Si sale_extranjero=true: evaluar si el país destino tiene nivel adecuado de protección o si se requieren garantías adicionales.

5. DECISIONES AUTOMATIZADAS
   - Si decisiones_automatizadas=true: evaluar si el titular puede impugnar la decisión y si hay perfilamiento que requiera base legal reforzada.

6. DERECHOS ARSOP
   - Indica si el tratamiento permite al titular ejercer sus derechos de Acceso, Rectificación, Supresión, Oposición y Portabilidad.

Al final incluye:
CONCLUSIÓN GENERAL: nivel de cumplimiento global (ALTO / MEDIO / BAJO), los 3 riesgos más urgentes a resolver y una recomendación prioritaria.

Formato: texto estructurado con encabezados. Sin listas excesivas. Máximo 150 palabras por tratamiento."""

        respuesta = cliente.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=2500,
        )
        return respuesta.choices[0].message.content

    except Exception:
        return None


# ─────────────────────────────────────────────────────────────────────────────
# ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/generar")
def generar_informe(
    datos: GenerarInformeRequest,
    db: Session = Depends(get_db),
    usuario: models.Organizacion = Depends(obtener_usuario_actual),
):
    """
    Genera el informe PDF con los tratamientos seleccionados por el usuario.
    Valida que los IDs recibidos pertenezcan a la organización del token.
    """
    if not datos.ids_tratamientos:
        raise HTTPException(
            status_code=400,
            detail="Selecciona al menos un tratamiento para generar el informe.",
        )

    tratamientos = (
        db.query(models.Tratamiento)
        .options(
            joinedload(models.Tratamiento.detalle),
            joinedload(models.Tratamiento.campos),
        )
        .filter(
            models.Tratamiento.id.in_(datos.ids_tratamientos),
            models.Tratamiento.organizacion_id == usuario.id,
        )
        .order_by(models.Tratamiento.creado_en.desc())
        .all()
    )

    if not tratamientos:
        raise HTTPException(
            status_code=400,
            detail="No se encontraron tratamientos válidos para generar el informe.",
        )

    ahora = datetime.now()
    nombre_seguro = usuario.nombre.replace(" ", "_").replace("/", "-")
    fecha_str     = ahora.strftime("%Y%m%d_%H%M%S")
    nombre_pdf    = f"RAT_{nombre_seguro}_{fecha_str}.pdf"
    ruta_pdf      = CARPETA_INFORMES / nombre_pdf

    ruta_pdf.write_bytes(construir_pdf(usuario, tratamientos))

    nuevo_informe = models.Informe(
        organizacion_id=usuario.id,
        contenido_ia=None,
        ruta_pdf=str(ruta_pdf),
        num_tratamientos=len(tratamientos),
    )
    db.add(nuevo_informe)
    db.commit()
    db.refresh(nuevo_informe)

    return {
        "id":          nuevo_informe.id,
        "generado_en": nuevo_informe.generado_en,
        "tiene_ia":    False,
        "ruta_pdf":    str(ruta_pdf),
    }


@router.post("/{informe_id}/analizar")
def analizar_informe_ia(
    informe_id: int,
    db: Session = Depends(get_db),
    usuario: models.Organizacion = Depends(obtener_usuario_actual),
):
    """
    Agrega análisis IA a un informe ya generado.
    Llama a Groq y guarda el análisis en BD. El PDF queda sin cambios.
    Devuelve 502 si Groq no responde, para que el frontend informe al usuario.
    """
    informe = db.query(models.Informe).filter(
        models.Informe.id == informe_id,
        models.Informe.organizacion_id == usuario.id,
    ).first()

    if not informe:
        raise HTTPException(status_code=404, detail="Informe no encontrado.")

    tratamientos = (
        db.query(models.Tratamiento)
        .options(
            joinedload(models.Tratamiento.detalle),
            joinedload(models.Tratamiento.campos),
        )
        .filter(models.Tratamiento.organizacion_id == usuario.id)
        .order_by(models.Tratamiento.creado_en.desc())
        .all()
    )

    contenido_ia = _pedir_analisis_ia(tratamientos)

    if contenido_ia is None:
        raise HTTPException(
            status_code=502,
            detail="No se pudo obtener el análisis de IA. Verifica tu conexión e intenta nuevamente.",
        )

    informe.contenido_ia = contenido_ia
    db.commit()
    db.refresh(informe)

    return {
        "id":           informe.id,
        "generado_en":  informe.generado_en,
        "tiene_ia":     True,
        "contenido_ia": contenido_ia,
    }


@router.get("", response_model=list[InformeRespuesta])
def listar_informes(
    db: Session = Depends(get_db),
    usuario: models.Organizacion = Depends(obtener_usuario_actual),
):
    """
    Lista los informes de la organización autenticada.
    Ordenados por fecha descendente. Lista vacía si no hay ninguno.
    Calcula num_tratamientos contando los tratamientos actuales de la org.
    """
    informes = db.query(models.Informe).filter(
        models.Informe.organizacion_id == usuario.id
    ).order_by(models.Informe.generado_en.desc()).all()

    return [
        {
            "id":               inf.id,
            "generado_en":      inf.generado_en,
            "tiene_ia":         inf.contenido_ia is not None,
            "ruta_pdf":         inf.ruta_pdf,
            "num_tratamientos": inf.num_tratamientos,
        }
        for inf in informes
    ]


@router.get("/{informe_id}/analisis")
def obtener_analisis_ia(
    informe_id: int,
    db: Session = Depends(get_db),
    usuario: models.Organizacion = Depends(obtener_usuario_actual),
):
    """Devuelve el contenido_ia de un informe. 404 si no existe o no tiene análisis."""
    informe = db.query(models.Informe).filter(
        models.Informe.id == informe_id,
        models.Informe.organizacion_id == usuario.id,
    ).first()

    if not informe:
        raise HTTPException(status_code=404, detail="Informe no encontrado.")

    if not informe.contenido_ia:
        raise HTTPException(status_code=404, detail="Este informe no tiene análisis de IA.")

    return {"contenido_ia": informe.contenido_ia}


@router.get("/{informe_id}/descargar")
def descargar_informe(
    informe_id: int,
    db: Session = Depends(get_db),
    usuario: models.Organizacion = Depends(obtener_usuario_actual),
):
    """
    Descarga el PDF de un informe ya generado.
    — 404 si el informe no existe o pertenece a otra organización.
    — 404 si el archivo PDF ya no existe en disco.
    — content_disposition_type="attachment" fuerza la descarga en el navegador.
    """
    informe = db.query(models.Informe).filter(
        models.Informe.id == informe_id,
        models.Informe.organizacion_id == usuario.id,
    ).first()

    if not informe:
        raise HTTPException(status_code=404, detail="Informe no encontrado.")

    if not informe.ruta_pdf or not Path(informe.ruta_pdf).exists():
        raise HTTPException(
            status_code=404,
            detail="El archivo PDF no existe en el servidor. Es posible que haya sido eliminado.",
        )

    return FileResponse(
        path=informe.ruta_pdf,
        media_type="application/pdf",
        filename=Path(informe.ruta_pdf).name,
        content_disposition_type="attachment",  # fuerza descarga, no visualización inline
    )

# ── Agregar esto al FINAL de backend/app/routers/informes.py ──

@router.delete("/{informe_id}")
def eliminar_informe(
    informe_id: int,
    db: Session = Depends(get_db),
    usuario: models.Organizacion = Depends(obtener_usuario_actual),
):
    """
    Elimina un informe y su PDF del disco.
    — 404 si no existe o pertenece a otra organización.
    """
    informe = db.query(models.Informe).filter(
        models.Informe.id == informe_id,
        models.Informe.organizacion_id == usuario.id,
    ).first()

    if not informe:
        raise HTTPException(status_code=404, detail="Informe no encontrado.")

    # Eliminar el PDF del disco si existe
    if informe.ruta_pdf:
        ruta = Path(informe.ruta_pdf)
        if ruta.exists():
            ruta.unlink()

    db.delete(informe)
    db.commit()

    return {"mensaje": "Informe eliminado correctamente.", "id": informe_id}