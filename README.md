# DataCL

Sistema web para la gestión del **Registro de Actividades de Tratamiento (RAT)** de datos personales, conforme a la **Ley 21.719** de Protección de Datos Personales de Chile.

Permite a organizaciones identificar, clasificar y documentar sus tratamientos de datos personales, evaluar riesgos y generar informes PDF con estándar profesional.

## Funcionalidades principales

- **Detección asistida por IA** de datos personales desde archivos (Excel/CSV), conexión a base de datos externa o ingreso manual
- **Formulario guiado en 3 pasos** con campos del RAT real (identificación, datos/transferencias, principios legales y DPIA)
- **Motor de evaluación de riesgo** basado en metodología AEPD adaptada a Ley 21.719
- **Generación de PDF** con formato institucional, logo personalizable y secciones normadas
- **Historial de versiones** con trazabilidad de cambios, snapshots y comparación antes/después
- **Dashboard** con métricas de riesgo, gráficos y resumen de tratamientos
- **Análisis de cumplimiento con IA** (Groq) para informes generados

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19 + Vite + React Router |
| Backend | Python 3.13 + FastAPI + Uvicorn |
| Base de datos | MySQL 8 (XAMPP) + SQLAlchemy 2 |
| IA | Groq API (Llama) |
| PDF | ReportLab |
| Gráficos | Recharts |

## Estructura del proyecto

```
datacl-react/
├── backend/
│   ├── app/
│   │   ├── routers/          # 7 routers, 36 endpoints
│   │   ├── services/         # Lógica de negocio
│   │   ├── utils/            # JWT, PDF builder
│   │   ├── models.py         # 9 tablas SQLAlchemy
│   │   └── schemas.py        # Validación Pydantic
│   ├── tests/                # Tests con pytest
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── pages/            # 20+ vistas
│   │   ├── components/       # Componentes reutilizables
│   │   ├── context/          # AuthContext, FormularioContext
│   │   ├── services/         # Llamadas a la API
│   │   └── styles/           # CSS por componente
│   └── package.json
└── README.md
```

## Requisitos previos

- [Python 3.13+](https://www.python.org/downloads/)
- [Node.js 18+](https://nodejs.org/)
- [XAMPP](https://www.apachefriends.org/) (MySQL)
- Clave de API de [Groq](https://console.groq.com/) (para detección con IA)

## Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/DanyO1627/datacl-react.git
cd datacl-react
```

### 2. Base de datos

1. Iniciar MySQL desde XAMPP
2. Crear la base de datos:
```sql
CREATE DATABASE datacl CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
```
3. Las tablas se crean automáticamente al iniciar el backend (`Base.metadata.create_all`)

### 3. Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Linux/Mac
pip install -r requirements.txt
```

Crear el archivo `.env` a partir del ejemplo:
```bash
cp .env.example .env
```

Editar `.env` con tus credenciales:
```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=datacl
DB_USER=root
DB_PASSWORD=
SECRET_KEY=datacl_secret_key_2026
GROQ_API_KEY=tu_clave_aqui
```

Iniciar el servidor:
```bash
uvicorn app.main:app --reload
```

El backend corre en `http://localhost:8000`. Documentación interactiva en `http://localhost:8000/docs`.

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

El frontend corre en `http://localhost:5173`.

## Tests

```bash
cd backend
pytest -v
```

## API

7 routers con 36 endpoints:

| Router | Prefijo | Endpoints | Descripción |
|--------|---------|-----------|-------------|
| Auth | `/auth` | 3 | Registro, login, perfil |
| Tratamientos | `/tratamientos` | 8 | CRUD + evaluación de riesgo + versiones |
| Análisis | `/analisis` | 5 | Detección por archivo, diccionario y conexión BD |
| Sesiones | `/sesiones` | 5 | Gestión de sesiones de análisis |
| Informes | `/informes` | 6 | Generación PDF + análisis IA |
| Organizaciones | `/organizaciones` | 6 | Perfil, logo, color institucional |
| Admin | `/admin` | 3 | Estadísticas y gestión de organizaciones |

Documentación completa disponible en `/docs` (Swagger UI) al iniciar el backend.

## Modelo de datos

9 tablas principales:

- `organizaciones` — Cuentas de usuario (organización)
- `tratamientos` — Registro de actividades de tratamiento
- `detalle_rat` — Campos básicos del RAT
- `detalle_rat_extendido` — ~35 campos del RAT completo
- `campos_rat` — Campos detectados por IA
- `versiones_tratamiento` — Snapshots de cada cambio
- `informes` — PDFs generados + análisis IA
- `sesiones_analisis` — Registro de cada análisis
- `sesion_actividad` — Relación sesión-tratamiento

## Equipo

Proyecto de título — Ingeniería en Informática, DuocUC (2026).

| Integrante | Rol |
|-----------|-----|
| Constanza Pino | Desarrollo backend, testing, arquitectura, IA |
| Daniel Oliveros | Desarrollo frontend, backend, testing, conexión BD |
| Evelin Calderón | Testing, QA, corrección de bugs, conexión bd |

## Licencia

Proyecto académico. Todos los derechos reservados.
