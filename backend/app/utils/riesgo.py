# Motor de riesgo: metodología AEPD adaptada a Ley 21.719
#
# Calcula el riesgo de un tratamiento en 3 pasos:
# calcular_probabilidad()   --> ¿qué tan probable es un incidente? (BAJA/MEDIA/ALTA)
# calcular_impacto()        --> si ocurre, ¿qué tan grave es?     (BAJO/MEDIO/ALTO)
# determinar_nivel_riesgo() --> cruza ambos en una matriz 3×3    (BAJO/MEDIO/ALTO)
#
# "Sube un nivel" significa: BAJO→MEDIO o MEDIO→ALTO (nunca pasa de ALTO).



def calcular_probabilidad(tratamiento) -> str:
    if tratamiento.datos_sensibles: # Si hay datos sensibles, entonces la probabilidad pasa a ser ALTA directo
        return "ALTA"

    nivel = "BAJA"

    if tratamiento.destinatarios: # Si se comparten datos con 3ros, entonces sube un nivel
        nivel = "MEDIA"


    if tratamiento.sale_extranjero: # si los datos al extranjero, entonces sube un nivel
        nivel = "ALTA" if nivel == "MEDIA" else "MEDIA"


    # getattr evita error si el tratamiento no tiene detalle_extendido (tratamientos viejos)
    detalle_ext = getattr(tratamiento, "detalle_extendido", None) 
    dest_int = getattr(detalle_ext, "destinatarios_internacionales", None) if detalle_ext else None # si tiene destinatarios internacionales sube un nivel
    if dest_int and dest_int.strip():
        nivel = "ALTA" if nivel == "MEDIA" else "MEDIA"

    return nivel


def calcular_impacto(tratamiento) -> str:
    if tratamiento.datos_sensibles: # si tiene datos sensibles, entonces el impacto pasa a ser alto
        return "ALTO"


    detalle_ext = getattr(tratamiento, "detalle_extendido", None)
    if detalle_ext and getattr(detalle_ext, "incluye_nna", False): # si incluye datos de menores (NNA), entonces pasa a ser alto
        return "ALTO" # de hecho, la ley 21.719 Art. 16 bis los trata como categoría especial

    nivel = "BAJO"

    # si usa algoritmos o ia para decidir cosas sobre personas, sube un nivel
    if tratamiento.decisiones_automatizadas:
        nivel = "MEDIO"

    # Si tiene campos identificadores fuertes (RUT, fecha nacimiento), entonces sube un nivel
    campos = getattr(tratamiento, "campos", None) or getattr(tratamiento, "campos_detectados", None) or []
    tiene_dato_identificador = any(
        c.nombre_columna.lower() in ("rut", "fecha_nacimiento", "fecha_nac")
        for c in campos
    )
    if tiene_dato_identificador:
        nivel = "ALTO" if nivel == "MEDIO" else "MEDIO"

    # Si no se declaró ninguna medida de seguridad, entonces sube un nivel
    # porque eso quiere decir que no tiene cifrado, backups, nada, entonces hay más daño posible ante brecha
    if not tratamiento.medidas_seguridad:
        nivel = "ALTO" if nivel == "MEDIO" else "MEDIO"

    return nivel


# y acá es donde se cruza la probabilidad * impacto en la matriz 3×3 y esto nos da el nivel final del riesgo
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