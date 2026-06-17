"""
Tests de tratamientos, análisis e informes
— CP-07, CP-11~18, CP-19~25, CP-41
"""
import io

from tests.conftest import TRATAMIENTO_COMPLETO, SessionTest
from app.models import Informe


# ── Helpers ───────────────────────────────────────────────────────────────────

def _crear_tratamiento(client, auth_header, override=None):
    payload = {**TRATAMIENTO_COMPLETO, **(override or {})}
    return client.post("/tratamientos", json=payload, headers=auth_header)


# ── CP-07: Crear tratamiento completo → 201 ──────────────────────────────────
def test_cp07_crear_tratamiento(client, auth_header):
    resp = _crear_tratamiento(client, auth_header)
    assert resp.status_code == 201
    body = resp.json()
    assert body["nombre"] == "Registro de clientes"
    assert body["estado"] == "COMPLETO"
    assert body["nivel_riesgo"] in ("BAJO", "MEDIO", "ALTO")


# ── CP-11: Listar tratamientos propios → 200 ─────────────────────────────────
def test_cp11_listar_tratamientos(client, auth_header):
    _crear_tratamiento(client, auth_header)
    _crear_tratamiento(client, auth_header, {"nombre": "Segundo"})
    resp = client.get("/tratamientos", headers=auth_header)
    assert resp.status_code == 200
    assert len(resp.json()) == 2


# ── CP-12: Obtener tratamiento por ID → 200 + datos completos ────────────────
def test_cp12_obtener_tratamiento(client, auth_header):
    tid = _crear_tratamiento(client, auth_header).json()["id"]
    resp = client.get(f"/tratamientos/{tid}", headers=auth_header)
    assert resp.status_code == 200
    body = resp.json()
    assert body["id"] == tid
    assert body["finalidad"] == "Gestión de clientes y facturación"
    assert body["detalle"]["responsable_tratamiento"] == "Juan Pérez"


# ── CP-13: Editar tratamiento → 200 + campo actualizado ──────────────────────
def test_cp13_editar_tratamiento(client, auth_header):
    tid = _crear_tratamiento(client, auth_header).json()["id"]
    resp = client.put(f"/tratamientos/{tid}", json={
        "finalidad": "Finalidad actualizada",
    }, headers=auth_header)
    assert resp.status_code == 200
    assert resp.json()["finalidad"] == "Finalidad actualizada"


# ── CP-14: Filtrar tratamientos por nivel_riesgo → solo los que coinciden ─────
def test_cp14_filtrar_por_riesgo(client, auth_header):
    _crear_tratamiento(client, auth_header)
    _crear_tratamiento(client, auth_header, {
        "nombre": "Sensible",
        "datos_sensibles": True,
    })
    resp = client.get("/tratamientos?nivel_riesgo=ALTO", headers=auth_header)
    assert resp.status_code == 200
    for t in resp.json():
        assert t["nivel_riesgo"] == "ALTO"


# ── CP-15: Evaluar riesgo → nivel_riesgo calculado ───────────────────────────
def test_cp15_evaluar_riesgo(client, auth_header):
    tid = _crear_tratamiento(client, auth_header).json()["id"]
    resp = client.post(f"/tratamientos/{tid}/evaluar", headers=auth_header)
    assert resp.status_code == 200
    body = resp.json()
    assert body["nivel_riesgo"] is not None
    assert body["probabilidad"] is not None
    assert body["impacto"] is not None


# ── CP-16: Datos sensibles → riesgo ALTO ─────────────────────────────────────
def test_cp16_datos_sensibles_riesgo_alto(client, auth_header):
    resp = _crear_tratamiento(client, auth_header, {"datos_sensibles": True})
    assert resp.status_code == 201
    assert resp.json()["nivel_riesgo"] == "ALTO"


# ── CP-17: Listar tratamientos de otra org → lista vacía (aislamiento) ────────
def test_cp17_aislamiento_listar(client, auth_header, auth_header2):
    _crear_tratamiento(client, auth_header)
    resp = client.get("/tratamientos", headers=auth_header2)
    assert resp.status_code == 200
    assert resp.json() == []


# ── CP-18: Obtener tratamiento de otra org → 404 ─────────────────────────────
def test_cp18_aislamiento_obtener(client, auth_header, auth_header2):
    tid = _crear_tratamiento(client, auth_header).json()["id"]
    resp = client.get(f"/tratamientos/{tid}", headers=auth_header2)
    assert resp.status_code == 404


