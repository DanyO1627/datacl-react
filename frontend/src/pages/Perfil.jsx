// frontend/src/pages/Perfil.jsx
// Pantalla 20 — Perfil de organización
// Permite editar nombre y correo, y cambiar contraseña.

import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import BarraLateral from "../components/BarraLateral";
import PermisosCheckboxes from "../components/PermisosCheckboxes";
import {
  crearUsuario,
  listarUsuarios,
  editarUsuario,
  eliminarUsuario,
  resetearPassword,
} from "../services/usuariosService";
import axios from "axios";
import "../styles/perfil.css";

// R10.6 — permisos "en blanco" para inicializar el formulario de creación y
// el modal de editar permisos.
const PERMISOS_VACIOS = {
  tratamientos_ver: false, tratamientos_crear: false, tratamientos_editar: false,
  informes_ver: false, informes_generar: false, informes_eliminar: false,
  riesgos_ver: false,
};

const API = "/api";

// ── Instancia axios con JWT automático ─────────────────────────
const api = axios.create({ baseURL: API });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// GET /organizaciones/logo exige JWT — un <img src="/api/..."> directo no
// manda el header Authorization y siempre da 401. Se pide como blob (así sí
// pasa por el interceptor de arriba) y se arma un object URL local para el
// <img>. Mismo patrón que ya usa obtenerImagenProcesoBlob en tratamientosService.js.
async function obtenerLogoBlobUrl() {
  try {
    const res = await api.get("/organizaciones/logo", { responseType: "blob" });
    return URL.createObjectURL(res.data);
  } catch (err) {
    if (err.response?.status === 404) return null;
    throw err;
  }
}

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
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.hash === "#personalizacion") {
      setTimeout(() => {
        document.getElementById("personalizacion")?.scrollIntoView({ behavior: "smooth" });
      }, 300);
    }
  }, [location.hash]);

  // ── Estado del formulario de perfil ──────────────────────────
  const [perfil, setPerfil] = useState({ nombre: "", correo: "", rut: "" });
  const [editandoNombre, setEditandoNombre] = useState(false);
  const [editandoCorreo, setEditandoCorreo] = useState(false);
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);
  const [alertaPerfil, setAlertaPerfil] = useState(null); // { tipo: "exito"|"error", mensaje }

  // ── Estado de personalización PDF ─────────────────────────────
  const [colorInst, setColorInst] = useState("#7030A0");
  const [logoUrl, setLogoUrl] = useState(null);
  const [subiendoLogo, setSubiendoLogo] = useState(false);
  const [guardandoColor, setGuardandoColor] = useState(false);
  const [alertaPdf, setAlertaPdf] = useState(null);

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

  // ── Estado de gestión de usuarios (R10.6, solo ADMIN_ORG) ─────
  const esAdminOrg = usuario?.rol === "ADMIN_ORG";

  // R10.11 — "Datos de la organización" y "Personalización del informe PDF"
  // los puede gestionar cualquier cuenta que NO sea un MIEMBRO restringido:
  // ADMIN_ORG (camino nuevo) o el camino viejo (Organizacion, rol
  // 'ORGANIZACION' — sigue existiendo, POST /auth/registro todavía crea
  // filas ahí, no en `usuarios`). Es la misma regla que ya aplica el
  // backend en requiere_gestionar_organizacion (jwt.py) para esos dos
  // endpoints. "Gestión de usuarios" es distinto a propósito: ese backend
  // (requiere_admin_org) SÍ exige ser un Usuario con rol ADMIN_ORG
  // exacto — el camino viejo no puede crear subcuentas sin migrar primero,
  // así que esa sección se queda con el check esAdminOrg de siempre.
  // usuario.rol nunca es 'ADMIN' acá (RutaProtegida ya redirige a
  // /dashboardAdmin antes de llegar a /perfil).
  const puedeGestionarOrganizacion = usuario?.rol !== "MIEMBRO";

  const [usuarios, setUsuarios] = useState([]);
  const [cargandoUsuarios, setCargandoUsuarios] = useState(false);
  const [alertaUsuarios, setAlertaUsuarios] = useState(null);

  const [mostrarFormCrear, setMostrarFormCrear] = useState(false);
  const [formCrear, setFormCrear] = useState({ nombre: "", correo: "", password: "", esAdmin: false, permisos: PERMISOS_VACIOS });
  const [creandoUsuario, setCreandoUsuario] = useState(false);

  const [usuarioEditandoPermisos, setUsuarioEditandoPermisos] = useState(null);
  const [permisosEnEdicion, setPermisosEnEdicion] = useState(PERMISOS_VACIOS);
  const [guardandoPermisos, setGuardandoPermisos] = useState(false);

  const [usuarioReseteando, setUsuarioReseteando] = useState(null);
  const [passwordReset, setPasswordReset] = useState({ password_nueva: "", confirmar_password: "" });
  const [reseteando, setReseteando] = useState(false);

  const [usuarioEliminando, setUsuarioEliminando] = useState(null);
  const [eliminandoUsuario, setEliminandoUsuario] = useState(false);

  // ── Pre-rellenar desde GET /auth/me ──────────────────────────
  useEffect(() => {
    let urlCreada = null;
    async function cargarPerfil() {
      try {
        const res = await api.get("/auth/me");
        // R10.1: camino nuevo (usuarios) trae rut/color_institucional/logo_ruta
        // anidados en res.data.organizacion; camino viejo los trae directo.
        const datosOrg = res.data.organizacion || res.data;
        setPerfil({
          nombre: datosOrg.nombre || "",
          correo: datosOrg.correo || "",
          rut:    datosOrg.rut    || "",
        });
        if (datosOrg.color_institucional) setColorInst(datosOrg.color_institucional);
        // R10.11 — GET /organizaciones/logo es ADMIN_ORG-only (o camino
        // viejo); un MIEMBRO no debe ni intentar pedirlo (403 silencioso).
        if (puedeGestionarOrganizacion && datosOrg.logo_ruta) {
          urlCreada = await obtenerLogoBlobUrl();
          setLogoUrl(urlCreada);
        }
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
    // mismo patrón de limpieza que Paso1.jsx/DetalleTratamiento.jsx para sus
    // object URLs de imagen — libera el blob al desmontar o recargar.
    return () => { if (urlCreada) URL.revokeObjectURL(urlCreada); };
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

  // ── Cargar usuarios de la organización (R10.6) ────────────────
  useEffect(() => {
    if (!esAdminOrg) return;
    async function cargarUsuarios() {
      setCargandoUsuarios(true);
      try {
        const datos = await listarUsuarios();
        setUsuarios(datos);
      } catch (err) {
        setAlertaUsuarios({ tipo: "error", mensaje: err.message });
      } finally {
        setCargandoUsuarios(false);
      }
    }
    cargarUsuarios();
  }, [esAdminOrg]);

  // ── Crear usuario ──────────────────────────────────────────────
  async function handleCrearUsuario(e) {
    e.preventDefault();
    setCreandoUsuario(true);
    setAlertaUsuarios(null);
    try {
      const creado = await crearUsuario({
        nombre: formCrear.nombre,
        correo: formCrear.correo,
        password: formCrear.password,
        rol: formCrear.esAdmin ? "ADMIN_ORG" : "MIEMBRO",
        permisos: formCrear.esAdmin ? null : formCrear.permisos,
      });
      setUsuarios((prev) => [...prev, creado]);
      setAlertaUsuarios({ tipo: "exito", mensaje: "Usuario creado correctamente." });
      setMostrarFormCrear(false);
      setFormCrear({ nombre: "", correo: "", password: "", esAdmin: false, permisos: PERMISOS_VACIOS });
    } catch (err) {
      setAlertaUsuarios({ tipo: "error", mensaje: err.message });
    } finally {
      setCreandoUsuario(false);
    }
  }

  // ── Editar permisos ────────────────────────────────────────────
  function abrirEditarPermisos(u) {
    setUsuarioEditandoPermisos(u);
    setPermisosEnEdicion(u.permisos || PERMISOS_VACIOS);
  }

  async function handleGuardarPermisos() {
    setGuardandoPermisos(true);
    try {
      const actualizado = await editarUsuario(usuarioEditandoPermisos.id, { permisos: permisosEnEdicion });
      setUsuarios((prev) => prev.map((u) => (u.id === actualizado.id ? actualizado : u)));
      setUsuarioEditandoPermisos(null);
      setAlertaUsuarios({ tipo: "exito", mensaje: "Permisos actualizados correctamente." });
    } catch (err) {
      setAlertaUsuarios({ tipo: "error", mensaje: err.message });
    } finally {
      setGuardandoPermisos(false);
    }
  }

  // ── Activar / desactivar ───────────────────────────────────────
  async function handleToggleActivo(u) {
    setAlertaUsuarios(null);
    try {
      const actualizado = await editarUsuario(u.id, { activo: !u.activo });
      setUsuarios((prev) => prev.map((x) => (x.id === actualizado.id ? actualizado : x)));
    } catch (err) {
      setAlertaUsuarios({ tipo: "error", mensaje: err.message });
    }
  }

  // ── Resetear contraseña ─────────────────────────────────────────
  function abrirResetearPassword(u) {
    setUsuarioReseteando(u);
    setPasswordReset({ password_nueva: "", confirmar_password: "" });
  }

  async function handleResetearPassword(e) {
    e.preventDefault();
    setReseteando(true);
    try {
      await resetearPassword(usuarioReseteando.id, passwordReset);
      setAlertaUsuarios({ tipo: "exito", mensaje: `Contraseña de ${usuarioReseteando.nombre} actualizada correctamente.` });
      setUsuarioReseteando(null);
    } catch (err) {
      setAlertaUsuarios({ tipo: "error", mensaje: err.message });
    } finally {
      setReseteando(false);
    }
  }

  // ── Eliminar usuario ────────────────────────────────────────────
  async function handleEliminarUsuario() {
    setEliminandoUsuario(true);
    try {
      await eliminarUsuario(usuarioEliminando.id);
      setUsuarios((prev) => prev.filter((u) => u.id !== usuarioEliminando.id));
      setAlertaUsuarios({ tipo: "exito", mensaje: "Usuario eliminado correctamente." });
      setUsuarioEliminando(null);
    } catch (err) {
      setAlertaUsuarios({ tipo: "error", mensaje: err.message });
    } finally {
      setEliminandoUsuario(false);
    }
  }

  // ── Subir logo ────────────────────────────────────────────────
  async function handleSubirLogo(e) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;

    const ext = archivo.name.split(".").pop().toLowerCase();
    if (!["png", "jpg", "jpeg"].includes(ext)) {
      setAlertaPdf({ tipo: "error", mensaje: "Formato no válido. Usa PNG o JPG." });
      return;
    }
    if (archivo.size > 2 * 1024 * 1024) {
      setAlertaPdf({ tipo: "error", mensaje: "El archivo excede 2 MB." });
      return;
    }

    setSubiendoLogo(true);
    setAlertaPdf(null);
    try {
      const formData = new FormData();
      formData.append("archivo", archivo);
      await api.post("/organizaciones/logo", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setLogoUrl(await obtenerLogoBlobUrl());
      setAlertaPdf({ tipo: "exito", mensaje: "Logo subido correctamente." });
    } catch (err) {
      const detalle = err.response?.data?.detail;
      setAlertaPdf({ tipo: "error", mensaje: typeof detalle === "string" ? detalle : "Error al subir el logo." });
    } finally {
      setSubiendoLogo(false);
    }
  }

  async function handleEliminarLogo() {
    try {
      await api.delete("/organizaciones/logo");
      setLogoUrl(null);
      setAlertaPdf({ tipo: "exito", mensaje: "Logo eliminado." });
    } catch {
      setAlertaPdf({ tipo: "error", mensaje: "Error al eliminar el logo." });
    }
  }

  // ── Guardar color ────────────────────────────────────────────
  async function handleGuardarColor() {
    setGuardandoColor(true);
    setAlertaPdf(null);
    try {
      await api.put("/organizaciones/color", { color: colorInst });
      setAlertaPdf({ tipo: "exito", mensaje: "Color guardado correctamente." });
    } catch (err) {
      const detalle = err.response?.data?.detail;
      setAlertaPdf({ tipo: "error", mensaje: typeof detalle === "string" ? detalle : "Error al guardar el color." });
    } finally {
      setGuardandoColor(false);
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

          {/* ════════ Sección: datos de la organización (R10.6/R10.11: ADMIN_ORG + camino viejo) ════════ */}
          {puedeGestionarOrganizacion && (
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

              {/* RUT - no editable */}
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

              {/* Botón guardar perfil - solo si hay algo editando */}
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
          )}

          {/* Divisor — solo si la sección de arriba se mostró */}
          {puedeGestionarOrganizacion && <hr className="pf-divisor" />}

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

          {/* ════════ Sección: personalización PDF (R10.11: ADMIN_ORG + camino viejo) ════════ */}
          {puedeGestionarOrganizacion && (
          <div id="personalizacion" className="pf-contenido" style={{ marginTop: "1.5rem" }}>
            <section className="pf-seccion">
              <h2 className="pf-seccion-titulo" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 4, height: 20, background: colorInst, borderRadius: 2, display: "inline-block" }} />
                Personalización del informe PDF
              </h2>

              <div className="pf-pdf-grid">
                {/* ── Columna izquierda: logo + color ── */}
                <div className="pf-pdf-controles">
                  {/* Logo */}
                  <div className="pf-pdf-bloque">
                    <label className="pf-label">Logo de la organización</label>
                    <span className="pf-pdf-hint">PNG o JPG · Máx. 2 MB</span>

                    <div className="pf-logo-area">
                      {logoUrl ? (
                        <img src={logoUrl} alt="Logo" className="pf-logo-img" />
                      ) : (
                        <div className="pf-logo-placeholder">Sin logo</div>
                      )}
                    </div>

                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                      <label className="pf-btn pf-btn--guardar pf-btn--sm" style={{ cursor: "pointer" }}>
                        {subiendoLogo ? "Subiendo..." : "Subir logo"}
                        <input
                          type="file"
                          accept=".png,.jpg,.jpeg"
                          onChange={handleSubirLogo}
                          style={{ display: "none" }}
                          disabled={subiendoLogo}
                        />
                      </label>
                      <button
                        className="pf-btn pf-btn--cancelar pf-btn--sm"
                        onClick={handleEliminarLogo}
                        disabled={!logoUrl}
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>

                  {/* Color */}
                  <div className="pf-pdf-bloque">
                    <label className="pf-label">Color institucional</label>
                    <span className="pf-pdf-hint">Se aplica al header del PDF generado</span>

                    <div className="pf-color-row">
                      <input
                        type="color"
                        value={colorInst}
                        onChange={(e) => setColorInst(e.target.value)}
                        className="pf-color-picker"
                      />
                      <input
                        type="text"
                        value={colorInst}
                        onChange={(e) => setColorInst(e.target.value)}
                        className="pf-color-hex"
                        maxLength={7}
                      />
                    </div>
                    <div className="pf-color-preview" style={{ background: colorInst }} />
                    <span className="pf-pdf-hint">Vista previa del header del PDF</span>
                  </div>
                </div>

                {/* ── Columna derecha: preview del PDF ── */}
                <div className="pf-pdf-preview-col">
                  <label className="pf-label">Vista previa del PDF</label>
                  <span className="pf-pdf-hint">Se actualiza al cambiar logo o color</span>

                  <div className="pf-pdf-preview">
                    <div className="pf-preview-header" style={{ background: colorInst }}>
                      DataCL · Ley 21.719
                    </div>
                    <div className="pf-preview-body">
                      {logoUrl ? (
                        <img src={logoUrl} alt="Logo" className="pf-preview-logo" />
                      ) : (
                        <div className="pf-preview-logo-placeholder" />
                      )}
                      <p className="pf-preview-nombre">{perfil.nombre || "Nombre de tu organización"}</p>
                      <p className="pf-preview-rut">RUT: {perfil.rut || "00.000.000-0"}</p>
                      <hr className="pf-preview-hr" />
                      <p className="pf-preview-sub">Levantamiento de Actividades de Tratamiento</p>
                      <p className="pf-preview-fecha">Generado por DataCL · {new Date().toLocaleDateString("es-CL")}</p>
                    </div>
                    <div className="pf-preview-nota">
                      El logo y color se aplican solo al PDF, no a la plataforma
                    </div>
                  </div>
                </div>
              </div>

              {/* Alerta PDF */}
              {alertaPdf && (
                <div className={`pf-alerta pf-alerta--${alertaPdf.tipo}`} style={{ marginTop: 12 }}>
                  <span className="pf-alerta-icono">
                    {alertaPdf.tipo === "exito" ? <IconoCheck /> : <IconoError />}
                  </span>
                  <span>{alertaPdf.mensaje}</span>
                </div>
              )}

              {/* Botón guardar + volver */}
              <div className="pf-form-footer" style={{ marginTop: 16 }}>
                {location.hash === "#personalizacion" && (
                  <button
                    className="pf-btn pf-btn--cancelar"
                    onClick={() => navigate("/informes/nuevo")}
                  >
                    ← Volver a generar informe
                  </button>
                )}
                <button
                  className={`pf-btn pf-btn--guardar ${guardandoColor ? "pf-btn--cargando" : ""}`}
                  onClick={handleGuardarColor}
                  disabled={guardandoColor}
                >
                  {guardandoColor ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </section>
          </div>
          )}

          {/* ════════ Sección: gestión de usuarios (solo ADMIN_ORG, R10.6) ════════ */}
          {esAdminOrg && (
          <div className="pf-contenido" style={{ marginTop: "1.5rem" }}>
            <section className="pf-seccion">
              <div className="pf-seccion-header-row">
                <h2 className="pf-seccion-titulo">Gestión de usuarios</h2>
                <button
                  type="button"
                  className="pf-btn pf-btn--guardar pf-btn--sm"
                  onClick={() => setMostrarFormCrear(true)}
                >
                  + Crear usuario
                </button>
              </div>

              {alertaUsuarios && (
                <div className={`pf-alerta pf-alerta--${alertaUsuarios.tipo}`} style={{ marginTop: 12 }}>
                  <span className="pf-alerta-icono">
                    {alertaUsuarios.tipo === "exito" ? <IconoCheck /> : <IconoError />}
                  </span>
                  <span>{alertaUsuarios.mensaje}</span>
                </div>
              )}

              {cargandoUsuarios ? (
                <p className="pf-pdf-hint" style={{ marginTop: 12 }}>Cargando usuarios...</p>
              ) : usuarios.length === 0 ? (
                <p className="pf-pdf-hint" style={{ marginTop: 12 }}>Todavía no hay usuarios creados en esta organización.</p>
              ) : (
                <table className="pf-tabla-usuarios">
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Correo</th>
                      <th>Rol</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usuarios.map((u) => (
                      <tr key={u.id}>
                        <td>{u.nombre}</td>
                        <td>{u.correo}</td>
                        <td>{u.rol === "ADMIN_ORG" ? "Administrador" : "Miembro"}</td>
                        <td>
                          <span className={`pf-usuario-badge ${u.activo ? "pf-usuario-badge--activo" : "pf-usuario-badge--inactivo"}`}>
                            {u.activo ? "Activo" : "Inactivo"}
                          </span>
                        </td>
                        <td className="pf-tabla-acciones">
                          {u.rol === "MIEMBRO" && (
                            <button type="button" className="pf-accion-link" onClick={() => abrirEditarPermisos(u)}>
                              Permisos
                            </button>
                          )}
                          <button type="button" className="pf-accion-link" onClick={() => abrirResetearPassword(u)}>
                            Resetear contraseña
                          </button>
                          <button type="button" className="pf-accion-link" onClick={() => handleToggleActivo(u)}>
                            {u.activo ? "Desactivar" : "Activar"}
                          </button>
                          <button type="button" className="pf-accion-link pf-accion-link--peligro" onClick={() => setUsuarioEliminando(u)}>
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </div>
          )}

      </main>

      {/* ── Modal: crear usuario ── */}
      {mostrarFormCrear && (
        <div className="pf-modal-overlay">
          <div className="pf-modal-card">
            <h3 className="pf-modal-titulo">Crear usuario</h3>
            <form onSubmit={handleCrearUsuario} className="pf-form">
              <div className="pf-campo">
                <label className="pf-label">Nombre</label>
                <input
                  type="text"
                  className="pf-input"
                  value={formCrear.nombre}
                  onChange={(e) => setFormCrear((f) => ({ ...f, nombre: e.target.value }))}
                  required
                />
              </div>
              <div className="pf-campo">
                <label className="pf-label">Correo electrónico</label>
                <input
                  type="email"
                  className="pf-input"
                  value={formCrear.correo}
                  onChange={(e) => setFormCrear((f) => ({ ...f, correo: e.target.value }))}
                  required
                />
              </div>
              <div className="pf-campo">
                <label className="pf-label">Contraseña</label>
                <input
                  type="password"
                  className="pf-input"
                  value={formCrear.password}
                  onChange={(e) => setFormCrear((f) => ({ ...f, password: e.target.value }))}
                  placeholder="Mínimo 8 caracteres"
                  required
                />
              </div>

              <label className="pf-toggle-admin">
                <input
                  type="checkbox"
                  checked={formCrear.esAdmin}
                  onChange={(e) => setFormCrear((f) => ({ ...f, esAdmin: e.target.checked }))}
                />
                <span>Es administrador de la organización</span>
              </label>

              {!formCrear.esAdmin && (
                <div className="pf-campo">
                  <label className="pf-label">Permisos</label>
                  <PermisosCheckboxes
                    permisos={formCrear.permisos}
                    onChange={(p) => setFormCrear((f) => ({ ...f, permisos: p }))}
                  />
                </div>
              )}

              <div className="pf-form-footer">
                <button
                  type="button"
                  className="pf-btn pf-btn--cancelar"
                  onClick={() => setMostrarFormCrear(false)}
                  disabled={creandoUsuario}
                >
                  Cancelar
                </button>
                <button type="submit" className="pf-btn pf-btn--guardar" disabled={creandoUsuario}>
                  {creandoUsuario ? "Creando..." : "Crear usuario"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: editar permisos ── */}
      {usuarioEditandoPermisos && (
        <div className="pf-modal-overlay">
          <div className="pf-modal-card">
            <h3 className="pf-modal-titulo">Permisos de {usuarioEditandoPermisos.nombre}</h3>
            <PermisosCheckboxes permisos={permisosEnEdicion} onChange={setPermisosEnEdicion} />
            <div className="pf-form-footer" style={{ marginTop: 16 }}>
              <button
                type="button"
                className="pf-btn pf-btn--cancelar"
                onClick={() => setUsuarioEditandoPermisos(null)}
                disabled={guardandoPermisos}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="pf-btn pf-btn--guardar"
                onClick={handleGuardarPermisos}
                disabled={guardandoPermisos}
              >
                {guardandoPermisos ? "Guardando..." : "Guardar permisos"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: resetear contraseña ── */}
      {usuarioReseteando && (
        <div className="pf-modal-overlay">
          <div className="pf-modal-card">
            <h3 className="pf-modal-titulo">Resetear contraseña de {usuarioReseteando.nombre}</h3>
            <form onSubmit={handleResetearPassword} className="pf-form">
              <div className="pf-campo">
                <label className="pf-label">Contraseña nueva</label>
                <input
                  type="password"
                  className="pf-input"
                  value={passwordReset.password_nueva}
                  onChange={(e) => setPasswordReset((p) => ({ ...p, password_nueva: e.target.value }))}
                  placeholder="Mínimo 8 caracteres"
                  required
                />
              </div>
              <div className="pf-campo">
                <label className="pf-label">Confirmar contraseña nueva</label>
                <input
                  type="password"
                  className="pf-input"
                  value={passwordReset.confirmar_password}
                  onChange={(e) => setPasswordReset((p) => ({ ...p, confirmar_password: e.target.value }))}
                  required
                />
              </div>
              <p className="pf-pdf-hint">La persona deberá cambiarla de nuevo al iniciar sesión.</p>
              <div className="pf-form-footer">
                <button
                  type="button"
                  className="pf-btn pf-btn--cancelar"
                  onClick={() => setUsuarioReseteando(null)}
                  disabled={reseteando}
                >
                  Cancelar
                </button>
                <button type="submit" className="pf-btn pf-btn--guardar" disabled={reseteando}>
                  {reseteando ? "Guardando..." : "Resetear contraseña"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: confirmar eliminar ── */}
      {usuarioEliminando && (
        <div className="pf-modal-overlay">
          <div className="pf-modal-card">
            <h3 className="pf-modal-titulo">¿Eliminar usuario?</h3>
            <p>
              Esta acción no se puede deshacer. Se eliminará a
              <strong> "{usuarioEliminando.nombre}"</strong> ({usuarioEliminando.correo}).
            </p>
            <div className="pf-form-footer">
              <button
                type="button"
                className="pf-btn pf-btn--cancelar"
                onClick={() => setUsuarioEliminando(null)}
                disabled={eliminandoUsuario}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="pf-btn pf-btn--eliminar"
                onClick={handleEliminarUsuario}
                disabled={eliminandoUsuario}
              >
                {eliminandoUsuario ? "Eliminando..." : "Sí, eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
