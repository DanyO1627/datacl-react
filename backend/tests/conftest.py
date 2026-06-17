import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from app.basededatos import Base, get_db
from app.utils.jwt import crear_token

engine_test = create_engine(
    "sqlite:///./test.db",
    connect_args={"check_same_thread": False},
)
SessionTest = sessionmaker(autocommit=False, autoflush=False, bind=engine_test)


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.drop_all(bind=engine_test)
    Base.metadata.create_all(bind=engine_test)
    yield
    Base.metadata.drop_all(bind=engine_test)


def override_get_db():
    db = SessionTest()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture()
def client():
    from main import app
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture()
def org_registrada(client: TestClient):
    resp = client.post("/auth/registro", json={
        "nombre": "Org Test",
        "rut": "12345678-5",
        "correo": "test@datacl.cl",
        "password": "password123",
        "confirmar_password": "password123",
    })
    assert resp.status_code == 201
    return resp.json()


@pytest.fixture()
def token(client: TestClient, org_registrada):
    resp = client.post("/auth/login", json={
        "correo": "test@datacl.cl",
        "password": "password123",
    })
    assert resp.status_code == 200
    return resp.json()["access_token"]


@pytest.fixture()
def auth_header(token: str):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def org2_registrada(client: TestClient):
    resp = client.post("/auth/registro", json={
        "nombre": "Otra Org",
        "rut": "87654321-0",
        "correo": "otra@datacl.cl",
        "password": "password456",
        "confirmar_password": "password456",
    })
    assert resp.status_code == 201
    return resp.json()


@pytest.fixture()
def token2(client: TestClient, org2_registrada):
    resp = client.post("/auth/login", json={
        "correo": "otra@datacl.cl",
        "password": "password456",
    })
    return resp.json()["access_token"]


@pytest.fixture()
def auth_header2(token2: str):
    return {"Authorization": f"Bearer {token2}"}


TRATAMIENTO_COMPLETO = {
    "nombre": "Registro de clientes",
    "finalidad": "Gestión de clientes y facturación",
    "base_legal": "Consentimiento (Art. 12)",
    "datos_sensibles": False,
    "destinatarios": "Departamento contable",
    "plazo_conservacion": "5 años",
    "medidas_seguridad": "Cifrado AES-256",
    "sale_extranjero": False,
    "decisiones_automatizadas": False,
    "campos_detectados": [
        {"nombre_columna": "nombre", "tipo_dato": "str", "es_sensible": False},
        {"nombre_columna": "correo", "tipo_dato": "str", "es_sensible": False},
    ],
    "detalle": {
        "responsable_tratamiento": "Juan Pérez",
        "departamento": "TI",
        "universo_titulares": "Clientes activos",
    },
}
