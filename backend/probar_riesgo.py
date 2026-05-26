from app.utils.riesgo import calcular_probabilidad, calcular_impacto, determinar_nivel_riesgo


class Tratamiento:
    def __init__(self, datos_sensibles, destinatarios, sale_extranjero, decisiones_automatizadas, campos=[]):
        self.datos_sensibles          = datos_sensibles
        self.destinatarios            = destinatarios
        self.sale_extranjero          = sale_extranjero
        self.decisiones_automatizadas = decisiones_automatizadas
        self.campos                   = campos


class Campo:
    def __init__(self, nombre_columna):
        self.nombre_columna = nombre_columna


TERCERO = "Empresa ABC"


def verificar(id, t, p_esp, i_esp, r_esp):
    p = calcular_probabilidad(t)
    i = calcular_impacto(t)
    r = determinar_nivel_riesgo(p, i)
    ok = p == p_esp and i == i_esp and r == r_esp
    estado = "OK" if ok else f"FALLO (esperado P={p_esp} I={i_esp} R={r_esp})"
    print(f"{id}: P={p}, I={i}, Riesgo={r} → {estado}")


print("=" * 60)
print("CASOS SIN CAMPOS DE BD (creación / factores declarados)")
print("=" * 60)

# T-01: sin ningún factor → BAJO
verificar("T-01",
    Tratamiento(False, "", False, False),
    "BAJA", "BAJO", "BAJO"
)

# T-02: solo destinatarios → BAJO
verificar("T-02",
    Tratamiento(False, TERCERO, False, False),
    "MEDIA", "BAJO", "BAJO"
)

# T-03: solo sale_extranjero → BAJO
verificar("T-03",
    Tratamiento(False, "", True, False),
    "MEDIA", "BAJO", "BAJO"
)

# T-04: destinatarios + sale_extranjero → MEDIO
verificar("T-04",
    Tratamiento(False, TERCERO, True, False),
    "ALTA", "BAJO", "MEDIO"
)

# T-05: solo decisiones_automatizadas → BAJO
verificar("T-05",
    Tratamiento(False, "", False, True),
    "BAJA", "MEDIO", "BAJO"
)

# T-06: destinatarios + decisiones_automatizadas → MEDIO
verificar("T-06",
    Tratamiento(False, TERCERO, False, True),
    "MEDIA", "MEDIO", "MEDIO"
)

# T-07: destinatarios + sale_extranjero + decisiones_automatizadas → ALTO
verificar("T-07",
    Tratamiento(False, TERCERO, True, True),
    "ALTA", "MEDIO", "ALTO"
)

# T-08: solo datos_sensibles → ALTO (ambas dimensiones al máximo)
verificar("T-08",
    Tratamiento(True, "", False, False),
    "ALTA", "ALTO", "ALTO"
)

# T-09: datos_sensibles + todos los factores → ALTO (nada puede subirlo más)
verificar("T-09",
    Tratamiento(True, TERCERO, True, True),
    "ALTA", "ALTO", "ALTO"
)

print()
print("=" * 60)
print("CASOS CON CAMPOS DE BD (RUT / fecha_nacimiento detectados)")
print("=" * 60)

rut_campo         = [Campo("rut")]
fecha_nac_campo   = [Campo("fecha_nacimiento")]

# T-10: solo RUT en campos → BAJO (P sigue baja, I sube a MEDIO)
verificar("T-10",
    Tratamiento(False, "", False, False, rut_campo),
    "BAJA", "MEDIO", "BAJO"
)

# T-11: RUT + decisiones_automatizadas → MEDIO (I llega a ALTO)
verificar("T-11",
    Tratamiento(False, "", False, True, rut_campo),
    "BAJA", "ALTO", "MEDIO"
)

# T-12: destinatarios + RUT → MEDIO (P=MEDIA, I=MEDIO)
verificar("T-12",
    Tratamiento(False, TERCERO, False, False, rut_campo),
    "MEDIA", "MEDIO", "MEDIO"
)

# T-13: fecha_nacimiento en campos (mismo efecto que RUT) → BAJO
verificar("T-13",
    Tratamiento(False, "", False, False, fecha_nac_campo),
    "BAJA", "MEDIO", "BAJO"
)
