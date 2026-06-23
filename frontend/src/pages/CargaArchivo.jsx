import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { analizarArchivo, analizarSoloDiccionario } from "../services/analisisService";
import BarraLateral from "../components/BarraLateral";
import "../styles/CargaArchivo.css";

/* ─── Íconos opciones ────────────────────────────────────────── */
function IconoArchivo() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  );
}

function IconoBD() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3"/>
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
      <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"/>
    </svg>
  );
}

function IconoManual() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  );
}

function IconoHistorial() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 4 1 10 7 10"/>
      <path d="M3.51 15a9 9 0 1 0 .49-4.02"/>
      <polyline points="12 7 12 12 15 15"/>
    </svg>
  );
}

function IconoAlerta() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

/* ─── Alert inline ───────────────────────────────────────────── */
function Alert({ tipo, mensaje, detalle }) {
  return (
    <div className={`ca-alert ca-alert--${tipo}`}>
      <span className="ca-alert-icono"><IconoAlerta /></span>
      <div className="ca-alert-texto">
        <span className="ca-alert-mensaje">{mensaje}</span>
        {detalle && <span className="ca-alert-detalle">{detalle}</span>}
      </div>
    </div>
  );
}

/* ─── Opciones de fuente ─────────────────────────────────────── */
const OPCIONES = [
  { id: "bd",       titulo: "Conectar a BD",          desc: "MySQL, PostgreSQL…",          icono: <IconoBD />,      deshabilitado: false },
  { id: "archivo",  titulo: "Subir archivo",         desc: "CSV o Excel (.xlsx, .xls)",  icono: <IconoArchivo />, deshabilitado: false },
  { id: "manual",   titulo: "Ingresar manualmente",   desc: "Sin archivo",                 icono: <IconoManual />,  deshabilitado: false },
  { id: "sesiones", titulo: "Sesiones anteriores",    desc: "Reutilizar análisis previo",  icono: <IconoHistorial />, deshabilitado: false },
];

