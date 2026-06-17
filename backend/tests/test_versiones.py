"""
Tests de historial de versiones — CP-31~35
"""
from tests.conftest import TRATAMIENTO_COMPLETO


def _crear_tratamiento(client, auth_header, override=None):
    payload = {**TRATAMIENTO_COMPLETO, **(override or {})}
    return client.post("/tratamientos", json=payload, headers=auth_header)


# ── CP-31: Editar tratamiento COMPLETO genera versión ─────────────────────────
def test_cp31_editar_completo_genera_version(client, auth_header):
    tid = _crear_tratamiento(client, auth_header).json()["id"]

    # Primera edición → crea versión 1
    client.put(f"/tratamientos/{tid}", json={
        "finalidad": "Finalidad modificada",
    }, headers=auth_header)

    resp = client.get(f"/tratamientos/{tid}/versiones", headers=auth_header)
    assert resp.status_code == 200
    versiones = resp.json()
    assert len(versiones) >= 1
    assert versiones[0]["numero_version"] >= 1


# ── CP-32: Editar BORRADOR también genera versión ─────────────────────────────
# Nota: el código actual (commit 9423178) acepta todos los estados de RAT.
def test_cp32_editar_borrador_genera_version(client, auth_header):
    tid = _crear_tratamiento(client, auth_header, {"estado": "BORRADOR"}).json()["id"]

    client.put(f"/tratamientos/{tid}", json={
        "nombre": "Borrador editado",
    }, headers=auth_header)

    resp = client.get(f"/tratamientos/{tid}/versiones", headers=auth_header)
    assert resp.status_code == 200
    versiones = resp.json()
    assert len(versiones) >= 1


# ── CP-33: Listar versiones ordenadas descendente ─────────────────────────────
def test_cp33_listar_versiones_ordenadas(client, auth_header):
    tid = _crear_tratamiento(client, auth_header).json()["id"]

    # Edición 1 → versión 1
    client.put(f"/tratamientos/{tid}", json={
        "finalidad": "Cambio 1",
    }, headers=auth_header)

    # Edición 2 → versión 2
    client.put(f"/tratamientos/{tid}", json={
        "finalidad": "Cambio 2",
    }, headers=auth_header)

    resp = client.get(f"/tratamientos/{tid}/versiones", headers=auth_header)
    assert resp.status_code == 200
    versiones = resp.json()
    assert len(versiones) >= 2
    assert versiones[0]["numero_version"] > versiones[1]["numero_version"]


# ── CP-34: Obtener versión específica con snapshot completo ───────────────────
def test_cp34_obtener_version_con_snapshot(client, auth_header):
    tid = _crear_tratamiento(client, auth_header).json()["id"]

    client.put(f"/tratamientos/{tid}", json={
        "base_legal": "Obligación legal (Art. 13 b)",
    }, headers=auth_header)

    resp = client.get(f"/tratamientos/{tid}/versiones/1", headers=auth_header)
    assert resp.status_code == 200
    body = resp.json()
    assert body["numero_version"] == 1
    assert "datos_snapshot" in body
    assert "nombre" in body["datos_snapshot"]
    assert "finalidad" in body["datos_snapshot"]


# ── CP-35: Versiones de tratamiento de otra org → 404 (IDOR) ─────────────────
def test_cp35_versiones_otra_org_idor(client, auth_header, auth_header2):
    tid = _crear_tratamiento(client, auth_header).json()["id"]

    client.put(f"/tratamientos/{tid}", json={
        "finalidad": "Cambio privado",
    }, headers=auth_header)

    resp = client.get(f"/tratamientos/{tid}/versiones", headers=auth_header2)
    assert resp.status_code == 404
