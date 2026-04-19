def calcular_probabilidad(tratamiento) -> str:
    """
    Calcula la probabilidad de riesgo según características del tratamiento.
    Retorna: BAJO, MEDIO o ALTO
    """
    puntos = 0

    if tratamiento.datos_sensibles:
        puntos += 2
    if tratamiento.sale_extranjero:
        puntos += 2
    if tratamiento.decisiones_automatizadas:
        puntos += 1
    if not tratamiento.medidas_seguridad:
        puntos += 1
    if not tratamiento.base_legal:
        puntos += 1

    if puntos >= 4:
        return "ALTO"
    elif puntos >= 2:
        return "MEDIO"
    return "BAJO"


def calcular_impacto(tratamiento) -> str:
    """
    Calcula el impacto potencial del tratamiento.
    Retorna: BAJO, MEDIO o ALTO
    """
    puntos = 0

    if tratamiento.datos_sensibles:
        puntos += 2
    if tratamiento.decisiones_automatizadas:
        puntos += 2
    if tratamiento.sale_extranjero:
        puntos += 1
    if not tratamiento.plazo_conservacion:
        puntos += 1

    if puntos >= 4:
        return "ALTO"
    elif puntos >= 2:
        return "MEDIO"
    return "BAJO"


def determinar_nivel_riesgo(probabilidad: str, impacto: str) -> str:
    """
    Determina el nivel de riesgo final combinando probabilidad e impacto.
    """
    matriz = {
        ("ALTO",  "ALTO"):  "ALTO",
        ("ALTO",  "MEDIO"): "ALTO",
        ("ALTO",  "BAJO"):  "MEDIO",
        ("MEDIO", "ALTO"):  "ALTO",
        ("MEDIO", "MEDIO"): "MEDIO",
        ("MEDIO", "BAJO"):  "BAJO",
        ("BAJO",  "ALTO"):  "MEDIO",
        ("BAJO",  "MEDIO"): "BAJO",
        ("BAJO",  "BAJO"):  "BAJO",
    }
    return matriz.get((probabilidad, impacto), "BAJO")
