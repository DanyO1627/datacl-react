import os
import re
from functools import lru_cache
from pathlib import Path

RUTA_LEY = Path(__file__).parent.parent / "assets" / "ley_21719.pdf"

# Artículos de la Ley 21.719 relevantes para el análisis de tratamientos:
# decisiones automatizadas (8 bis), bases de licitud (12, 13), deber de
# medidas de seguridad (14 quinquies), EIPD (15 ter), datos sensibles y sus
# categorías especiales (16 y derivados) y transferencias internacionales (27, 28).
ARTICULOS_RELEVANTES = {
    "8 bis", "12", "13", "14 quinquies", "15 ter",
    "16", "16 bis", "16 ter", "16 quáter", "16 quinquies", "16 sexies",
    "27", "28",
}


@lru_cache(maxsize=1)
def _texto_ley() -> str | None:
    """
    Extrae y cachea los artículos relevantes de la Ley 21.719 desde el PDF.
    Devuelve None si el archivo no existe o falla la extracción — el análisis
    IA sigue funcionando sin el texto legal como contexto adicional.
    """
    if not RUTA_LEY.exists():
        return None

    try:
        import pdfplumber
        with pdfplumber.open(RUTA_LEY) as pdf:
            texto_completo = "\n".join(p.extract_text() or "" for p in pdf.pages)
    except Exception:
        return None

    # El número de artículo a veces va seguido de "°" (símbolo de grado) antes
    # del sufijo en latín (bis, ter, quáter, etc.), p. ej. "Artículo 8° bis.-".
    encabezados = list(re.finditer(
        r"(?m)^Art[íi]culo\s+(\d+)\s*°?\s*(\w+)?\.-", texto_completo
    ))

    fragmentos = []
    for i, encabezado in enumerate(encabezados):
        numero, sufijo = encabezado.group(1), encabezado.group(2)
        clave = f"{numero} {sufijo}" if sufijo else numero
        if clave not in ARTICULOS_RELEVANTES:
            continue
        inicio = encabezado.start()
        fin = encabezados[i + 1].start() if i + 1 < len(encabezados) else len(texto_completo)
        fragmentos.append(texto_completo[inicio:fin].strip())

    return "\n\n".join(fragmentos) if fragmentos else None


def pedir_analisis_ia(tratamientos: list) -> str | None:
    """
    Llama a Groq con un resumen de los tratamientos y devuelve el análisis.
    Si falla por cualquier motivo devuelve None — el PDF se genera igual.
    """
    try:
        from groq import Groq
        cliente = Groq(api_key=os.getenv("GROQ_API_KEY"))

        resumen = []
        for t in tratamientos:
            linea = (
                f"- {t.nombre} | base_legal={t.base_legal or 'no especificada'}"
                f" | nivel_riesgo={t.nivel_riesgo}"
                f" | datos_sensibles={t.datos_sensibles}"
                f" | sale_extranjero={t.sale_extranjero}"
                f" | decisiones_automatizadas={t.decisiones_automatizadas}"
                f" | finalidad={t.finalidad or 'no especificada'}"
            )
            resumen.append(linea)

        texto_ley = _texto_ley()
        if texto_ley:
            bloque_ley = f"\nTEXTO LEGAL DE REFERENCIA (extracto de la Ley 21.719):\n{texto_ley}\n"
            instruccion_citas = (
                " Cita únicamente artículos que aparezcan en el TEXTO LEGAL DE"
                " REFERENCIA anterior; no inventes números de artículo."
            )
        else:
            bloque_ley = ""
            instruccion_citas = ""

        prompt = f"""Eres un especialista en protección de datos personales bajo la Ley 21.719 de Chile.

Analiza el RAT de la siguiente organización y entrega un informe ejecutivo útil para su encargado de datos.
{bloque_ley}
TRATAMIENTOS REGISTRADOS:
{chr(10).join(resumen)}

INSTRUCCIONES:
Por cada tratamiento indica en máximo 60 palabras:
- Si la base legal registrada es correcta o debería ajustarse, citando el artículo y letra exactos de la Ley 21.719 que correspondan
- El riesgo principal concreto de este tratamiento específico
- Una medida prioritaria, mencionando el tipo de organización si es relevante

Si nivel_riesgo es ALTO: indica explícitamente si corresponde una evaluación de impacto en protección de datos (EIPD), citando el artículo correspondiente.
Si datos_sensibles=true: menciona la categoría especial (salud, biometría, etc.) y el artículo de la Ley 21.719 que la regula.
Si sale_extranjero=true: señala si requiere garantías adicionales para transferencias internacionales, citando el artículo correspondiente.

Al final, en máximo 80 palabras:
CONCLUSIÓN: cumplimiento global (ALTO/MEDIO/BAJO), los 2 riesgos más urgentes y acción prioritaria.

Sé específico. Evita recomendaciones genéricas que apliquen a cualquier organización.{instruccion_citas}
Formato: encabezado por tratamiento, texto corrido, sin listas."""

        respuesta = cliente.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=2500,
        )
        return respuesta.choices[0].message.content

    except Exception:
        return None
