"""
Tests de autenticación — CP-03, CP-04, CP-06, CP-08, CP-09, CP-26, CP-27
"""


# ── CP-03: Login con credenciales válidas → 200 + token ──────────────────────
def test_cp03_login_valido(client, org_registrada):
    resp = client.post("/auth/login", json={
        "correo": "test@datacl.cl",
        "password": "password123",
    })
    assert resp.status_code == 200
    body = resp.json()
    assert "access_token" in body
    assert body["token_type"] == "bearer"
    assert body["organizacion"]["correo"] == "test@datacl.cl"


# ── CP-04: Login con contraseña incorrecta → 401 ─────────────────────────────
def test_cp04_login_password_incorrecta(client, org_registrada):
    resp = client.post("/auth/login", json={
        "correo": "test@datacl.cl",
        "password": "incorrecta999",
    })
    assert resp.status_code == 401
    assert resp.json()["detail"] == "Credenciales incorrectas"


# ── CP-06: Registro con datos válidos → 201 ──────────────────────────────────
def test_cp06_registro_valido(client):
    resp = client.post("/auth/registro", json={
        "nombre": "Nueva Org",
        "rut": "11111111-1",
        "correo": "nueva@datacl.cl",
        "password": "password123",
        "confirmar_password": "password123",
    })
    assert resp.status_code == 201
    body = resp.json()
    assert body["nombre"] == "Nueva Org"
    assert body["rut"] == "11111111-1"
    assert body["correo"] == "nueva@datacl.cl"
    assert body["rol"] == "ORGANIZACION"
    assert "password" not in body


# ── CP-08: Registro con correo duplicado → 400 ───────────────────────────────
def test_cp08_registro_correo_duplicado(client, org_registrada):
    resp = client.post("/auth/registro", json={
        "nombre": "Duplicada",
        "rut": "99999999-9",
        "correo": "test@datacl.cl",
        "password": "password123",
        "confirmar_password": "password123",
    })
    assert resp.status_code == 400
    assert "correo ya está registrado" in resp.json()["detail"]


# ── CP-09: Registro con RUT inválido → 422 ───────────────────────────────────
def test_cp09_registro_rut_invalido(client):
    resp = client.post("/auth/registro", json={
        "nombre": "Org Bad RUT",
        "rut": "123",
        "correo": "bad@datacl.cl",
        "password": "password123",
        "confirmar_password": "password123",
    })
    assert resp.status_code == 422


# ── CP-26: Endpoint protegido sin token → 401 ────────────────────────────────
def test_cp26_sin_token(client):
    resp = client.get("/tratamientos")
    assert resp.status_code == 401


# ── CP-27: Token inválido → 401 ──────────────────────────────────────────────
def test_cp27_token_invalido(client):
    resp = client.get("/tratamientos", headers={
        "Authorization": "Bearer token.falso.inventado",
    })
    assert resp.status_code == 401
