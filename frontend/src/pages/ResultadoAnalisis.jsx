import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import BarraLateral from "../components/BarraLateral";
import "../styles/ResultadosAnalisis.css";

/* ─── Iconos SVG inline ─────────────────────────────────────── */
function IconoCheck() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function IconoReloj() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function IconoInfo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function IconoFlechaIzq() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

function IconoFlechaDer() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

/* ─── Badge campo detectado ─────────────────────────────────── */
// El backend devuelve: { nombre_columna, tipo: "PERSONAL"|"SENSIBLE", origen?, descripcion? }
function BadgeDetectado({ campo }) {
  const esSensible = campo.tipo === "SENSIBLE";
  return (
    <div className={`ra-badge ${esSensible ? "ra-badge--sensible" : "ra-badge--personal"}`}>
      <span className="ra-badge-icono">
        <IconoCheck />
      </span>
      <div className="ra-badge-info">
        <span className="ra-badge-nombre">{campo.nombre_columna}</span>
        <span className="ra-badge-tipo">{campo.origen === "diccionario" ? `vía diccionario` : "detectado automáticamente"}</span>
      </div>
      <span className="ra-badge-etiqueta">
        {esSensible ? "SENSIBLE" : "PERSONAL"}
      </span>
    </div>
  );
}

/* ─── Badge campo pendiente ─────────────────────────────────── */
// El backend devuelve pendientes como objetos: { nombre_columna }
function BadgePendiente({ campo }) {
  const nombre = typeof campo === "string" ? campo : campo.nombre_columna;
  return (
    <div className="ra-badge ra-badge--pendiente">
      <span className="ra-badge-icono">
        <IconoReloj />
      </span>
      <div className="ra-badge-info">
        <span className="ra-badge-nombre">{nombre}</span>
        <span className="ra-badge-tipo">sin clasificar</span>
      </div>
      <span className="ra-badge-etiqueta">PENDIENTE</span>
    </div>
  );
}

/* ─── Componente principal ──────────────────────────────────── */
export default function ResultadosAnalisis() {
  const { state } = useLocation();
  const navigate = useNavigate();

  // Si no hay datos redirige a pantalla 7
  useEffect(() => {
    if (!state) {
      navigate("/subir-archivo", { replace: true });
    }
  }, [state, navigate]);

  if (!state) return null;

  // Estructura esperada del backend:
  // { detectados: [{nombre_columna, tipo_dato, es_sensible, fuente}], pendientes: ["VAR_001", ...] }
  const detectados = state.detectados ?? [];
  const pendientes = state.pendientes ?? [];

  const totalDetectados = detectados.length;
  const totalPendientes = pendientes.length;
  const hayDetectados = totalDetectados > 0;
  const hayPendientes = totalPendientes > 0;

  // Datos que se pasan al formulario NuevoTratamiento (pre-cargados)
  function handleContinuar() {
    navigate("/nuevo-tratamiento", {
      state: {
        campos_detectados: detectados,
        campos_pendientes: pendientes,
      },
    });
  }

  return (
    <div className="ra-layout">
      <BarraLateral />

      <main className="ra-main">
        {/* ── Header ── */}
        <div className="ra-header">
          <h1 className="ra-titulo">Resultados del análisis</h1>
          <p className="ra-subtitulo">
            Detectamos lo siguiente en tu archivo
          </p>

          {/* Resumen rápido */}
          <div className="ra-resumen">
            <span className="ra-resumen-item ra-resumen-item--verde">
              <IconoCheck />
              {totalDetectados} campo{totalDetectados !== 1 ? "s" : ""} detectado{totalDetectados !== 1 ? "s" : ""}
            </span>
            <span className="ra-resumen-sep">·</span>
            <span className="ra-resumen-item ra-resumen-item--naranja">
              <IconoReloj />
              {totalPendientes} pendiente{totalPendientes !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* ── Contenido ── */}
        <div className="ra-contenido">

          {/* ── Columnas ── */}
          <div className="ra-columnas">

            {/* Columna izquierda — Detectados */}
            <div className="ra-columna">
              <div className="ra-columna-header ra-columna-header--verde">
                <span className="ra-columna-dot ra-columna-dot--verde" />
                <h2 className="ra-columna-titulo">Datos detectados automáticamente</h2>
                <span className="ra-columna-count">{totalDetectados}</span>
              </div>

              <div className="ra-columna-body">
                {hayDetectados ? (
                  <div className="ra-lista">
                    {detectados.map((campo, i) => (
                      <BadgeDetectado key={i} campo={campo} />
                    ))}
                  </div>
                ) : (
                  <div className="ra-vacio">
                    <div className="ra-vacio-icono"><IconoInfo /></div>
                    <p className="ra-vacio-titulo">No se detectaron campos reconocibles</p>
                    <p className="ra-vacio-desc">
                      Los encabezados de tu archivo parecen ser códigos técnicos.
                      Considera subir un diccionario de datos para mejorar la detección.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Columna derecha — Pendientes */}
            <div className="ra-columna">
              <div className="ra-columna-header ra-columna-header--naranja">
                <span className="ra-columna-dot ra-columna-dot--naranja" />
                <h2 className="ra-columna-titulo">Campos pendientes por completar</h2>
                <span className="ra-columna-count">{totalPendientes}</span>
              </div>

              <div className="ra-columna-body">
                {hayPendientes ? (
                  <>
                    <div className="ra-lista">
                      {pendientes.map((campo, i) => (
                        <BadgePendiente key={i} campo={campo} />
                      ))}
                    </div>
                    <p className="ra-aviso-pendientes">
                      Los campos pendientes los completarás al final del registro
                    </p>
                  </>
                ) : (
                  <div className="ra-vacio ra-vacio--exito">
                    <div className="ra-vacio-icono ra-vacio-icono--verde"><IconoCheck /></div>
                    <p className="ra-vacio-titulo">Todos los campos fueron detectados</p>
                    <p className="ra-vacio-desc">
                      El análisis identificó correctamente todos los encabezados del archivo.
                    </p>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* ── Acciones ── */}
          <div className="ra-acciones">
            <button
              className="ra-btn ra-btn--secundario"
              onClick={() => navigate("/subir-archivo")}
            >
              <IconoFlechaIzq />
              Volver a subir archivo
            </button>

            <button
              className="ra-btn ra-btn--primario"
              onClick={handleContinuar}
            >
              Continuar al formulario RAT
              <IconoFlechaDer />
            </button>
          </div>

        </div>
      </main>
    </div>
  );
}