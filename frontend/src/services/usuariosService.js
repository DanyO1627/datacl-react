// frontend/src/services/usuariosService.js
// Centraliza las llamadas al backend para la gestión de usuarios de la propia
// organización (R10.2/R10.6). El backend exige rol ADMIN_ORG en todas estas
// rutas (requiere_admin_org) — un MIEMBRO que las llamara igual recibiría 403.

import axios from "axios";

const BASE_URL = "/api";

const api = axios.create({ baseURL: BASE_URL });

// Agrega el JWT automáticamente en cada petición — mismo patrón que
// tratamientosService.js.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Helper interno ─────────────────────────────────────────────
// Convierte el detail de FastAPI (string o array de errores de validación)
// en un mensaje legible, y marca error.codigo para que el componente pueda
// reaccionar especial a un 401 (sesión expirada).
function manejarError(err, mensajeGenerico) {
  if (err.response?.status === 401) {
    const error = new Error("Sesión expirada. Por favor inicia sesión nuevamente.");
    error.codigo = 401;
    throw error;
  }

  const detail = err.response?.data?.detail;
  let mensaje = mensajeGenerico;
  if (typeof detail === "string") {
    mensaje = detail;
  } else if (Array.isArray(detail)) {
    mensaje = detail.map((item) => (typeof item === "string" ? item : item?.msg)).filter(Boolean).join(". ") || mensajeGenerico;
  }

  const error = new Error(mensaje);
  error.codigo = err.response?.status;
  throw error;
}


// ── Crear usuario en la propia organización ─────────────────────
// POST /usuarios
// datos: { nombre, correo, password, rol: "ADMIN_ORG"|"MIEMBRO", permisos? }
// "permisos" solo aplica si rol === "MIEMBRO", el backend lo ignora si no.

export async function crearUsuario(datos) {
  try {
    const res = await api.post("/usuarios", datos);
    return res.data;
  } catch (err) {
    manejarError(err, "Error al crear el usuario.");
  }
}


// ── Listar usuarios de la propia organización ────────────────────
// GET /usuarios

export async function listarUsuarios() {
  try {
    const res = await api.get("/usuarios");
    return res.data;
  } catch (err) {
    manejarError(err, "Error al obtener los usuarios.");
  }
}


// ── Editar usuario (nombre, rol, activo y/o permisos) ─────────────
// PUT /usuarios/:id — manda solo los campos que cambian (sparse update)

export async function editarUsuario(id, datos) {
  try {
    const res = await api.put(`/usuarios/${id}`, datos);
    return res.data;
  } catch (err) {
    manejarError(err, "Error al editar el usuario.");
  }
}


// ── Eliminar usuario ──────────────────────────────────────────────
// DELETE /usuarios/:id

export async function eliminarUsuario(id) {
  try {
    const res = await api.delete(`/usuarios/${id}`);
    return res.data;
  } catch (err) {
    manejarError(err, "Error al eliminar el usuario.");
  }
}


// ── Resetear la contraseña de un usuario ───────────────────────────
// PUT /usuarios/:id/password — { password_nueva, confirmar_password }
// A diferencia de organizaciones.js (cambio de contraseña propio), acá el
// admin no necesita la contraseña anterior — el backend fuerza
// debe_cambiar_password=true para que la persona la cambie de nuevo al entrar.

export async function resetearPassword(id, datos) {
  try {
    const res = await api.put(`/usuarios/${id}/password`, datos);
    return res.data;
  } catch (err) {
    manejarError(err, "Error al resetear la contraseña.");
  }
}
