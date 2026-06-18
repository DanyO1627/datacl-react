"""
Tests de personalización — CP-52~CP-58
Logo (subir, formato inválido, obtener sin logo, eliminar)
Color institucional (hex válido, formato inválido)
"""
import io


# ── CP-52: Subir logo PNG válido → 200 ──────────────────────────────────────
def test_cp52_subir_logo_valido(client, auth_header):
    fake_png = io.BytesIO(b"\x89PNG\r\n\x1a\n" + b"\x00" * 100)
    resp = client.post(
        "/organizaciones/logo",
        files={"archivo": ("logo.png", fake_png, "image/png")},
        headers=auth_header,
    )
    assert resp.status_code == 200
    assert resp.json()["mensaje"] == "Logo subido correctamente."
    assert "logo_ruta" in resp.json()


# ── CP-53: Subir logo formato inválido (.bmp) → 400 ─────────────────────────
def test_cp53_subir_logo_formato_invalido(client, auth_header):
    fake_bmp = io.BytesIO(b"\x00" * 50)
    resp = client.post(
        "/organizaciones/logo",
        files={"archivo": ("logo.bmp", fake_bmp, "image/bmp")},
        headers=auth_header,
    )
    assert resp.status_code == 400
    assert resp.json()["detail"] == "Formato no válido. Usa PNG o JPG."


# ── CP-54: Obtener logo sin tener uno → 404 ─────────────────────────────────
def test_cp54_obtener_logo_sin_logo(client, auth_header):
    resp = client.get("/organizaciones/logo", headers=auth_header)
    assert resp.status_code == 404
    assert resp.json()["detail"] == "No hay logo configurado."


# ── CP-55: Eliminar logo → 200 ──────────────────────────────────────────────
def test_cp55_eliminar_logo(client, auth_header):
    fake_png = io.BytesIO(b"\x89PNG\r\n\x1a\n" + b"\x00" * 100)
    client.post(
        "/organizaciones/logo",
        files={"archivo": ("logo.png", fake_png, "image/png")},
        headers=auth_header,
    )
    resp = client.delete("/organizaciones/logo", headers=auth_header)
    assert resp.status_code == 200
    assert resp.json()["mensaje"] == "Logo eliminado."

    resp2 = client.get("/organizaciones/logo", headers=auth_header)
    assert resp2.status_code == 404


# ── CP-56: Cambiar color hex válido → 200 ───────────────────────────────────
def test_cp56_cambiar_color_valido(client, auth_header):
    resp = client.put("/organizaciones/color", json={
        "color": "#7030A0",
    }, headers=auth_header)
    assert resp.status_code == 200
    assert resp.json()["color"] == "#7030A0"
    assert resp.json()["mensaje"] == "Color actualizado."


# ── CP-57: Color formato inválido → 400 ─────────────────────────────────────
def test_cp57_color_formato_invalido(client, auth_header):
    resp = client.put("/organizaciones/color", json={
        "color": "rojo",
    }, headers=auth_header)
    assert resp.status_code == 400
    assert resp.json()["detail"] == "Formato inválido. Usa formato hex: #7030A0"


# ── CP-58: Endpoints de personalización sin token → 401 ─────────────────────
def test_cp58_personalizacion_sin_token(client):
    assert client.get("/organizaciones/logo").status_code == 401
    assert client.put("/organizaciones/color", json={"color": "#000000"}).status_code == 401
