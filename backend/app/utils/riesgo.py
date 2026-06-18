# Motor de riesgo: metodología AEPD adaptada a Ley 21.719
#
# Calcula el riesgo de un tratamiento en 3 pasos:
# calcular_probabilidad()   --> ¿qué tan probable es un incidente? (BAJA/MEDIA/ALTA)
# calcular_impacto()        --> si ocurre, ¿qué tan grave es?     (BAJO/MEDIO/ALTO)
# determinar_nivel_riesgo() --> cruza ambos en una matriz 3×3    (BAJO/MEDIO/ALTO)
#
# "Sube un nivel" significa: BAJO→MEDIO o MEDIO→ALTO (nunca pasa de ALTO).

_KEYWORDS_SENSIBLES = (
    "salud", "diagnóstico", "diagnostico", "medicamento",
    "biométric", "biometric", "huella", "facial", "iris",
    "étnic", "etnic", "raza",
    "religión", "religion", "creencia",
    "orientación sexual", "orientacion sexual",
    "opinión polít", "opinion polit", "afiliación",
    "genétic", "genetic",
    "sindical",
)


def _tiene_datos_sensibles(tratamiento) -> bool:
    if tratamiento.datos_sensibles:
        return True
    detalle = getattr(tratamiento, "detalle", None)
    if detalle:
        cat = (getattr(detalle, "categoria_datos", "") or "").lower()
        if any(kw in cat for kw in _KEYWORDS_SENSIBLES):
            return True
    return False


def calcular_probabilidad(tratamiento) -> str:
    if _tiene_datos_sensibles(tratamiento):
        return "ALTA"

    nivel = "BAJA"

    if tratamiento.destinatarios:
        nivel = "MEDIA"

    if tratamiento.sale_extranjero:
        nivel = "ALTA" if nivel == "MEDIA" else "MEDIA"

    detalle_ext = getattr(tratamiento, "detalle_extendido", None)
    dest_int = getattr(detalle_ext, "destinatarios_internacionales", None) if detalle_ext else None
    if dest_int and dest_int.strip():
        nivel = "ALTA" if nivel == "MEDIA" else "MEDIA"

    return nivel


def calcular_impacto(tratamiento) -> str:
    if _tiene_datos_sensibles(tratamiento):
        return "ALTO"

    detalle_ext = getattr(tratamiento, "detalle_extendido", None)
    if detalle_ext and getattr(detalle_ext, "incluye_nna", False):
        return "ALTO"

    nivel = "BAJO"

    if tratamiento.decisiones_automatizadas:
        nivel = "MEDIO"

    campos = getattr(tratamiento, "campos", None) or getattr(tratamiento, "campos_detectados", None) or []
    tiene_dato_identificador = any(
        c.nombre_columna.lower() in ("rut", "fecha_nacimiento", "fecha_nac")
        for c in campos
    )
    if tiene_dato_identificador:
        nivel = "ALTO" if nivel == "MEDIO" else "MEDIO"

    if not tratamiento.medidas_seguridad:
        nivel = "ALTO" if nivel == "MEDIO" else "MEDIO"

    return nivel


def determinar_nivel_riesgo(probabilidad: str, impacto: str) -> str:
    matriz = {
        ("ALTA",  "ALTO"):  "ALTO",
        ("ALTA",  "MEDIO"): "ALTO",
        ("ALTA",  "BAJO"):  "MEDIO",
        ("MEDIA", "ALTO"):  "ALTO",
        ("MEDIA", "MEDIO"): "MEDIO",
        ("MEDIA", "BAJO"):  "BAJO",
        ("BAJA",  "ALTO"):  "MEDIO",
        ("BAJA",  "MEDIO"): "BAJO",
        ("BAJA",  "BAJO"):  "BAJO",
    }
    return matriz.get((probabilidad, impacto), "BAJO")
