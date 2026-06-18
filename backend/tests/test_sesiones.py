"""
Tests de sesiones de análisis — CP-59~CP-63
CRUD completo + aislamiento entre organizaciones.
"""


# ── CP-59: Crear sesión → 201 ───────────────────────────────────────────────
def test_cp59_crear_sesion(client, auth_header):
    resp = client.post("/sesiones", json={
        "nombre": "Sesión de prueba",
        "fuente": "archivo",
    }, headers=auth_header)
    assert resp.status_code == 201
    body = resp.json()
    assert body["nombre"] == "Sesión de prueba"
    assert body["fuente"] == "archivo"
    assert body["estado"] == "activa"
    assert body["num_actividades"] == 0


# ── CP-60: Listar sesiones propias → 200 ────────────────────────────────────
def test_cp60_listar_sesiones(client, auth_header):
    client.post("/sesiones", json={"nombre": "S1", "fuente": "archivo"}, headers=auth_header)
    client.post("/sesiones", json={"nombre": "S2", "fuente": "bd"}, headers=auth_header)
    resp = client.get("/sesiones", headers=auth_header)
    assert resp.status_code == 200
    assert len(resp.json()) == 2


# ── CP-61: Obtener sesión por ID → 200 ──────────────────────────────────────
def test_cp61_obtener_sesion(client, auth_header):
    sid = client.post("/sesiones", json={
        "nombre": "Mi sesión",
        "fuente": "manual",
    }, headers=auth_header).json()["id"]
    resp = client.get(f"/sesiones/{sid}", headers=auth_header)
    assert resp.status_code == 200
    assert resp.json()["nombre"] == "Mi sesión"
    assert resp.json()["fuente"] == "manual"


# ── CP-62: Eliminar sesión → 204 ────────────────────────────────────────────
def test_cp62_eliminar_sesion(client, auth_header):
    sid = client.post("/sesiones", json={
        "nombre": "Para borrar",
        "fuente": "archivo",
    }, headers=auth_header).json()["id"]
    resp = client.delete(f"/sesiones/{sid}", headers=auth_header)
    assert resp.status_code == 204

    resp2 = client.get(f"/sesiones/{sid}", headers=auth_header)
    assert resp2.status_code == 404


# ── CP-63: Sesión de otra org → 404 (aislamiento) ───────────────────────────
def test_cp63_sesion_otra_org(client, auth_header, auth_header2):
    sid = client.post("/sesiones", json={
        "nombre": "Privada",
        "fuente": "archivo",
    }, headers=auth_header).json()["id"]

    resp = client.get(f"/sesiones/{sid}", headers=auth_header2)
    assert resp.status_code == 404
    assert resp.json()["detail"] == "Sesión no encontrada"
