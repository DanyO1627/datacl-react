import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useFormulario } from "../../context/FormularioContext";
import BarraLateral from "../../components/BarraLateral";
import "../../styles/formularioCss/paso1.css";

const API = "http://localhost:8000";

/* ─── Opciones base legal con artículos Ley 21.719 ──────────── */
const BASES_LEGALES = [
  {
    valor: "consentimiento",
    etiqueta: "Consentimiento",
    articulo: "Art. 12",
    descripcion: "El titular otorgó su consentimiento libre, informado, específico e inequívoco. Debe ser previo y manifestado de forma inequívoca. El responsable debe poder acreditarlo (Ley 21.719, Art. 12).",
  },
  {
    valor: "datos_economicos",
    etiqueta: "Obligaciones económicas o financieras",
    articulo: "Art. 13 letra a)",
    descripcion: "El tratamiento se refiere a datos relativos a obligaciones de carácter económico, financiero, bancario o comercial, de conformidad con el Título III de la Ley 21.719 (Art. 13 letra a).",
  },
  {
    valor: "obligacion_legal",
    etiqueta: "Obligación legal",
    articulo: "Art. 13 letra b)",
    descripcion: "El tratamiento es necesario para la ejecución o el cumplimiento de una obligación legal o lo dispone la ley. Ej: reportes al SII, registros laborales, AFP (Ley 21.719, Art. 13 letra b).",
  },
  {
    valor: "contrato",
    etiqueta: "Ejecución de contrato",
    articulo: "Art. 13 letra c)",
    descripcion: "El tratamiento es necesario para la celebración o ejecución de un contrato entre el titular y el responsable, o para la ejecución de medidas precontractuales adoptadas a solicitud del titular (Ley 21.719, Art. 13 letra c).",
  },
  {
    valor: "interes_legitimo",
    etiqueta: "Interés legítimo",
    articulo: "Art. 13 letra d)",
    descripcion: "Existe un interés legítimo del responsable o de un tercero que no afecta los derechos y libertades del titular. El titular puede exigir siempre ser informado sobre el tratamiento (Ley 21.719, Art. 13 letra d).",
  },
  {
    valor: "defensa_derechos",
    etiqueta: "Defensa de derechos ante tribunales",
    articulo: "Art. 13 letra e)",
    descripcion: "El tratamiento es necesario para la formulación, ejercicio o defensa de un derecho ante los tribunales de justicia u órganos públicos (Ley 21.719, Art. 13 letra e).",
  },
  {
    valor: "consentimiento_sensibles",
    etiqueta: "Consentimiento expreso — datos sensibles",
    articulo: "Art. 16 inc. 1",
    descripcion: "Datos sensibles (salud, origen étnico, religión, orientación sexual, biométricos, etc.) que requieren consentimiento EXPRESO del titular, otorgado por declaración escrita, verbal o medio tecnológico equivalente (Ley 21.719, Art. 16 inc. 1).",
  },
  {
    valor: "datos_biometricos",
    etiqueta: "Datos biométricos",
    articulo: "Art. 16 ter",
    descripcion: "Datos obtenidos por tratamiento técnico que permiten identificación única (huella, iris, rasgos faciales, voz). Requieren consentimiento expreso más información específica al titular sobre el sistema, finalidad y período de uso (Ley 21.719, Art. 16 ter).",
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

  // Pre-cargar campos detectados desde el análisis si el formulario viene vacío.
  // Depende de form.campos_detectados.length (no del array completo) para no
  // re-disparar el efecto cuando actualizarForm reemplaza el array por otro
  // de igual longitud, evitando un loop infinito.
  useEffect(() => {
    if (datosAnalisis?.campos_detectados?.length > 0 && form.campos_detectados.length === 0) {
      actualizarForm({
        campos_detectados: datosAnalisis.campos_detectados,
        campos_pendientes: datosAnalisis.campos_pendientes ?? [],
      });
    }
  }, [datosAnalisis, form.campos_detectados.length]);

  const [local, setLocal] = useState({
    nombre:         form.nombre         || "",
    responsable:    form.responsable    || "",
    es_responsable: form.es_responsable ?? true,
    departamento:   form.departamento   || "",
    finalidad:      form.finalidad      || "",
    base_legal:     form.base_legal ? form.base_legal.split(",").filter(Boolean) : [],
    // Campos extendidos B2-03
    descripcion_detallada:       form.descripcion_detallada       || "",
    subarea_responsable:         form.subarea_responsable         || "",
    procesos_relacionados:       form.procesos_relacionados       || "",
    finalidades_secundarias:     form.finalidades_secundarias     || "",
    informa_titulares:           form.informa_titulares           || [],
    documento_respaldo_tiene:    form.documento_respaldo_tiene    ?? null,
    documento_respaldo_descripcion: form.documento_respaldo_descripcion || "",
  });

  const [guardandoBorrador, setGuardandoBorrador] = useState(false);
  const [borradorOk, setBorradorOk] = useState(false);
  const [abiertaAdicional, setAbiertaAdicional] = useState(false);

  function toggleBaseLegal(valor) {
    setLocal((prev) => {
      const lista = prev.base_legal;
      return {
        ...prev,
        base_legal: lista.includes(valor)
          ? lista.filter((v) => v !== valor)
          : [...lista, valor],
      };
    });
  }

  function handleChange(e) {
    const { name, value } = e.target;
    if (name === "finalidad" && contarPalabras(value) > 1000) return;
    setLocal((prev) => ({ ...prev, [name]: value }));
  }

  function toggleInformaTitulares(valor) {
    setLocal((prev) => {
      const actual = prev.informa_titulares || []
      return {
        ...prev,
        informa_titulares: actual.includes(valor)
          ? actual.filter((v) => v !== valor)
          : [...actual, valor],
      }
    })
  }

  async function handleGuardarBorrador() {
    setGuardandoBorrador(true);
    try {
      actualizarForm({ ...local, base_legal: local.base_legal.join(",") });
      const datos = { ...form, ...local, base_legal: local.base_legal.join(",") };
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

      // campos_sesion = lista completa del archivo; fallback a campos de la actividad actual
      const camposParaSesion = datos.campos_sesion?.length > 0
        ? datos.campos_sesion
        : (datos.campos_detectados || []);

      let sesionId = datos.sesionActual;
      if (!sesionId) {
        const res = await fetch(`${API}/sesiones`, {
          method: "POST", headers,
          body: JSON.stringify({
            fuente: camposParaSesion.length > 0 ? "archivo" : "manual",
            estado: "borrador",
            columnas_json: camposParaSesion.length > 0 ? camposParaSesion : null,
          }),
        });
        if (!res.ok) throw new Error();
        const sesion = await res.json();
        sesionId = sesion.id;
        actualizarForm({ sesionActual: sesionId });
      }

      const idx = datos.actividadActual ?? 0;
      const tratId = datos.tratamientosGuardados?.[idx];
      const payload = {
        nombre: datos.nombre.trim() || "Sin nombre",
        finalidad: datos.finalidad || null,
        base_legal: datos.base_legal || null,
        campos_detectados: datos.campos_detectados || [],
        campos_usados: datos.campos_detectados || [],
        detalle: {
          responsable_tratamiento: datos.responsable || null,
          es_responsable: datos.es_responsable ?? true,
          departamento: datos.departamento || null,
        },
      };

      let currentTratId = tratId;
      if (tratId) {
        await fetch(`${API}/tratamientos/${tratId}`, {
          method: "PUT", headers, body: JSON.stringify(payload),
        });
      } else {
        const res = await fetch(`${API}/tratamientos`, {
          method: "POST", headers,
          body: JSON.stringify({ ...payload, estado: "BORRADOR", sesion_id: sesionId }),
        });
        if (!res.ok) throw new Error();
        const trat = await res.json();
        currentTratId = trat.id;
      }

      // Guardar borradores para las demás actividades que aún no tienen uno
      const todosGuardados = { ...(datos.tratamientosGuardados || {}), [idx]: currentTratId };
      for (let i = 0; i < (datos.actividadesPendientes || []).length; i++) {
        if (i === idx || todosGuardados[i]) continue;
        const act = datos.actividadesPendientes[i];
        try {
          const res = await fetch(`${API}/tratamientos`, {
            method: "POST", headers,
            body: JSON.stringify({
              nombre: act.nombre || `Actividad ${i + 1}`,
              estado: "BORRADOR",
              sesion_id: sesionId,
              campos_detectados: act.campos || [],
              campos_usados: act.campos || [],
            }),
          });
          if (res.ok) { const trat = await res.json(); todosGuardados[i] = trat.id; }
        } catch { /* continuar */ }
      }
      actualizarForm({ tratamientosGuardados: todosGuardados });
      setBorradorOk(true);
    } catch {
      /* si falla, el usuario se queda en el paso */
    } finally {
      setGuardandoBorrador(false);
    }
  }

  const puedeAvanzar =
    local.nombre.trim().length > 0 &&
    local.responsable.trim().length > 0 &&
    local.finalidad.trim().length > 0 &&
    local.base_legal.length > 0;

  function handleSiguiente() {
    if (!puedeAvanzar) return;
    actualizarForm({ ...local, base_legal: local.base_legal.join(",") });
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
          <h1 className="p1-titulo">{local.nombre.trim() || "Nuevo tratamiento"}</h1>
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
                  Responsable del tratamiento <span className="p1-requerido">*</span>
                </label>
                <input
                  id="responsable"
                  name="responsable"
                  type="text"
                  className={`p1-input ${!local.responsable.trim() ? "p1-input--vacio" : ""}`}
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
                <p className="p1-campo-hint p1-campo-hint--info">
                  {local.es_responsable
                    ? "Responsable: quien decide los fines y medios del tratamiento (Art. 2° n) Ley 21.719)."
                    : "Encargado/mandatario: quien trata datos por cuenta del responsable (Art. 2° x) Ley 21.719)."}
                </p>
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

            {/* Subárea responsable */}
            <div className="p1-campo">
              <label className="p1-label" htmlFor="subarea_responsable">
                Área específica
              </label>
              <input
                id="subarea_responsable"
                name="subarea_responsable"
                type="text"
                className="p1-input"
                placeholder="Ej: Subgerencia de Farmacias / Encargado de ventas"
                value={local.subarea_responsable}
                onChange={handleChange}
                maxLength={200}
              />
            </div>

            {/* Descripción detallada — siempre visible */}
            <div className="p1-campo">
              <label className="p1-label" htmlFor="descripcion_detallada">
                Descripción detallada del tratamiento
              </label>
              <textarea
                id="descripcion_detallada"
                name="descripcion_detallada"
                className="p1-textarea"
                placeholder="¿Qué datos se tratan? ¿Para qué? ¿Cómo?"
                value={local.descripcion_detallada}
                onChange={handleChange}
                rows={4}
              />
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
              <div className="p1-checkboxes">
                {BASES_LEGALES.map((op) => {
                  const marcado = local.base_legal.includes(op.valor);
                  return (
                    <label key={op.valor} className={`p1-check-item ${marcado ? "p1-check-item--marcado" : ""}`}>
                      <input
                        type="checkbox"
                        className="p1-check-input"
                        checked={marcado}
                        onChange={() => toggleBaseLegal(op.valor)}
                      />
                      <span className="p1-check-texto">{op.etiqueta}</span>
                      <span className="p1-check-articulo">{op.articulo}</span>
                    </label>
                  );
                })}
              </div>

              {local.base_legal.length > 0 && (
                <div className="p1-bases-seleccionadas">
                  {local.base_legal.map((valor) => {
                    const base = BASES_LEGALES.find((b) => b.valor === valor);
                    return base ? (
                      <p key={valor} className="p1-base-desc">
                        <span className="p1-base-articulo">{base.articulo} —</span> {base.descripcion}
                      </p>
                    ) : null;
                  })}
                </div>
              )}
            </div>
            {/* ── Sección colapsable: Información adicional ── */}
            <div className="p1-adicional">
              <button
                type="button"
                className="p1-adicional-toggle"
                onClick={() => setAbiertaAdicional((v) => !v)}
              >
                <span className={`p1-adicional-icono ${abiertaAdicional ? "p1-adicional-icono--abierto" : ""}`}>▶</span>
                Información adicional — completa si aplica a tu organización
              </button>

              {abiertaAdicional && (
                <div className="p1-adicional-contenido">

                  {/* Procesos relacionados */}
                  <div className="p1-campo">
                    <label className="p1-label" htmlFor="procesos_relacionados">
                      Procesos relacionados
                    </label>
                    <textarea
                      id="procesos_relacionados"
                      name="procesos_relacionados"
                      className="p1-textarea"
                      placeholder="¿Se relaciona con otros procesos internos? Ej: BackOffice, Contabilidad, TI"
                      value={local.procesos_relacionados}
                      onChange={handleChange}
                      rows={3}
                    />
                  </div>

                  {/* Finalidades secundarias */}
                  <div className="p1-campo">
                    <label className="p1-label" htmlFor="finalidades_secundarias">
                      Finalidades secundarias
                    </label>
                    <textarea
                      id="finalidades_secundarias"
                      name="finalidades_secundarias"
                      className="p1-textarea"
                      placeholder="¿Existen finalidades secundarias como fidelización, reportes internos?"
                      value={local.finalidades_secundarias}
                      onChange={handleChange}
                      rows={3}
                    />
                  </div>

                  {/* Documento respaldo permiso */}
                  <div className="p1-campo">
                    <label className="p1-label">¿Existe documento de respaldo o permiso?</label>
                    <div className="p1-radios">
                      <label className="p1-rol-opcion">
                        <input
                          type="radio"
                          name="documento_respaldo_tiene"
                          checked={local.documento_respaldo_tiene === true}
                          onChange={() => setLocal((p) => ({ ...p, documento_respaldo_tiene: true }))}
                        />
                        <span>Sí</span>
                      </label>
                      <label className="p1-rol-opcion">
                        <input
                          type="radio"
                          name="documento_respaldo_tiene"
                          checked={local.documento_respaldo_tiene === false}
                          onChange={() => setLocal((p) => ({ ...p, documento_respaldo_tiene: false, documento_respaldo_descripcion: "" }))}
                        />
                        <span>No</span>
                      </label>
                    </div>
                    {local.documento_respaldo_tiene === true && (
                      <textarea
                        id="documento_respaldo_descripcion"
                        name="documento_respaldo_descripcion"
                        className="p1-textarea"
                        placeholder="Describe el documento de respaldo o permiso"
                        value={local.documento_respaldo_descripcion}
                        onChange={handleChange}
                        rows={2}
                        style={{ marginTop: 8 }}
                      />
                    )}
                  </div>

                  {/* Cómo se informa a los titulares */}
                  <div className="p1-campo">
                    <label className="p1-label">¿Cómo se informa a los titulares?</label>
                    <div className="p1-checkboxes">
                      {[
                        { valor: "web",       etiqueta: "Aviso en web" },
                        { valor: "correo",    etiqueta: "Correo electrónico" },
                        { valor: "contrato",  etiqueta: "Contrato" },
                        { valor: "mandato",   etiqueta: "Mandato" },
                        { valor: "no_informa", etiqueta: "No se informa" },
                      ].map(({ valor, etiqueta }) => (
                        <label key={valor} className="p1-checkbox-opcion">
                          <input
                            type="checkbox"
                            checked={(local.informa_titulares || []).includes(valor)}
                            onChange={() => toggleInformaTitulares(valor)}
                          />
                          <span>{etiqueta}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                </div>
              )}
            </div>
          </div>

          {/* ── Toast borrador guardado ── */}
          {borradorOk && (
            <div className="p1-toast-borrador">
              <span className="p1-toast-texto">✓ Borrador guardado correctamente.</span>
              <div className="p1-toast-acciones">
                <button className="p1-toast-btn p1-toast-btn--dashboard" onClick={() => navigate("/dashboard")}>
                  Ir al dashboard
                </button>
                <button className="p1-toast-btn p1-toast-btn--continuar" onClick={() => setBorradorOk(false)}>
                  Continuar aquí
                </button>
              </div>
            </div>
          )}

          {/* ── Navegación ── */}
          <div className="p1-navegacion">
            <div className="p1-nav-izquierda">
              <button className="p1-btn p1-btn--cancelar" onClick={handleCancelar}>
                Cancelar
              </button>
              <button
                className="p1-btn p1-btn--borrador"
                onClick={handleGuardarBorrador}
                disabled={guardandoBorrador || !local.nombre.trim()}
              >
                {guardandoBorrador ? "Guardando..." : "Guardar borrador"}
              </button>
            </div>
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
