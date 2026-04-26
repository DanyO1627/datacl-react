// frontend/src/services/tratamientosService.js
// Centraliza todas las llamadas al backend relacionadas con tratamientos.

import axios from "axios";

const BASE_URL = "http://localhost:8000";

const api = axios.create({ baseURL: BASE_URL });

// Agrega el JWT automáticamente en cada petición
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});


// ── Obtener todos los tratamientos de la organización ──────────
// GET /tratamientos
// Devuelve array de tratamientos de la organización autenticada.

export async function obtenerTratamientos() {
  const res = await api.get("/tratamientos");
  return res.data;
}


// ── Crear un nuevo tratamiento ─────────────────────────────────
// POST /tratamientos
// Recibe el objeto completo del formulario (pasos 1, 2 y 3 fusionados)
// más los campos_detectados que devuelve el análisis de Python.
//
// Retorna el tratamiento creado si el backend responde 200/201.
// Lanza error con mensaje legible si el backend responde 401 o 422.
//
// Uso desde Paso3.jsx:
//   import { crearTratamiento } from "../../services/tratamientosService"
//   await crearTratamiento(payload)

export async function crearTratamiento(datos) {
  try {
    const res = await api.post("/tratamientos", datos);
    return res.data;

  } catch (err) {
    // 401 — token inválido o expirado
    if (err.response?.status === 401) {
      // Lanzamos un error especial para que el componente pueda redirigir al login
      const error401 = new Error("Sesión expirada. Por favor inicia sesión nuevamente.");
      error401.codigo = 401;
      throw error401;
    }

    // 422 — validación fallida en el backend (campo faltante o tipo incorrecto)
    if (err.response?.status === 422) {
      const detail = err.response.data?.detail;
      const mensaje = formatearErrorValidacion(detail);
      const error422 = new Error(mensaje);
      error422.codigo = 422;
      error422.errores = detail; // el componente puede usar esto para marcar campos
      throw error422;
    }

    // Cualquier otro error (500, red caída, etc.)
    const detail = err.response?.data?.detail;
    const mensaje = typeof detail === "string"
      ? detail
      : "Error al guardar el tratamiento. Intenta nuevamente.";
    throw new Error(mensaje);
  }
}


// ── Obtener un tratamiento por ID ──────────────────────────────
// GET /tratamientos/:id

export async function obtenerTratamiento(id) {
  const res = await api.get(`/tratamientos/${id}`);
  return res.data;
}


// ── Editar un tratamiento ──────────────────────────────────────
// PUT /tratamientos/:id

export async function editarTratamiento(id, datos) {
  const res = await api.put(`/tratamientos/${id}`, datos);
  return res.data;
}


// ── Eliminar un tratamiento ────────────────────────────────────
// DELETE /tratamientos/:id

export async function eliminarTratamiento(id) {
  const res = await api.delete(`/tratamientos/${id}`);
  return res.data;
}


// ── Recalcular riesgo de un tratamiento ───────────────────────
// POST /tratamientos/:id/evaluar
// Devuelve el tratamiento con probabilidad, impacto y nivel_riesgo actualizados.
// NO modifica nada en el formulario — el componente decide qué hacer con el resultado.

export async function recalcularRiesgo(id) {
  try {
    const res = await api.post(`/tratamientos/${id}/evaluar`);
    return res.data; // { nivel_riesgo, probabilidad, impacto, fecha_evaluacion, ... }
  } catch (err) {
    if (err.response?.status === 401) {
      const e = new Error("Sesión expirada. Por favor inicia sesión nuevamente.");
      e.codigo = 401;
      throw e;
    }
    const detail = err.response?.data?.detail;
    throw new Error(typeof detail === "string" ? detail : "Error al recalcular el riesgo.");
  }
}


// ── Helper interno ─────────────────────────────────────────────
// Convierte el array de errores de validación de FastAPI (422)
// en un mensaje legible para mostrar al usuario.

function formatearErrorValidacion(detail) {
  if (!detail) return "Error de validación al guardar el tratamiento.";
  if (typeof detail === "string") return detail;

  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === "string") return item;
        if (item?.msg) {
          const campo = Array.isArray(item.loc)
            ? item.loc.slice(1).join(" > ")
            : "";
          return campo ? `${campo}: ${item.msg}` : item.msg;
        }
        return JSON.stringify(item);
      })
      .join(". ");
  }

  return "Error de validación al guardar el tratamiento.";
}