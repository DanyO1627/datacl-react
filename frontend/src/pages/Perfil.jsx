// frontend/src/pages/Perfil.jsx
// Pantalla 20 — Perfil de organización
// Permite editar nombre y correo, y cambiar contraseña.

import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import BarraLateral from "../components/BarraLateral";
import axios from "axios";
import "../styles/perfil.css";

const API = "http://localhost:8000";

// ── Instancia axios con JWT automático ─────────────────────────
const api = axios.create({ baseURL: API });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Iconos SVG inline (sin dependencia extra) ──────────────────
function IconoEditar() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function IconoOjo({ visible }) {
  return visible ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function IconoCheck() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function IconoError() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

// ── Componente principal ───────────────────────────────────────
export default function Perfil() {
  const { usuario, token } = useAuth();

  // ── Estado del formulario de perfil ──────────────────────────
  const [perfil, setPerfil] = useState({ nombre: "", correo: "", rut: "" });
  const [editandoNombre, setEditandoNombre] = useState(false);
  const [editandoCorreo, setEditandoCorreo] = useState(false);
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);
  const [alertaPerfil, setAlertaPerfil] = useState(null); // { tipo: "exito"|"error", mensaje }

  // ── Estado del formulario de contraseña ──────────────────────
  const [password, setPassword] = useState({
    password_actual: "",
    password_nueva: "",
    confirmar_nueva: "",
  });
  const [verActual, setVerActual] = useState(false);
  const [verNueva, setVerNueva] = useState(false);
  const [verConfirmar, setVerConfirmar] = useState(false);
  const [guardandoPass, setGuardandoPass] = useState(false);
  const [alertaPass, setAlertaPass] = useState(null);

  // ── Pre-rellenar desde GET /auth/me ──────────────────────────
  useEffect(() => {
    async function cargarPerfil() {
      try {
        const res = await api.get("/auth/me");
        setPerfil({
          nombre: res.data.nombre || "",
          correo: res.data.correo || "",
          rut:    res.data.rut    || "",
        });
      } catch {
        // fallback al contexto si el endpoint falla
        if (usuario) {
          setPerfil({
            nombre: usuario.nombre || "",
            correo: usuario.correo || "",
            rut:    usuario.rut    || "",
          });
        }
      }
    }
    cargarPerfil();
  }, [token]);

  // ── Guardar perfil ────────────────────────────────────────────
  async function handleGuardarPerfil(e) {
    e.preventDefault();
    setGuardandoPerfil(true);
    setAlertaPerfil(null);

    try {
      await api.put("/organizaciones/perfil", {
        nombre: perfil.nombre,
        correo: perfil.correo,
      });
      setAlertaPerfil({ tipo: "exito", mensaje: "Perfil actualizado correctamente." });
      setEditandoNombre(false);
      setEditandoCorreo(false);
    } catch (err) {
      const detalle = err.response?.data?.detail;
      setAlertaPerfil({
        tipo: "error",
        mensaje: typeof detalle === "string" ? detalle : "Error al actualizar el perfil.",
      });
    } finally {
      setGuardandoPerfil(false);
    }
  }

  // ── Cambiar contraseña ────────────────────────────────────────
  async function handleCambiarPassword(e) {
    e.preventDefault();
    setAlertaPass(null);

    if (password.password_nueva !== password.confirmar_nueva) {
      setAlertaPass({ tipo: "error", mensaje: "Las contraseñas nuevas no coinciden." });
      return;
    }
    if (password.password_nueva.length < 8) {
      setAlertaPass({ tipo: "error", mensaje: "La contraseña nueva debe tener al menos 8 caracteres." });
      return;
    }

    setGuardandoPass(true);
    try {
      await api.put("/organizaciones/password", {
        password_actual:    password.password_actual,
        password_nueva:     password.password_nueva,
        confirmar_password: password.confirmar_nueva,  // campo requerido por el schema del backend
      });
      setAlertaPass({ tipo: "exito", mensaje: "Contraseña actualizada correctamente." });
      setPassword({ password_actual: "", password_nueva: "", confirmar_nueva: "" });
    } catch (err) {
      const detalle = err.response?.data?.detail;
      setAlertaPass({
        tipo: "error",
        mensaje: typeof detalle === "string" ? detalle : "Error al cambiar la contraseña.",
      });
    } finally {
      setGuardandoPass(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="pf-layout">
      <BarraLateral />

      <main className="pf-main">
        {/* Header */}
        <div className="pf-header">
          <h1 className="pf-titulo">Mi perfil</h1>
          <p className="pf-subtitulo">Gestiona los datos de tu organización</p>
        </div>

        {/* ── Card principal ── */}
        <div className="pf-contenido">

          {/* ════════ Sección: datos de la organización ════════ */}
          <section className="pf-seccion">
            <h2 className="pf-seccion-titulo">Datos de la organización</h2>

            <form onSubmit={handleGuardarPerfil} className="pf-form">

              {/* Nombre */}
              <div className="pf-campo">
                <label className="pf-label">Nombre de la organización</label>
                <div className="pf-input-wrap">
                  <input
                    type="text"
                    className={`pf-input ${!editandoNombre ? "pf-input--readonly" : ""}`}
                    value={perfil.nombre}
                    readOnly={!editandoNombre}
                    onChange={(e) => setPerfil((p) => ({ ...p, nombre: e.target.value }))}
                    placeholder="Nombre de la organización"
                    maxLength={120}
                  />
                  {!editandoNombre && (
                    <button
                      type="button"
                      className="pf-btn-editar"
                      onClick={() => setEditandoNombre(true)}
                      title="Editar nombre"
                    >
                      <IconoEditar />
                    </button>
                  )}
                </div>
              </div>

              {/* RUT — no editable */}
              <div className="pf-campo">
                <label className="pf-label">RUT</label>
                <div className="pf-input-wrap">
                  <input
                    type="text"
                    className="pf-input pf-input--readonly pf-input--rut"
                    value={perfil.rut}
                    readOnly
                    placeholder="RUT no disponible"
                  />
                  <span className="pf-rut-badge">No editable</span>
                </div>
              </div>

              {/* Correo */}
              <div className="pf-campo">
                <label className="pf-label">Correo electrónico</label>
                <div className="pf-input-wrap">
                  <input
                    type="email"
                    className={`pf-input ${!editandoCorreo ? "pf-input--readonly" : ""}`}
                    value={perfil.correo}
                    readOnly={!editandoCorreo}
                    onChange={(e) => setPerfil((p) => ({ ...p, correo: e.target.value }))}
                    placeholder="correo@organización.cl"
                  />
                  {!editandoCorreo && (
                    <button
                      type="button"
                      className="pf-btn-editar"
                      onClick={() => setEditandoCorreo(true)}
                      title="Editar correo"
                    >
                      <IconoEditar />
                    </button>
                  )}
                </div>
              </div>

              {/* Alerta perfil */}
              {alertaPerfil && (
                <div className={`pf-alerta pf-alerta--${alertaPerfil.tipo}`}>
                  <span className="pf-alerta-icono">
                    {alertaPerfil.tipo === "exito" ? <IconoCheck /> : <IconoError />}
                  </span>
                  <span>{alertaPerfil.mensaje}</span>
                </div>
              )}

              {/* Botón guardar perfil — solo si hay algo editando */}
              {(editandoNombre || editandoCorreo) && (
                <div className="pf-form-footer">
                  <button
                    type="button"
                    className="pf-btn pf-btn--cancelar"
                    onClick={() => {
                      setEditandoNombre(false);
                      setEditandoCorreo(false);
                      setAlertaPerfil(null);
                    }}
                    disabled={guardandoPerfil}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className={`pf-btn pf-btn--guardar ${guardandoPerfil ? "pf-btn--cargando" : ""}`}
                    disabled={guardandoPerfil}
                  >
                    {guardandoPerfil ? (
                      <span className="pf-spinner-wrap">
                        <span className="pf-spinner" /> Guardando…
                      </span>
                    ) : "Guardar cambios"}
                  </button>
                </div>
              )}
            </form>
          </section>

          {/* Divisor */}
          <hr className="pf-divisor" />

          {/* ════════ Sección: cambio de contraseña ════════ */}
          <section className="pf-seccion">
            <h2 className="pf-seccion-titulo">Cambiar contraseña</h2>

            <form onSubmit={handleCambiarPassword} className="pf-form">

              {/* Contraseña actual */}
              <div className="pf-campo">
                <label className="pf-label">Contraseña actual</label>
                <div className="pf-input-wrap">
                  <input
                    type={verActual ? "text" : "password"}
                    className="pf-input"
                    value={password.password_actual}
                    onChange={(e) => setPassword((p) => ({ ...p, password_actual: e.target.value }))}
                    placeholder="••••••••••••••"
                    required
                  />
                  <button
                    type="button"
                    className="pf-btn-ojo"
                    onClick={() => setVerActual((v) => !v)}
                    tabIndex={-1}
                  >
                    <IconoOjo visible={verActual} />
                  </button>
                </div>
              </div>

              {/* Contraseña nueva */}
              <div className="pf-campo">
                <label className="pf-label">Contraseña nueva</label>
                <div className="pf-input-wrap">
                  <input
                    type={verNueva ? "text" : "password"}
                    className="pf-input"
                    value={password.password_nueva}
                    onChange={(e) => setPassword((p) => ({ ...p, password_nueva: e.target.value }))}
                    placeholder="Mínimo 8 caracteres"
                    required
                  />
                  <button
                    type="button"
                    className="pf-btn-ojo"
                    onClick={() => setVerNueva((v) => !v)}
                    tabIndex={-1}
                  >
                    <IconoOjo visible={verNueva} />
                  </button>
                </div>
              </div>

              {/* Confirmar nueva */}
              <div className="pf-campo">
                <label className="pf-label">Confirmar contraseña nueva</label>
                <div className="pf-input-wrap">
                  <input
                    type={verConfirmar ? "text" : "password"}
                    className="pf-input"
                    value={password.confirmar_nueva}
                    onChange={(e) => setPassword((p) => ({ ...p, confirmar_nueva: e.target.value }))}
                    placeholder="Repite la contraseña nueva"
                    required
                  />
                  <button
                    type="button"
                    className="pf-btn-ojo"
                    onClick={() => setVerConfirmar((v) => !v)}
                    tabIndex={-1}
                  >
                    <IconoOjo visible={verConfirmar} />
                  </button>
                </div>
              </div>

              {/* Alerta contraseña */}
              {alertaPass && (
                <div className={`pf-alerta pf-alerta--${alertaPass.tipo}`}>
                  <span className="pf-alerta-icono">
                    {alertaPass.tipo === "exito" ? <IconoCheck /> : <IconoError />}
                  </span>
                  <span>{alertaPass.mensaje}</span>
                </div>
              )}

              <div className="pf-form-footer">
                <button
                  type="submit"
                  className={`pf-btn pf-btn--guardar ${guardandoPass ? "pf-btn--cargando" : ""}`}
                  disabled={guardandoPass}
                >
                  {guardandoPass ? (
                    <span className="pf-spinner-wrap">
                      <span className="pf-spinner" /> Cambiando…
                    </span>
                  ) : "Cambiar contraseña"}
                </button>
              </div>
            </form>
          </section>

        </div>{/* fin contenido */}
      </main>
    </div>
  );
}