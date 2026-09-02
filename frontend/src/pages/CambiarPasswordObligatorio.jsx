// frontend/src/pages/CambiarPasswordObligatorio.jsx
// R10.7 — pantalla de cambio de contraseña obligatorio en el primer login.
//
// A quién le aparece: cuentas con usuario.debe_cambiar_password === true —
// creadas por un ADMIN_ORG (R10.2) o con la contraseña reseteada por él
// (R10.6). Las cuentas migradas en R10.4 traen el flag en false y nunca
// llegan acá (RutaProtegida.jsx es quien decide la redirección).
//
// Por qué NO usa RutaProtegida: esa misma redirección basada en
// debe_cambiar_password haría un loop infinito si esta pantalla también
// estuviera envuelta en RutaProtegida. Acá se hace el guard de auth a mano.

import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import "../styles/cambiarPasswordObligatorio.css";

const api = axios.create({ baseURL: "/api" });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default function CambiarPasswordObligatorio() {
  const { usuario, actualizarUsuario, cerrarSesion } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    password_actual: "",
    password_nueva: "",
    confirmar_password: "",
  });
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  // Sin sesión -> al login. Ya cambió la contraseña (volvió con el botón
  // "atrás" del navegador, por ejemplo) -> no tiene sentido seguir acá.
  if (!usuario) return <Navigate to="/login" replace />;
  if (!usuario.debe_cambiar_password) return <Navigate to="/dashboard" replace />;

  function handleChange(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (form.password_nueva !== form.confirmar_password) {
      setError("Las contraseñas nuevas no coinciden.");
      return;
    }
    if (form.password_nueva.length < 8) {
      setError("La contraseña nueva debe tener al menos 8 caracteres.");
      return;
    }
    if (form.password_nueva === form.password_actual) {
      setError("La nueva contraseña debe ser diferente a la actual.");
      return;
    }

    setGuardando(true);
    try {
      await api.put("/organizaciones/password", form);
      // El backend ya puso debe_cambiar_password=False (R10.7) — se refleja
      // acá localmente para no forzar un login de nuevo.
      actualizarUsuario({ debe_cambiar_password: false });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      const detalle = err.response?.data?.detail;
      setError(typeof detalle === "string" ? detalle : "Error al cambiar la contraseña.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="cpo-layout">
      <div className="cpo-logo">DataCL</div>

      <div className="cpo-card">
        <div className="cpo-icono">🔑</div>
        <h1 className="cpo-titulo">Cambia tu contraseña</h1>
        <p className="cpo-subtitulo">
          Por seguridad, debes elegir una contraseña propia antes de continuar.
        </p>

        <form onSubmit={handleSubmit} className="cpo-form">
          <div className="cpo-campo">
            <label>Contraseña actual</label>
            <input
              type="password"
              value={form.password_actual}
              onChange={(e) => handleChange("password_actual", e.target.value)}
              placeholder="La que te entregó tu administrador"
              required
            />
          </div>

          <div className="cpo-campo">
            <label>Contraseña nueva</label>
            <input
              type="password"
              value={form.password_nueva}
              onChange={(e) => handleChange("password_nueva", e.target.value)}
              placeholder="Mínimo 8 caracteres"
              required
            />
          </div>

          <div className="cpo-campo">
            <label>Confirmar contraseña nueva</label>
            <input
              type="password"
              value={form.confirmar_password}
              onChange={(e) => handleChange("confirmar_password", e.target.value)}
              required
            />
          </div>

          {error && <p className="cpo-error">{error}</p>}

          <button type="submit" className="cpo-btn" disabled={guardando}>
            {guardando ? "Guardando..." : "Cambiar contraseña y continuar"}
          </button>
        </form>

        <button type="button" className="cpo-cerrar-sesion" onClick={cerrarSesion}>
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
