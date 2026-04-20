import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { analizarArchivo } from "../services/analisisService";
import BarraLateral from "../components/BarraLateral";
import "../styles/CargaArchivo.css";

/* ─── Íconos SVG ─────────────────────────────────────────────── */
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

function IconoInfo() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

/* ─── Componente Alert inline ────────────────────────────────── */
function Alert({ tipo, mensaje, detalle }) {
  // tipo: "error" | "advertencia"
  const esError = tipo === "error";
  return (
    <div className={`ca-alert ca-alert--${tipo}`}>
      <span className="ca-alert-icono">
        {esError ? <IconoAlerta /> : <IconoInfo />}
      </span>
      <div className="ca-alert-texto">
        <span className="ca-alert-mensaje">{mensaje}</span>
        {detalle && <span className="ca-alert-detalle">{detalle}</span>}
      </div>
    </div>
  );
}

export default function CargaArchivo() {
  const [archivo, setArchivo] = useState(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [diccionarioAbierto, setDiccionarioAbierto] = useState(false);
  const [tieneDiccionario, setTieneDiccionario] = useState(false);
  const [archivoDiccionario, setArchivoDiccionario] = useState(null);
  const inputRef = useRef(null);
  const inputDiccionarioRef = useRef(null);

  // ── Estado de error ────────────────────────────────────────
  // { tipo: "error"|"advertencia", mensaje: string, detalle?: string }
  const [alerta, setAlerta] = useState(null);

  const navigate = useNavigate();

  // ── Drag & drop ────────────────────────────────────────────
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setArrastrando(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setArrastrando(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setArrastrando(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!esFormatoValido(file)) {
      setAlerta({
        tipo: "error",
        mensaje: "Formato no permitido.",
        detalle: `El archivo "${file.name}" no es compatible. Usa CSV o Excel (.xlsx, .xls).`,
      });
      return;
    }
    setAlerta(null);
    setArchivo(file);
  }, []);

  // ── Input file ─────────────────────────────────────────────
  const handleSeleccionar = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!esFormatoValido(file)) {
      setAlerta({
        tipo: "error",
        mensaje: "Formato no permitido.",
        detalle: `El archivo "${file.name}" no es compatible. Usa CSV o Excel (.xlsx, .xls).`,
      });
      e.target.value = "";
      return;
    }
    setAlerta(null);
    setArchivo(file);
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
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  // ── Analizar ───────────────────────────────────────────────
  async function handleAnalizar() {
    if (!archivo) return;

    setCargando(true);
    setAlerta(null);

    try {
      const resultado = await analizarArchivo(
        archivo,
        tieneDiccionario ? archivoDiccionario : null
      );

      // ── Caso especial: el backend respondió bien pero no detectó nada ──
      // Si detectados está vacío, advertimos antes de navegar
      if (!resultado.detectados || resultado.detectados.length === 0) {
        setAlerta({
          tipo: "advertencia",
          mensaje: "No se detectaron campos reconocibles en el archivo.",
          detalle:
            "Los encabezados parecen ser códigos técnicos. Activa la opción de diccionario de datos a continuación para mejorar la detección.",
        });
        setCargando(false);
        return; // no navegar — dejar al usuario usar el diccionario
      }

      // Todo bien → navegar a resultados
      navigate("/resultados-analisis", { state: resultado });

    } catch (err) {
      // ── Error de red / backend no responde ──────────────────
      if (!err.response) {
        setAlerta({
          tipo: "error",
          mensaje: "Error de conexión. Intenta nuevamente.",
          detalle: "No se pudo conectar con el servidor. Verifica que el backend esté corriendo en el puerto 8000.",
        });
        setCargando(false);
        return;
      }

      // ── Error HTTP del backend (400, 413, 422, 500…) ────────
      const status = err.response.status;
      const detalleBk = err.response?.data?.detail;

      // Mensaje por defecto según código HTTP
      const mensajePorStatus = {
        400: "El archivo no es válido.",
        413: "El archivo es demasiado grande. El límite es 5 MB.",
        422: "El archivo tiene un formato incorrecto.",
        500: "Error interno del servidor. Intenta más tarde.",
      };

      setAlerta({
        tipo: "error",
        mensaje: mensajePorStatus[status] ?? `Error inesperado (código ${status}).`,
        // Si el backend mandó un mensaje específico en español, lo mostramos como detalle
        detalle: typeof detalleBk === "string" ? detalleBk : undefined,
      });

    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="ca-layout">
      <BarraLateral />

      <main className="ca-main">
        <div className="ca-header">
          <h1 className="ca-titulo">Subir archivo</h1>
          <p className="ca-subtitulo">
            Sube tu base de datos y detectaremos automáticamente los datos personales
          </p>
        </div>

        <div className="ca-contenido">

          {/* ── Zona de carga principal ── */}
          <div className="ca-zona-wrapper">
            <div
              className={`ca-zona ${arrastrando ? "ca-zona--arrastrando" : ""} ${archivo ? "ca-zona--con-archivo" : ""}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !archivo && inputRef.current?.click()}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="ca-input-hidden"
                onChange={handleSeleccionar}
              />

              {!archivo ? (
                <>
                  <div className="ca-nube-icono">
                    <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="16 16 12 12 8 16" />
                      <line x1="12" y1="12" x2="12" y2="21" />
                      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
                    </svg>
                  </div>
                  <p className="ca-zona-texto-principal">Arrastra tu archivo aquí</p>
                  <p className="ca-zona-texto-o">o</p>
                  <button
                    className="ca-btn-seleccionar"
                    onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
                  >
                    Seleccionar archivo
                  </button>
                </>
              ) : (
                <div className="ca-archivo-info">
                  <div className="ca-archivo-icono">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  </div>
                  <div className="ca-archivo-detalles">
                    <span className="ca-archivo-nombre">{archivo.name}</span>
                    <span className="ca-archivo-tamano">{formatearTamano(archivo.size)}</span>
                  </div>
                  <button
                    className="ca-btn-quitar"
                    onClick={(e) => {
                      e.stopPropagation();
                      setArchivo(null);
                      setAlerta(null);
                    }}
                    title="Quitar archivo"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              )}
            </div>

            <p className="ca-formatos">Formatos aceptados: CSV, Excel (.xlsx, .xls)</p>

            {/* ── Alerta de error o advertencia ── */}
            {alerta && (
              <Alert
                tipo={alerta.tipo}
                mensaje={alerta.mensaje}
                detalle={alerta.detalle}
              />
            )}

            <div className="ca-analizar-row">
              <button
                className={`ca-btn-analizar ${!archivo || cargando ? "ca-btn-analizar--disabled" : ""}`}
                disabled={!archivo || cargando}
                onClick={handleAnalizar}
              >
                {cargando ? (
                  <span className="ca-btn-spinner-wrap">
                    <span className="ca-spinner" />
                    Analizando...
                  </span>
                ) : (
                  "Analizar archivo"
                )}
              </button>
            </div>
          </div>

          {/* ── Divisor ── */}
          <hr className="ca-divisor" />

          {/* ── Acordeón diccionario ── */}
          <div className="ca-acordeon">
            <div
              className="ca-acordeon-header"
              onClick={() => setDiccionarioAbierto((v) => !v)}
            >
              <div className="ca-acordeon-check-wrap">
                <input
                  type="checkbox"
                  className="ca-check"
                  checked={tieneDiccionario}
                  onChange={(e) => {
                    e.stopPropagation();
                    const val = e.target.checked;
                    setTieneDiccionario(val);
                    setDiccionarioAbierto(val);
                    if (!val) setArchivoDiccionario(null);
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
                <span className="ca-acordeon-pregunta">
                  ¿Tu base de datos tiene nombres técnicos?
                </span>
              </div>
              <span className={`ca-acordeon-chevron ${diccionarioAbierto ? "ca-acordeon-chevron--abierto" : ""}`}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </span>
            </div>

            {diccionarioAbierto && (
              <div className="ca-acordeon-body">
                <p className="ca-acordeon-desc">
                  Si los encabezados de tu archivo son códigos, sube un diccionario de datos
                  para ayudarnos a identificar la información.
                </p>

                {/* Tabla formato esperado */}
                <div className="ca-formato-tabla-wrap">
                  <p className="ca-formato-titulo">Formato esperado del diccionario:</p>
                  <table className="ca-formato-tabla">
                    <thead>
                      <tr>
                        <th>nombre_tecnico</th>
                        <th>descripcion</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>nomb_usu</td>
                        <td>Nombre completo del usuario</td>
                      </tr>
                      <tr>
                        <td>fch_nac</td>
                        <td>Fecha de nacimiento</td>
                      </tr>
                      <tr>
                        <td>dir_dom</td>
                        <td>Dirección de domicilio</td>
                      </tr>
                    </tbody>
                  </table>
                  <p className="ca-formato-nota">Acepta CSV o JSON con esas dos columnas/claves.</p>
                </div>

                {/* Zona de carga diccionario */}
                <div className="ca-dic-zona-wrap">
                  {!archivoDiccionario ? (
                    <div
                      className="ca-dic-zona"
                      onClick={() => inputDiccionarioRef.current?.click()}
                    >
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="12" y1="18" x2="12" y2="12" />
                        <line x1="9" y1="15" x2="15" y2="15" />
                      </svg>
                      <span className="ca-dic-zona-texto">Subir diccionario</span>
                      <span className="ca-dic-zona-sub">CSV o JSON</span>
                    </div>
                  ) : (
                    <div className="ca-dic-archivo">
                      <div className="ca-archivo-icono" style={{ color: "var(--mid)" }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                      </div>
                      <span className="ca-dic-archivo-nombre">{archivoDiccionario.name}</span>
                      <button
                        className="ca-btn-quitar"
                        onClick={() => setArchivoDiccionario(null)}
                        title="Quitar diccionario"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                  )}
                  <input
                    ref={inputDiccionarioRef}
                    type="file"
                    accept=".json,.csv"
                    className="ca-input-hidden"
                    onChange={handleSeleccionarDiccionario}
                  />
                  {archivoDiccionario && (
                    <button
                      className="ca-btn-seleccionar-dic"
                      onClick={() => inputDiccionarioRef.current?.click()}
                    >
                      Cambiar archivo
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}