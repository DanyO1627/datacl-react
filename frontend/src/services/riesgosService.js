// frontend/src/services/riesgosService.js
// R10.10 — llamada al endpoint propio de resumen de riesgos (antes Riesgos.jsx
// reusaba tratamientosService.js, protegido por tratamientos_ver, no por
// riesgos_ver). Mismo patrón que tratamientosService.js.

import axios from "axios";

const BASE_URL = "/api";

const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});


// ── Resumen agregado de riesgos de la organización ──────────────
// GET /riesgos/resumen
// Devuelve { distribucion: {ALTO,MEDIO,BAJO}, datos_sensibles: {con,sin}, top3: [{id,nombre,nivel_riesgo}] }
// Ya viene agregado desde el backend — no hay que recalcular nada acá.

export async function obtenerResumenRiesgos() {
  const res = await api.get("/riesgos/resumen");
  return res.data;
}
