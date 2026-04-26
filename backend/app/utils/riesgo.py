def calcular_probabilidad(tratamiento) -> str:
    """
    Calcula la probabilidad de daño según RF-07 (metodología AEPD).
    Factores de escalación:
      datos_sensibles=True  → ALTA directamente
      destinatarios no vacío → sube un nivel
      sale_extranjero=True  → sube un nivel
      Sin factores          → BAJA
    Retorna: BAJA, MEDIA o ALTA
    """
    if tratamiento.datos_sensibles:
        return "ALTA"

    nivel = "BAJA"
    if tratamiento.destinatarios:        # tiene terceros
        nivel = "MEDIA"
    if tratamiento.sale_extranjero:
        nivel = "ALTA" if nivel == "MEDIA" else "MEDIA"

    return nivel


def calcular_impacto(tratamiento) -> str:
    """
    Calcula el impacto potencial según RF-07 (metodología AEPD).
    Factores de escalación:
      datos_sensibles=True          → ALTO directamente
      decisiones_automatizadas=True → sube un nivel
      tiene RUT o fecha_nacimiento  → sube un nivel (se detecta via campos_rat)
      Sin factores                  → BAJO
    Retorna: BAJO, MEDIO o ALTO
    """
    if tratamiento.datos_sensibles:
        return "ALTO"

    nivel = "BAJO"
    if tratamiento.decisiones_automatizadas:
        nivel = "MEDIO"

    # Verificar si tiene campos RUT o fecha_nacimiento detectados
    # Solo si la relación campos está cargada (puede ser None si no se hizo join)
    campos = getattr(tratamiento, "campos", None) or []
    tiene_dato_identificador = any(
        c.nombre_columna.lower() in ("rut", "fecha_nacimiento", "fecha_nac")
        for c in campos
    )
    if tiene_dato_identificador:
        nivel = "ALTO" if nivel == "MEDIO" else "MEDIO"

    return nivel


def determinar_nivel_riesgo(probabilidad: str, impacto: str) -> str:
    """
    Determina el nivel de riesgo final combinando probabilidad e impacto.
    Probabilidad: ALTA/MEDIA/BAJA
    Impacto:      ALTO/MEDIO/BAJO
    Retorna:      ALTO/MEDIO/BAJO
    """
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