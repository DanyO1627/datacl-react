import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useFormulario } from "../../context/FormularioContext";
import BarraLateral from "../../components/BarraLateral";
import "../../styles/formularioCss/paso1.css";

/* ─── Opciones base legal con artículos Ley 21.719 ──────────── */
const BASES_LEGALES = [
  {
    valor: "consentimiento",
    etiqueta: "Consentimiento",
    articulo: "Art. 12 letra a)",
    descripcion: "El titular otorgó su consentimiento libre, informado, específico e inequívoco para el tratamiento de sus datos (Ley 21.719, Art. 12 letra a).",
  },
  {
    valor: "contrato",
    etiqueta: "Ejecución de contrato",
    articulo: "Art. 12 letra b)",
    descripcion: "El tratamiento es necesario para la ejecución de un contrato en que el titular es parte, o para aplicar medidas precontractuales (Ley 21.719, Art. 12 letra b).",
  },
  {
    valor: "obligacion_legal",
    etiqueta: "Obligación legal",
    articulo: "Art. 12 letra c)",
    descripcion: "El tratamiento es necesario para cumplir una obligación legal o reglamentaria del responsable, ej: SII, AFP, Dirección del Trabajo (Ley 21.719, Art. 12 letra c).",
  },
  {
    valor: "interes_vital",
    etiqueta: "Interés vital",
    articulo: "Art. 12 letra d)",
    descripcion: "El tratamiento es necesario para proteger intereses vitales del titular u otra persona cuando el titular no puede prestar consentimiento (Ley 21.719, Art. 12 letra d).",
  },
  {
    valor: "interes_publico",
    etiqueta: "Interés público",
    articulo: "Art. 12 letra e)",
    descripcion: "El tratamiento es necesario para cumplir una misión de interés público o en el ejercicio de potestades públicas conferidas al responsable (Ley 21.719, Art. 12 letra e).",
  },
  {
    valor: "interes_legitimo",
    etiqueta: "Interés legítimo",
    articulo: "Art. 12 letra f)",
    descripcion: "Existe un interés legítimo del responsable o de un tercero que no vulnera los derechos y libertades fundamentales del titular (Ley 21.719, Art. 12 letra f).",
  },
];

/* ─── Barra de progreso ──────────────────────────────────────── */
function BarraProgreso({ pasoActual }) {
  const pasos = ["Identificación", "Datos y titulares", "Seguridad y conservación"];
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
    nombre:         form.nombre         || "",
    responsable:    form.responsable    || "",
    es_responsable: form.es_responsable ?? true,
    departamento:   form.departamento   || "",
    finalidad:      form.finalidad      || "",
    base_legal:     form.base_legal     || "",
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

          {/* ── Banner progreso multi-actividad ── */}
          {form.actividadesPendientes?.length > 0 && (() => {
            const total = form.actividadesPendientes.length;
            const idx   = form.actividadActual ?? 0;
            const act   = form.actividadesPendientes[idx];
            return (
              <div className="p1-banner-actividad">
                <div className="p1-banner-top">
                  <span className="p1-banner-num">Actividad {idx + 1} de {total}</span>
                  <span className="p1-banner-nombre">{act?.nombre}</span>
                </div>
                {act?.campos?.length > 0 && (
                  <div className="p1-banner-chips">
                    {act.campos.map((c) => (
                      <span
                        key={c.nombre_columna}
                        className={`p1-banner-chip ${c.tipo === "SENSIBLE" ? "p1-banner-chip--sensible" : ""}`}
                      >
                        {c.nombre_columna}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

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
            <h2 className="p1-seccion-titulo">Identificación del tratamiento</h2>
            <p className="p1-seccion-desc">
              Identifica el tratamiento, su responsable y la base legal que lo justifica según la Ley 21.719.
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

            {/* Responsable y departamento — fila de dos columnas */}
            <div className="p1-fila-dos">
              <div className="p1-campo">
                <label className="p1-label" htmlFor="responsable">
                  Responsable del tratamiento
                </label>
                <input
                  id="responsable"
                  name="responsable"
                  type="text"
                  className="p1-input"
                  placeholder="Ej: Juan Pérez / Encargado de RRHH"
                  value={local.responsable}
                  onChange={handleChange}
                  maxLength={150}
                />
                <div className="p1-rol-row">
                  <label className="p1-rol-opcion">
                    <input
                      type="radio"
                      name="es_responsable"
                      checked={local.es_responsable === true}
                      onChange={() => setLocal((prev) => ({ ...prev, es_responsable: true }))}
                    />
                    <span>Responsable</span>
                  </label>
                  <label className="p1-rol-opcion">
                    <input
                      type="radio"
                      name="es_responsable"
                      checked={local.es_responsable === false}
                      onChange={() => setLocal((prev) => ({ ...prev, es_responsable: false }))}
                    />
                    <span>Encargado</span>
                  </label>
                </div>
              </div>
              <div className="p1-campo">
                <label className="p1-label" htmlFor="departamento">
                  Departamento o área
                </label>
                <input
                  id="departamento"
                  name="departamento"
                  type="text"
                  className="p1-input"
                  placeholder="Ej: Recursos Humanos"
                  value={local.departamento}
                  onChange={handleChange}
                  maxLength={150}
                />
              </div>
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
              {local.base_legal && (() => {
                const base = BASES_LEGALES.find((b) => b.valor === local.base_legal);
                return (
                  <p className="p1-base-desc">
                    <span className="p1-base-articulo">{base?.articulo} —</span> {base?.descripcion}
                  </p>
                );
              })()}
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
