"""
Tests de autenticación — CP-01~CP-09, CP-26, CP-27, CP-28
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


# ── CP-01: Registro devuelve datos de org, NO un token ───────────────────────
def test_cp01_registro_devuelve_org(client):
    resp = client.post("/auth/registro", json={
        "nombre": "Org CP01",
        "rut": "22222222-2",
        "correo": "cp01@datacl.cl",
        "password": "password123",
        "confirmar_password": "password123",
    })
    assert resp.status_code == 201
    body = resp.json()
    assert "id" in body
    assert body["nombre"] == "Org CP01"
    assert body["rut"] == "22222222-2"
    assert "access_token" not in body


# ── CP-02: Registro con RUT duplicado → "El RUT ya está registrado" ──────────
def test_cp02_registro_rut_duplicado(client, org_registrada):
    resp = client.post("/auth/registro", json={
        "nombre": "Otra Org",
        "rut": "12345678-5",
        "correo": "otra@datacl.cl",
        "password": "password123",
        "confirmar_password": "password123",
    })
    assert resp.status_code == 400
    assert resp.json()["detail"] == "El RUT ya está registrado"


# ── CP-05: Endpoint admin sin rol ADMIN → 403 ────────────────────────────────
def test_cp05_acceso_admin_sin_rol(client, auth_header):
    resp = client.get("/admin/stats", headers=auth_header)
    assert resp.status_code == 403
    assert resp.json()["detail"] == "Acceso restringido a administradores"


# ── CP-28: Perfil /auth/me incluye RUT ────────────────────────────────────────
def test_cp28_perfil_incluye_rut(client, auth_header):
    resp = client.get("/auth/me", headers=auth_header)
    assert resp.status_code == 200
    body = resp.json()
    assert "rut" in body
    assert body["rut"] == "12345678-5"


# ── CP-29: Editar perfil (nombre) → nombre actualizado ───────────────────────
def test_cp29_editar_perfil_nombre(client, auth_header):
    resp = client.put("/organizaciones/perfil", json={
        "nombre": "Org Renombrada",
    }, headers=auth_header)
    assert resp.status_code == 200
    assert resp.json()["nombre"] == "Org Renombrada"

    resp2 = client.get("/auth/me", headers=auth_header)
    assert resp2.json()["nombre"] == "Org Renombrada"


# ── CP-30: Cambiar password con password actual errónea → 400 ────────────────
def test_cp30_cambiar_password_erronea(client, auth_header):
    resp = client.put("/organizaciones/password", json={
        "password_actual": "incorrecta999",
        "password_nueva": "nueva123456",
        "confirmar_password": "nueva123456",
    }, headers=auth_header)
    assert resp.status_code == 400
    assert resp.json()["detail"] == "La contraseña actual es incorrecta"


# ── CP-42: Endpoints de informes sin token → 401 ─────────────────────────────
def test_cp42_informes_sin_token(client):
    assert client.get("/informes").status_code == 401
    assert client.post("/informes/generar", json={"ids_tratamientos": [1]}).status_code == 401