# ── CP-20: Subir archivo CSV → columnas clasificadas ─────────────────────────
def test_cp20_analizar_csv(client, auth_header):
    csv_content = "nombre,rut,email,fecha_nacimiento,telefono\nJuan,12345678-5,j@x.cl,1990-01-01,912345678"
    file = io.BytesIO(csv_content.encode())
    resp = client.post(
        "/analizar/archivo",
        files={"archivo": ("datos.csv", file, "text/csv")},
        headers=auth_header,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["total_columnas"] == 5
    assert len(body["detectados"]) > 0


# ── CP-21 a CP-24: Tests de informes (generan PDF + llaman GROQ) ─────────────
# Comentados porque tardan >1 min cada uno. Descomentar cuando se trabaje en
# features de informes. Se pueden acelerar mockeando pedir_analisis_ia.
#
# def test_cp21_generar_informe(client, auth_header):
#     tid = _crear_tratamiento(client, auth_header).json()["id"]
#     resp = client.post("/informes/generar", json={
#         "ids_tratamientos": [tid],
#     }, headers=auth_header)
#     assert resp.status_code == 200
#     body = resp.json()
#     assert body["ruta_pdf"] is not None
#     assert "RAT_" in body["ruta_pdf"]
#
#
# def test_cp22_listar_informes(client, auth_header):
#     tid = _crear_tratamiento(client, auth_header).json()["id"]
#     client.post("/informes/generar", json={"ids_tratamientos": [tid]}, headers=auth_header)
#     resp = client.get("/informes", headers=auth_header)
#     assert resp.status_code == 200
#     assert len(resp.json()) >= 1
#
#
# def test_cp23_eliminar_informe(client, auth_header):
#     tid = _crear_tratamiento(client, auth_header).json()["id"]
#     informe = client.post("/informes/generar", json={"ids_tratamientos": [tid]}, headers=auth_header).json()
#     resp = client.delete(f"/informes/{informe['id']}", headers=auth_header)
#     assert resp.status_code == 200
#     assert resp.json()["mensaje"] == "Informe eliminado correctamente."
#
#
# def test_cp24_descargar_pdf(client, auth_header):
#     tid = _crear_tratamiento(client, auth_header).json()["id"]
#     informe = client.post("/informes/generar", json={"ids_tratamientos": [tid]}, headers=auth_header).json()
#     resp = client.get(f"/informes/{informe['id']}/descargar", headers=auth_header)
#     assert resp.status_code == 200
#     assert resp.headers["content-type"] == "application/pdf"


# ── CP-41: Obtener análisis IA inexistente → 404 ─────────────────────────────
def test_cp41_analisis_ia_inexistente(client, auth_header, org_registrada):
    db = SessionTest()
    try:
        informe = Informe(
            organizacion_id=org_registrada["id"],
            contenido_ia=None,
            num_tratamientos=1,
        )
        db.add(informe)
        db.commit()
        db.refresh(informe)
        informe_id = informe.id
    finally:
        db.close()

    resp = client.get(f"/informes/{informe_id}/analisis", headers=auth_header)
    assert resp.status_code == 404
    assert resp.json()["detail"] == "Este informe no tiene análisis de IA."


# ── CP-10: Editar tratamiento recalcula riesgo ───────────────────────────────
def test_cp10_editar_recalcula_riesgo(client, auth_header):
    resp = _crear_tratamiento(client, auth_header, {"datos_sensibles": False})
    assert resp.status_code == 201
    tid = resp.json()["id"]
    assert resp.json()["nivel_riesgo"] != "ALTO"

    resp2 = client.put(f"/tratamientos/{tid}", json={
        "datos_sensibles": True,
    }, headers=auth_header)
    assert resp2.status_code == 200
    assert resp2.json()["nivel_riesgo"] == "ALTO"


# ── CP-19: Archivo formato no soportado → mensaje exacto ─────────────────────
def test_cp19_formato_no_soportado(client, auth_header):
    file = io.BytesIO(b"contenido falso")
    resp = client.post(
        "/analizar/archivo",
        files={"archivo": ("datos.txt", file, "text/plain")},
        headers=auth_header,
    )
    assert resp.status_code == 400
    assert resp.json()["detail"] == "Formato no soportado. Usa CSV o Excel (.xlsx, .xls)"


# ── CP-25: Generar informe sin tratamientos → mensaje exacto ─────────────────
def test_cp25_informe_sin_tratamientos(client, auth_header):
    resp = client.post("/informes/generar", json={
        "ids_tratamientos": [],
    }, headers=auth_header)
    assert resp.status_code == 400
    assert resp.json()["detail"] == "Selecciona al menos un tratamiento para generar el informe."