/* ─── Componente principal (NuevaSesion) ─────────────────────── */
export default function NuevaSesion() {
  const navigate = useNavigate();

  /* Fuente activa */
  const [fuenteActiva, setFuenteActiva] = useState("bd");

  /* ── Estado subir archivo ──────────────────────────────────── */
  const [archivos, setArchivos]                    = useState([]);
  const [arrastrando, setArrastrando]             = useState(false);
  const [cargando, setCargando]                   = useState(false);
  const [diccionarioAbierto, setDiccionarioAbierto] = useState(false);
  const [tieneDiccionario, setTieneDiccionario]   = useState(false);
  const [archivoDiccionario, setArchivoDiccionario] = useState(null);
  const [alerta, setAlerta]                       = useState(null);
  const inputRef             = useRef(null);
  const inputDiccionarioRef  = useRef(null);

  /* ── Estado modo "solo diccionario" ────────────────────────── */
  const [modoCarga, setModoCarga]               = useState("archivo"); // "archivo" | "diccionario"
  const [diccionarioSolo, setDiccionarioSolo]   = useState(null);
  const inputDiccionarioSoloRef                 = useRef(null);

  /* ── Estado sesiones anteriores ────────────────────────────── */
  const [sesiones, setSesiones]               = useState([]);
  const [cargandoSesiones, setCargandoSesiones] = useState(false);

  useEffect(() => {
    if (fuenteActiva === "sesiones") cargarSesiones();
  }, [fuenteActiva]);

  async function cargarSesiones() {
    setCargandoSesiones(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:8000/sesiones", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setSesiones(await res.json());
      else setSesiones([]);
    } catch {
      setSesiones([]);
    } finally {
      setCargandoSesiones(false);
    }
  }

  /* ── Selección de fuente ───────────────────────────────────── */
  function handleOpcion(id, deshabilitado) {
    if (deshabilitado) return;
    if (id === "manual") { navigate("/nueva-sesion/manual"); return; }
    setFuenteActiva(id);
  }

  /* ── Drag & drop + selección multi-archivo ──────────────────── */
  const MAX_ARCHIVOS = 5;
  const handleDragOver  = useCallback((e) => { e.preventDefault(); setArrastrando(true);  }, []);
  const handleDragLeave = useCallback((e) => { e.preventDefault(); setArrastrando(false); }, []);

  function agregarArchivos(nuevos) {
    const invalidos = nuevos.filter((f) => !esFormatoValido(f));
    const validos = nuevos.filter((f) => esFormatoValido(f) && !archivos.some((a) => a.name === f.name));

    if (invalidos.length > 0) {
      setAlerta({ tipo: "error", mensaje: "Formato no permitido.", detalle: `"${invalidos[0].name}" no es compatible. Usa CSV o Excel (.xlsx, .xls).` });
      if (validos.length === 0) return;
    }

    if (archivos.length + validos.length > MAX_ARCHIVOS) {
      setAlerta({ tipo: "error", mensaje: `Máximo ${MAX_ARCHIVOS} archivos por sesión.` });
      return;
    }

    setArchivos([...archivos, ...validos]);
    if (invalidos.length === 0) setAlerta(null);
  }

  function quitarArchivo(nombre) {
    setArchivos(archivos.filter((a) => a.name !== nombre));
    setAlerta(null);
  }

  function handleDrop(e) {
    e.preventDefault();
    setArrastrando(false);
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length > 0) agregarArchivos(files);
  }

  const handleSeleccionar = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) agregarArchivos(files);
    e.target.value = "";
  };

  const handleSeleccionarDiccionario = (e) => {
    const file = e.target.files?.[0];
    if (file) setArchivoDiccionario(file);
    e.target.value = "";
  };

  function esFormatoValido(file) {
    const ext = file.name.split(".").pop().toLowerCase();
    return ["csv", "xlsx", "xls"].includes(ext);
  }

  function formatearTamano(bytes) {
    if (bytes < 1024)        return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  /* ── Manejo de errores de /analizar (compartido) ───────────── */
  function manejarErrorAnalisis(err) {
    if (!err.response) {
      setAlerta({ tipo: "error", mensaje: "Error de conexión. Intenta nuevamente.", detalle: "No se pudo conectar con el servidor. Verifica que el backend esté corriendo en el puerto 8000." });
      return;
    }
    const status = err.response.status;
    const detalleBk = err.response?.data?.detail;
    const mensajePorStatus = { 400: "El archivo no es válido.", 413: "El archivo es demasiado grande. El límite es 5 MB.", 422: "El archivo tiene un formato incorrecto.", 500: "Error interno del servidor. Intenta más tarde." };
    setAlerta({ tipo: "error", mensaje: mensajePorStatus[status] ?? `Error inesperado (código ${status}).`, detalle: typeof detalleBk === "string" ? detalleBk : undefined });
  }

  /* ── Analizar archivo ──────────────────────────────────────── */
  async function handleAnalizar() {
    if (archivos.length === 0) return;
    setCargando(true);
    setAlerta(null);
    try {
      const resultado = await analizarArchivo(archivos, tieneDiccionario ? archivoDiccionario : null);
      if (resultado.errores && resultado.errores.length > 0 && (!resultado.detectados || resultado.detectados.length === 0)) {
        setAlerta({
          tipo: "error",
          mensaje: "No se pudieron procesar los archivos.",
          detalle: resultado.errores.map((e) => `${e.archivo}: ${e.error}`).join("; "),
        });
        setCargando(false);
        return;
      }
      if (!resultado.detectados || resultado.detectados.length === 0) {
        setAlerta({
          tipo: "advertencia",
          mensaje: "No se detectaron campos reconocibles.",
          detalle: "Los encabezados parecen ser códigos técnicos. Activa la opción de diccionario de datos a continuación para mejorar la detección.",
        });
        setCargando(false);
        return;
      }
      navigate("/resultados-analisis", { state: resultado });
    } catch (err) {
      manejarErrorAnalisis(err);
    } finally {
      setCargando(false);
    }
  }

  /* ── Analizar solo diccionario (sin datos reales) ──────────── */
  async function handleAnalizarDiccionario() {
    if (!diccionarioSolo) return;
    setCargando(true);
    setAlerta(null);
    try {
      const resultado = await analizarSoloDiccionario(diccionarioSolo);
      if (!resultado.detectados || resultado.detectados.length === 0) {
        setAlerta({
          tipo: "advertencia",
          mensaje: "No se detectaron campos reconocibles en el diccionario.",
          detalle: "Revisa que la columna de descripciones tenga texto descriptivo (ej: \"Nombre completo del cliente\").",
        });
        setCargando(false);
        return;
      }
      navigate("/resultados-analisis", { state: resultado });
    } catch (err) {
      manejarErrorAnalisis(err);
    } finally {
      setCargando(false);
    }
  }

  const handleSeleccionarDiccionarioSolo = (e) => {
    const file = e.target.files?.[0];
    if (file) setDiccionarioSolo(file);
    e.target.value = "";
  };

  /* ── Reutilizar sesión anterior ────────────────────────────── */
  function handleReutilizar(sesion) {
    navigate("/resultados-analisis", {
      state: {
        detectados: sesion.columnas_json || [],
        pendientes: [],
      },
    });
  }

  /* ── Render ────────────────────────────────────────────────── */
  return (
    <div className="ca-layout">
      <BarraLateral />

      <main className="ca-main">
        <div className="ca-header">
          <h1 className="ca-titulo">Nueva sesión</h1>
          <p className="ca-subtitulo">Elige cómo quieres ingresar los datos a analizar</p>
        </div>

        {/* ── Grid de 4 opciones ── */}
        <div className="ns-grid">
          {OPCIONES.map((op) => (
            <button
              key={op.id}
              className={`ns-card ${fuenteActiva === op.id ? "ns-card--activa" : ""} ${op.deshabilitado ? "ns-card--deshabilitado" : ""}`}
              onClick={() => handleOpcion(op.id, op.deshabilitado)}
              disabled={op.deshabilitado}
              title={op.deshabilitado ? "Próximamente" : undefined}
            >
              <div className="ns-card-icono">{op.icono}</div>
              <span className="ns-card-titulo">{op.titulo}</span>
              <span className="ns-card-desc">{op.deshabilitado ? "Próximamente" : op.desc}</span>
            </button>
          ))}
        </div>

        {/* ── Conectar a BD (CTA) ── */}
        {fuenteActiva === "bd" && (
          <div className="ca-contenido ca-bd-cta" style={{ textAlign: "center", padding: "2.5rem 1.5rem" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🗄️</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#052659", margin: "0 0 8px" }}>
              Conecta tu base de datos
            </h3>
            <p style={{ fontSize: 14, color: "#5483B3", margin: "0 0 20px", maxWidth: 480, marginInline: "auto" }}>
              DataCL leerá solo los nombres de tablas y columnas — nunca accede al contenido de tus registros ni guarda tus credenciales.
            </p>
            <button
              className="ns-btn-ir-archivo"
              style={{ background: "#052659", color: "#fff", border: "none", borderRadius: 10, padding: "12px 28px", fontSize: 15, fontWeight: 600, cursor: "pointer" }}
              onClick={() => navigate("/nueva-sesion/conexion-bd")}
            >
              Configurar conexión →
            </button>
          </div>
        )}

        {/* ── Subir archivo ── */}
        {fuenteActiva === "archivo" && (
          <div className="ca-contenido">

            {/* Tabs: archivo de datos vs. solo diccionario */}
            <div className="ca-modo-tabs">
              <button
                className={`ca-modo-tab ${modoCarga === "archivo" ? "ca-modo-tab--activo" : ""}`}
                onClick={() => { setModoCarga("archivo"); setAlerta(null); }}
              >
                Subir archivo de datos
              </button>
              <button
                className={`ca-modo-tab ${modoCarga === "diccionario" ? "ca-modo-tab--activo" : ""}`}
                onClick={() => { setModoCarga("diccionario"); setAlerta(null); }}
              >
                Subir solo diccionario de datos
              </button>
            </div>

            {modoCarga === "archivo" && (
            <>
            <div className="ca-zona-wrapper">
              <div
                className={`ca-zona ${arrastrando ? "ca-zona--arrastrando" : ""}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => archivos.length < MAX_ARCHIVOS && inputRef.current?.click()}
              >
                <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" multiple className="ca-input-hidden" onChange={handleSeleccionar} />
                <div className="ca-nube-icono">
                  <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="16 16 12 12 8 16"/>
                    <line x1="12" y1="12" x2="12" y2="21"/>
                    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
                  </svg>
                </div>
                <p className="ca-zona-texto-principal">
                  {archivos.length === 0 ? "Arrastra tus archivos aquí" : "Arrastra más archivos aquí"}
                </p>
                <p className="ca-zona-texto-o">o</p>
                <button className="ca-btn-seleccionar" onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}>
                  {archivos.length === 0 ? "Seleccionar archivos" : "Agregar archivos"}
                </button>
              </div>

              {archivos.length > 0 && (
                <div className="ca-archivos-lista">
                  {archivos.map((a) => (
                    <div key={a.name} className="ca-archivo-info">
                      <div className="ca-archivo-icono">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14 2 14 8 20 8"/>
                        </svg>
                      </div>
                      <div className="ca-archivo-detalles">
                        <span className="ca-archivo-nombre">{a.name}</span>
                        <span className="ca-archivo-tamano">{formatearTamano(a.size)}</span>
                      </div>
                      <button className="ca-btn-quitar" onClick={() => quitarArchivo(a.name)} title="Quitar archivo">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </button>
                    </div>
                  ))}
                  <span className="ca-archivos-contador">{archivos.length} de {MAX_ARCHIVOS} archivos</span>
                </div>
              )}

              <p className="ca-formatos">Formatos aceptados: CSV, Excel (.xlsx, .xls) · Máximo {MAX_ARCHIVOS} archivos</p>

              {alerta && <Alert tipo={alerta.tipo} mensaje={alerta.mensaje} detalle={alerta.detalle} />}

              <div className="ca-analizar-row">
                <button className={`ca-btn-analizar ${archivos.length === 0 || cargando ? "ca-btn-analizar--disabled" : ""}`} disabled={archivos.length === 0 || cargando} onClick={handleAnalizar}>
                  {cargando ? (
                    <span className="ca-btn-spinner-wrap"><span className="ca-spinner" />Analizando...</span>
                  ) : `Analizar archivo${archivos.length > 1 ? "s" : ""}`}
                </button>
              </div>
            </div>

            <hr className="ca-divisor" />

            {/* Acordeón diccionario */}
            <div className="ca-acordeon">
              <div className="ca-acordeon-header" onClick={() => setDiccionarioAbierto((v) => !v)}>
                <div className="ca-acordeon-check-wrap">
                  <input type="checkbox" className="ca-check" checked={tieneDiccionario}
                    onChange={(e) => { e.stopPropagation(); const val = e.target.checked; setTieneDiccionario(val); setDiccionarioAbierto(val); if (!val) setArchivoDiccionario(null); }}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className="ca-acordeon-pregunta">¿Tu base de datos tiene nombres técnicos?</span>
                </div>
                <span className={`ca-acordeon-chevron ${diccionarioAbierto ? "ca-acordeon-chevron--abierto" : ""}`}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </span>
              </div>

              {diccionarioAbierto && (
                <div className="ca-acordeon-body">
                  <p className="ca-acordeon-desc">Si los encabezados de tu archivo son códigos, sube un diccionario de datos para ayudarnos a identificar la información.</p>
                  <div className="ca-formato-tabla-wrap">
                    <p className="ca-formato-titulo">Formato esperado del diccionario:</p>
                    <table className="ca-formato-tabla">
                      <thead><tr><th>nombre_tecnico</th><th>descripcion</th></tr></thead>
                      <tbody>
                        <tr><td>nomb_usu</td><td>Nombre completo del usuario</td></tr>
                        <tr><td>fch_nac</td><td>Fecha de nacimiento</td></tr>
                        <tr><td>dir_dom</td><td>Dirección de domicilio</td></tr>
                      </tbody>
                    </table>
                    <p className="ca-formato-nota">Acepta CSV o JSON con esas dos columnas/claves.</p>
                  </div>
                  <div className="ca-dic-zona-wrap">
                    {!archivoDiccionario ? (
                      <div className="ca-dic-zona" onClick={() => inputDiccionarioRef.current?.click()}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14 2 14 8 20 8"/>
                          <line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>
                        </svg>
                        <span className="ca-dic-zona-texto">Subir diccionario</span>
                        <span className="ca-dic-zona-sub">CSV o JSON</span>
                      </div>
                    ) : (
                      <div className="ca-dic-archivo">
                        <div className="ca-archivo-icono" style={{ color: "var(--mid)" }}>
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                          </svg>
                        </div>
                        <span className="ca-dic-archivo-nombre">{archivoDiccionario.name}</span>
                        <button className="ca-btn-quitar" onClick={() => setArchivoDiccionario(null)} title="Quitar diccionario">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                          </svg>
                        </button>
                      </div>
                    )}
                    <input ref={inputDiccionarioRef} type="file" accept=".json,.csv" className="ca-input-hidden" onChange={handleSeleccionarDiccionario} />
                    {archivoDiccionario && (
                      <button className="ca-btn-seleccionar-dic" onClick={() => inputDiccionarioRef.current?.click()}>Cambiar archivo</button>
                    )}
                  </div>
                </div>
              )}
            </div>
            </>
            )}

            {modoCarga === "diccionario" && (
            <div className="ca-zona-wrapper">
              <p className="ca-acordeon-desc">
                No necesitas subir tus datos reales: sube solo un diccionario técnico (nombre de
                columna + descripción) y clasificaremos los campos según las descripciones.
                Si prefieres ingresar los campos a mano, usa la opción "Ingresar manualmente" del menú superior.
              </p>

              <div className="ca-formato-tabla-wrap" style={{ width: "100%" }}>
                <p className="ca-formato-titulo">Formato esperado del diccionario:</p>
                <table className="ca-formato-tabla">
                  <thead><tr><th>nombre_tecnico</th><th>descripcion</th></tr></thead>
                  <tbody>
                    <tr><td>KUNNR</td><td>Número de identificación del cliente</td></tr>
                    <tr><td>VBELN</td><td>Diagnóstico médico asociado al paciente</td></tr>
                    <tr><td>BUKRS</td><td>Código de la empresa</td></tr>
                  </tbody>
                </table>
                <p className="ca-formato-nota">Acepta CSV o JSON con esas dos columnas/claves.</p>
              </div>

              <div className="ca-dic-zona-wrap">
                {!diccionarioSolo ? (
                  <div className="ca-dic-zona" onClick={() => inputDiccionarioSoloRef.current?.click()}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                      <line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>
                    </svg>
                    <span className="ca-dic-zona-texto">Subir diccionario</span>
                    <span className="ca-dic-zona-sub">CSV o JSON</span>
                  </div>
                ) : (
                  <div className="ca-dic-archivo">
                    <div className="ca-archivo-icono" style={{ color: "var(--mid)" }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                      </svg>
                    </div>
                    <span className="ca-dic-archivo-nombre">{diccionarioSolo.name}</span>
                    <button className="ca-btn-quitar" onClick={() => setDiccionarioSolo(null)} title="Quitar diccionario">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>
                )}
                <input ref={inputDiccionarioSoloRef} type="file" accept=".json,.csv" className="ca-input-hidden" onChange={handleSeleccionarDiccionarioSolo} />
                {diccionarioSolo && (
                  <button className="ca-btn-seleccionar-dic" onClick={() => inputDiccionarioSoloRef.current?.click()}>Cambiar archivo</button>
                )}
              </div>

              {alerta && <Alert tipo={alerta.tipo} mensaje={alerta.mensaje} detalle={alerta.detalle} />}

              <div className="ca-analizar-row">
                <button
                  className={`ca-btn-analizar ${!diccionarioSolo || cargando ? "ca-btn-analizar--disabled" : ""}`}
                  disabled={!diccionarioSolo || cargando}
                  onClick={handleAnalizarDiccionario}
                >
                  {cargando ? (
                    <span className="ca-btn-spinner-wrap"><span className="ca-spinner" />Analizando...</span>
                  ) : "Analizar diccionario"}
                </button>
              </div>
            </div>
            )}
          </div>
        )}

        {/* ── Sesiones anteriores ── */}
        {fuenteActiva === "sesiones" && (
          <div className="ns-sesiones-wrap">
            {cargandoSesiones ? (
              <p className="ns-sesiones-msg">Cargando sesiones...</p>
            ) : sesiones.length === 0 ? (
              <div className="ns-sesiones-vacio">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#b8d4ec" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="1 4 1 10 7 10"/>
                  <path d="M3.51 15a9 9 0 1 0 .49-4.02"/>
                  <polyline points="12 7 12 12 15 15"/>
                </svg>
                <p className="ns-sesiones-vacio-titulo">No tienes sesiones anteriores</p>
                <p className="ns-sesiones-vacio-desc">Las sesiones se guardan al analizar un archivo. Usa "Subir archivo" para crear tu primera sesión.</p>
                <button className="ns-btn-ir-archivo" onClick={() => setFuenteActiva("archivo")}>
                  Subir un archivo
                </button>
              </div>
            ) : (
              <div className="ns-sesiones-lista">
                {sesiones.map((s) => (
                  <div key={s.id} className="ns-sesion-item">
                    <div className="ns-sesion-info">
                      <span className="ns-sesion-nombre">{s.nombre || `Sesión ${s.id}`}</span>
                      <span className="ns-sesion-meta">
                        {s.total_detectados ?? 0} campos detectados ·{" "}
                        {s.creado_en ? new Date(s.creado_en).toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—"}
                      </span>
                    </div>
                    <button className="ns-btn-reutilizar" onClick={() => handleReutilizar(s)}>
                      Reutilizar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
