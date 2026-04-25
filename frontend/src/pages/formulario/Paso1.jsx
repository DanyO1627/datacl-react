import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useFormulario } from "../../context/FormularioContext";
import BarraLateral from "../../components/BarraLateral";
import "../../styles/formularioCss/paso1.css";

/* ─── Opciones base legal (Ley 21.719 Chile) ─────────────────── */
const BASES_LEGALES = [
  {
    valor: "consentimiento",
    etiqueta: "Consentimiento",
    descripcion: "El titular autorizó expresamente el tratamiento de sus datos.",
  },
  {
    valor: "contrato",
    etiqueta: "Contrato",
    descripcion: "El tratamiento es necesario para ejecutar un contrato con el titular.",
  },
  {
    valor: "obligacion_legal",
    etiqueta: "Obligación legal",
    descripcion: "Una ley o norma obliga a tratar estos datos (ej: SII, AFP, Dirección del Trabajo).",
  },
  {
    valor: "interes_legitimo",
    etiqueta: "Interés legítimo",
    descripcion: "Existe un interés legítimo del responsable que no vulnera los derechos del titular.",
  },
];

/* ─── Barra de progreso ──────────────────────────────────────── */
function BarraProgreso({ pasoActual }) {
  const pasos = ["Información general", "Datos y seguridad", "Revisión"];
  return (
    <div className="p1-progreso">
      {pasos.map((nombre, i) => {
        const num = i + 1;
        const activo    = num === pasoActual;
        const completado = num < pasoActual;
        return (
          <div key={i} className="p1-progreso-item">
            <div className={`p1-paso-burbuja ${activo ? "activo" : ""} ${completado ? "completado" : ""}`}>
              {completado ? "✓" : num}
            </div>
            <span className={`p1-paso-nombre ${activo ? "activo" : ""}`}>{nombre}</span>
            {i < pasos.length - 1 && (
              <div className={`p1-paso-linea ${completado ? "completada" : ""}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Tooltip base legal ─────────────────────────────────────── */
function TooltipBaseLegal({ opcion }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="p1-tooltip-wrap"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      <span className="p1-tooltip-trigger">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </span>
      {visible && (
        <div className="p1-tooltip-burbuja">
          <strong>{opcion.etiqueta}</strong>
          <span>{opcion.descripcion}</span>
        </div>
      )}
    </div>
  );
}

// cuenta las palabras (por espacios) para mostrarlas en el contador de la finalidad
function contarPalabras(texto) {
  return texto.trim() === "" ? 0 : texto.trim().split(/\s+/).length;
}

/* ─── Componente principal ───────────────────────────────────── */
export default function Paso1() {
  const navigate = useNavigate();
  const { state: datosAnalisis } = useLocation();
  const { form, actualizarForm } = useFormulario();

  // Pre-cargar nombre desde los datos del análisis si viene vacío
  useEffect(() => {
    if (datosAnalisis?.campos_detectados && form.campos_detectados.length === 0) {
      actualizarForm({
        campos_detectados: datosAnalisis.campos_detectados,
        campos_pendientes: datosAnalisis.campos_pendientes ?? [],
      });
    }
  }, []);

  const [local, setLocal] = useState({
    nombre:     form.nombre     || "",
    finalidad:  form.finalidad  || "",
    base_legal: form.base_legal || "",
  });

  const [tooltipBaseLegal, setTooltipBaseLegal] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    if (name === "finalidad" && contarPalabras(value) > 1000) return;
    setLocal((prev) => ({ ...prev, [name]: value }));
  }

  const puedeAvanzar = local.nombre.trim().length > 0;

  function handleSiguiente() {
    if (!puedeAvanzar) return;
    actualizarForm(local);
    navigate("/nuevo-tratamiento/paso2");
  }

  function handleCancelar() {
    navigate("/dashboard");
  }

  // Badge resumen de lo que detectó el análisis
  const detectados = datosAnalisis?.campos_detectados ?? form.campos_detectados ?? [];
  const pendientes = datosAnalisis?.campos_pendientes ?? form.campos_pendientes  ?? [];

  return (
    <div className="p1-layout">
      <BarraLateral />

      <main className="p1-main">
        <div className="p1-header">
          <h1 className="p1-titulo">Nuevo tratamiento</h1>
          <p className="p1-subtitulo">Completa la información para registrar este tratamiento en el RAT</p>
        </div>

        <div className="p1-card">

          {/* ── Barra de progreso ── */}
          <BarraProgreso pasoActual={1} />

          {/* ── Resumen del análisis (si viene de pantalla 8) ── */}
          {detectados.length > 0 && (
            <div className="p1-resumen-analisis">
              <span className="p1-resumen-icono">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
              <span className="p1-resumen-texto">
                Análisis completado —{" "}
                <strong>{detectados.length} campo{detectados.length !== 1 ? "s" : ""} detectado{detectados.length !== 1 ? "s" : ""}</strong>
                {pendientes.length > 0 && (
                  <>, <strong>{pendientes.length} pendiente{pendientes.length !== 1 ? "s" : ""}</strong> por completar</>
                )}
              </span>
            </div>
          )}

          {/* ── Sección formulario ── */}
          <div className="p1-seccion">
            <h2 className="p1-seccion-titulo">Información general</h2>
            <p className="p1-seccion-desc">
              Describe el propósito y la base legal que justifica este tratamiento de datos.
            </p>

            {/* Nombre del tratamiento */}
            <div className="p1-campo">
              <label className="p1-label" htmlFor="nombre">
                Nombre del tratamiento <span className="p1-requerido">*</span>
              </label>
              <input
                id="nombre"
                name="nombre"
                type="text"
                className={`p1-input ${!local.nombre.trim() ? "p1-input--vacio" : ""}`}
                placeholder="Ej: Gestión de nómina de empleados"
                value={local.nombre}
                onChange={handleChange}
                maxLength={200}
                autoFocus
              />
              {!local.nombre.trim() && (
                <span className="p1-campo-hint">Este campo es obligatorio para continuar.</span>
              )}
            </div>

            {/* Finalidad */}
            <div className="p1-campo">
              <label className="p1-label" htmlFor="finalidad">
                Finalidad
              </label>
              <textarea
                id="finalidad"
                name="finalidad"
                className="p1-textarea"
                placeholder="Describe el objetivo de este tratamiento de datos. Ej: Gestionar el pago de remuneraciones y cumplir con obligaciones laborales y previsionales."
                value={local.finalidad}
                onChange={handleChange}
                rows={3}
              />
              <span className={`p1-campo-contador ${contarPalabras(local.finalidad) >= 1000 ? "p1-campo-contador--limite" : ""}`}>
                {contarPalabras(local.finalidad)}/1000 palabras
              </span>
            </div>

            {/* Base legal */}
            <div className="p1-campo">
              <div className="p1-label-row">
                <label className="p1-label" htmlFor="base_legal">
                  Base legal
                </label>
                {/* Tooltips por opción — se muestran en el select como ayuda */}
                <div className="p1-bases-info">
                  {BASES_LEGALES.map((op) => (
                    <TooltipBaseLegal key={op.valor} opcion={op} />
                  ))}
                </div>
              </div>
              <select
                id="base_legal"
                name="base_legal"
                className="p1-select"
                value={local.base_legal}
                onChange={handleChange}
              >
                <option value="">Selecciona la base legal</option>
                {BASES_LEGALES.map((op) => (
                  <option key={op.valor} value={op.valor}>
                    {op.etiqueta}
                  </option>
                ))}
              </select>

              {/* Descripción de la opción seleccionada */}
              {local.base_legal && (
                <p className="p1-base-desc">
                  {BASES_LEGALES.find((b) => b.valor === local.base_legal)?.descripcion}
                </p>
              )}
            </div>
          </div>

          {/* ── Navegación ── */}
          <div className="p1-navegacion">
            <button className="p1-btn p1-btn--cancelar" onClick={handleCancelar}>
              Cancelar tratamiento
            </button>
            <button
              className={`p1-btn p1-btn--siguiente ${!puedeAvanzar ? "p1-btn--disabled" : ""}`}
              disabled={!puedeAvanzar}
              onClick={handleSiguiente}
            >
              Siguiente paso →
            </button>
          </div>

        </div>
      </main>
    </div>
  );
}
