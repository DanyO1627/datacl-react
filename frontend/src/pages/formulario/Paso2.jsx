import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFormulario } from "../../context/FormularioContext";
import BarraLateral from "../../components/BarraLateral";
import "../../styles/formularioCss/paso2.css";

/* ─── Categorías de datos personales ────────────────────────────
 * keywords: palabras clave para detectar si Python ya encontró esta categoría
 * en los campos del archivo subido.
 */
const CATEGORIAS_DATOS = [
  { id: "nombre_apellido",    etiqueta: "Nombre y apellido",   keywords: ["nombre", "apellido", "name", "lastname", "first_name", "last_name"] },
  { id: "rut_dni",            etiqueta: "RUT / DNI",           keywords: ["rut", "dni", "documento", "cedula", "id_number"] },
  { id: "correo_electronico", etiqueta: "Correo electrónico",  keywords: ["correo", "email", "mail", "e_mail"] },
  { id: "telefono",           etiqueta: "Teléfono",            keywords: ["telefono", "phone", "celular", "movil", "fono", "tel"] },
  { id: "direccion",          etiqueta: "Dirección",           keywords: ["direccion", "address", "domicilio", "calle"] },
  { id: "fecha_nacimiento",   etiqueta: "Fecha de nacimiento", keywords: ["fecha_nacimiento", "birthdate", "birth_date", "nacimiento"] },
];

/* ─── Categorías de datos sensibles ───────────────────────────── */
const CATEGORIAS_SENSIBLES = [
  { id: "datos_salud",        etiqueta: "Datos de salud",       tooltip: "Diagnósticos, medicamentos, fichas médicas.",          keywords: ["salud", "health", "medico", "diagnostico", "enfermedad"] },
  { id: "datos_biometricos",  etiqueta: "Datos biométricos",    tooltip: "Huella dactilar, reconocimiento facial, iris.",         keywords: ["biometrico", "biometric", "huella", "facial"] },
  { id: "origen_etnico",      etiqueta: "Origen étnico",        tooltip: "Raza, etnia, pueblo indígena u origen nacional.",       keywords: ["etnico", "raza", "race", "etnia", "indigena"] },
  { id: "religion_creencias", etiqueta: "Religión o creencias", tooltip: "Creencias religiosas, filosóficas o morales.",          keywords: ["religion", "creencia", "faith"] },
  { id: "orientacion_sexual", etiqueta: "Orientación sexual",   tooltip: "Orientación o identidad sexual o de género.",           keywords: ["sexual", "orientacion", "genero", "lgbtq"] },
  { id: "opiniones_politicas", etiqueta: "Opiniones políticas", tooltip: "Afiliación o posturas políticas.",                      keywords: ["politico", "politica", "partido", "ideologia"] },
];

/* ─── Barra de progreso ──────────────────────────────────────── */
function BarraProgreso({ pasoActual }) {
  const pasos = ["Información general", "Datos y seguridad", "Revisión"];
  return (
    <div className="p2-progreso">
      {pasos.map((nombre, i) => {
        const num = i + 1;
        const activo     = num === pasoActual;
        const completado = num < pasoActual;
        return (
          <div key={i} className="p2-progreso-item">
            <div className={`p2-paso-burbuja ${activo ? "activo" : ""} ${completado ? "completado" : ""}`}>
              {completado ? "✓" : num}
            </div>
            <span className={`p2-paso-nombre ${activo ? "activo" : ""}`}>{nombre}</span>
            {i < pasos.length - 1 && <div className={`p2-paso-linea ${completado ? "completada" : ""}`} />}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Modal confirmación al desmarcar campo verde ────────────── */
function ModalDesmarcar({ categoria, onConfirmar, onCancelar }) {
  return (
    <div className="p2-modal-overlay" onClick={onCancelar}>
      <div className="p2-modal" onClick={(e) => e.stopPropagation()}>
        <div className="p2-modal-icono">⚠️</div>
        <h3 className="p2-modal-titulo">¿Desmarcar este campo?</h3>
        <p className="p2-modal-texto">
          <strong>{categoria.etiqueta}</strong> fue detectado automáticamente.
          Al desmarcarlo quedará como "Desmarcado manualmente".
        </p>
        <div className="p2-modal-acciones">
          <button className="p2-modal-btn p2-modal-btn--cancelar" onClick={onCancelar}>Mantener</button>
          <button className="p2-modal-btn p2-modal-btn--confirmar" onClick={onConfirmar}>Sí, desmarcar</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Tooltip ────────────────────────────────────────────────── */
function Tooltip({ texto }) {
  const [visible, setVisible] = useState(false);
  return (
    <span className="p2-tooltip-wrap"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      <span className="p2-tooltip-trigger">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </span>
      {visible && <div className="p2-tooltip-burbuja">{texto}</div>}
    </span>
  );
}

/* ─── Componente principal ───────────────────────────────────── */
export default function Paso2() {
  const navigate = useNavigate();
  const { form, actualizarForm } = useFormulario();

  /*
   * Construimos el set de IDs detectados por Python comparando los
   * nombres de columna del análisis contra las keywords de cada categoría.
   * Esto determina qué checkboxes se muestran en verde con el 🐍.
   */
  const detectadas = new Set();
  form.campos_detectados.forEach((campo) => {
    const col = campo.nombre_columna.toLowerCase();
    CATEGORIAS_DATOS.forEach((cat) => {
      if (cat.keywords.some((kw) => col.includes(kw))) detectadas.add(cat.id);
    });
    if (campo.es_sensible) {
      CATEGORIAS_SENSIBLES.forEach((cat) => {
        if (cat.keywords.some((kw) => col.includes(kw))) detectadas.add(cat.id);
      });
    }
  });

  // Set de IDs que el usuario desmarcó manualmente (eran verdes)
  const [desmarcadas, setDesmarcadas] = useState(new Set());

  /*
   * Estado local — pre-carga desde el contexto si ya había datos.
   * Si no había datos (primera vez), pre-marcamos los detectados.
   */
  const [local, setLocal] = useState({
    categorias_datos: form.categorias_datos.length > 0
      ? form.categorias_datos
      : [...detectadas].filter((id) => CATEGORIAS_DATOS.some((c) => c.id === id)),
    datos_sensibles:      form.datos_sensibles ?? false,
    categorias_sensibles: form.categorias_sensibles.length > 0
      ? form.categorias_sensibles
      : [...detectadas].filter((id) => CATEGORIAS_SENSIBLES.some((c) => c.id === id)),
    destinatarios:   form.destinatarios || "",
    sale_extranjero: form.sale_extranjero ?? false,
    pais_destino:    form.pais_destino || "",
    otros_datos:     form.otros_datos || "",
  });

  // Qué categoría está esperando confirmar desmarque
  const [pendiente, setPendiente] = useState(null);

  /* ── Toggle de checkbox con lógica de modal ─────────────────── */
  function toggleCategoria(cat, campo) {
    const marcado = local[campo].includes(cat.id);
    // Si estaba detectado y está marcado → pedir confirmación
    if (detectadas.has(cat.id) && marcado) {
      setPendiente({ ...cat, campo });
      return;
    }
    toggleEnLista(campo, cat.id);
  }

  function toggleEnLista(campo, id) {
    setLocal((prev) => {
      const lista = prev[campo];
      return { ...prev, [campo]: lista.includes(id) ? lista.filter((x) => x !== id) : [...lista, id] };
    });
  }

  function confirmarDesmarcar() {
    setDesmarcadas((prev) => new Set([...prev, pendiente.id]));
    toggleEnLista(pendiente.campo, pendiente.id);
    setPendiente(null);
  }

  /* ── Helpers ────────────────────────────────────────────────── */
  function toggleSensibles(valor) {
    setLocal((prev) => ({
      ...prev,
      datos_sensibles: valor,
      categorias_sensibles: valor ? prev.categorias_sensibles : [],
    }));
  }

  function toggleExtranjero(valor) {
    setLocal((prev) => ({ ...prev, sale_extranjero: valor, pais_destino: valor ? prev.pais_destino : "" }));
  }

  /* ── Navegación ─────────────────────────────────────────────── */
  function handleSiguiente() { actualizarForm(local); navigate("/nuevo-tratamiento/paso3"); }
  function handleAnterior()  { actualizarForm(local); navigate("/nuevo-tratamiento"); }
  function handleCancelar()  { navigate("/dashboard"); }

  return (
    <div className="p2-layout">
      <BarraLateral />

      <main className="p2-main">
        <div className="p2-header">
          <h1 className="p2-titulo">Nuevo tratamiento</h1>
          <p className="p2-subtitulo">Completa la información para registrar este tratamiento en el RAT</p>
        </div>

        <div className="p2-card">
          <BarraProgreso pasoActual={2} />

          {/* ── Grid 3 columnas ───────────────────────────────── */}
          <div className="p2-grid">

            {/* ── Columna 1: Categorías de datos ─────────────── */}
            <div className="p2-columna">
              <h3 className="p2-col-titulo">Categoría de datos personales</h3>
              <div className="p2-checkboxes">
                {CATEGORIAS_DATOS.map((cat) => {
                  const marcado    = local.categorias_datos.includes(cat.id);
                  const detectado  = detectadas.has(cat.id);
                  const desmarcado = desmarcadas.has(cat.id);
                  return (
                    <label key={cat.id}
                      className={`p2-check-item
                        ${detectado && marcado    ? " p2-check-item--verde" : ""}
                        ${detectado && desmarcado ? " p2-check-item--gris"  : ""}
                      `}
                    >
                      <input type="checkbox" className="p2-check-input"
                        checked={marcado}
                        onChange={() => toggleCategoria(cat, "categorias_datos")}
                      />
                      <span className="p2-check-texto">{cat.etiqueta}</span>
                      {detectado && marcado    && <span className="p2-icono-python" title="Detectado por Python">🐍</span>}
                      {detectado && desmarcado && <span className="p2-texto-desmarcado">Desmarcado manualmente</span>}
                    </label>
                  );
                })}
                {/* Campo "otros" */}
                <div className="p2-otros-wrap">
                  <label className="p2-otros-label">Otros</label>
                  <input
                    type="text"
                    className="p2-otros-input"
                    placeholder="Especifica..."
                    value={local.otros_datos}
                    onChange={(e) => setLocal((prev) => ({ ...prev, otros_datos: e.target.value }))}
                    maxLength={100}
                  />
                </div>
              </div>
            </div>

            {/* ── Columna 2: Datos sensibles ─────────────────── */}
            <div className="p2-columna">
              <h3 className="p2-col-titulo">
                ¿Este tratamiento incluye datos sensibles?
                <Tooltip texto="Los datos sensibles exigen mayor protección según el Art. 16 de la Ley 21.719." />
              </h3>

              {/* Sí / No */}
              <div className="p2-sino-row">
                <button type="button"
                  className={`p2-sino-btn ${local.datos_sensibles  ? "p2-sino-btn--activo" : ""}`}
                  onClick={() => toggleSensibles(true)}
                >Sí</button>
                <button type="button"
                  className={`p2-sino-btn ${!local.datos_sensibles ? "p2-sino-btn--activo" : ""}`}
                  onClick={() => toggleSensibles(false)}
                >No</button>
              </div>

              {/* Checkboxes sensibles — aparecen solo si Sí */}
              {local.datos_sensibles && (
                <div className="p2-checkboxes p2-checkboxes--sensibles">
                  {CATEGORIAS_SENSIBLES.map((cat) => {
                    const marcado    = local.categorias_sensibles.includes(cat.id);
                    const detectado  = detectadas.has(cat.id);
                    const desmarcado = desmarcadas.has(cat.id);
                    return (
                      <label key={cat.id}
                        className={`p2-check-item
                          ${detectado && marcado    ? " p2-check-item--verde" : ""}
                          ${detectado && desmarcado ? " p2-check-item--gris"  : ""}
                        `}
                      >
                        <input type="checkbox" className="p2-check-input"
                          checked={marcado}
                          onChange={() => toggleCategoria(cat, "categorias_sensibles")}
                        />
                        <span className="p2-check-texto">{cat.etiqueta}</span>
                        <Tooltip texto={cat.tooltip} />
                        {detectado && marcado    && <span className="p2-icono-python" title="Detectado por Python">🐍</span>}
                        {detectado && desmarcado && <span className="p2-texto-desmarcado">Desmarcado manualmente</span>}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── Columna 3: Destinatarios + extranjero ─────── */}
            <div className="p2-columna">
              <h3 className="p2-col-titulo">Destinatarios de los datos</h3>
              <textarea
                className="p2-textarea"
                placeholder="Ej: AFP Provida, SII, proveedor de nómina externo..."
                value={local.destinatarios}
                onChange={(e) => setLocal((prev) => ({ ...prev, destinatarios: e.target.value }))}
                rows={5}
                maxLength={500}
              />
              <span className="p2-campo-contador">{local.destinatarios.length}/500</span>

              <div className="p2-extranjero">
                <div className="p2-extranjero-row">
                  <span className="p2-extranjero-label">¿Los datos salen al extranjero?</span>
                  <button type="button" role="switch" aria-checked={local.sale_extranjero}
                    className={`p2-switch ${local.sale_extranjero ? "p2-switch--on" : ""}`}
                    onClick={() => toggleExtranjero(!local.sale_extranjero)}
                  >
                    <span className="p2-switch-thumb" />
                  </button>
                </div>
                {local.sale_extranjero && (
                  <input
                    type="text"
                    className="p2-input-pais"
                    placeholder="¿A qué país o región?"
                    value={local.pais_destino}
                    onChange={(e) => setLocal((prev) => ({ ...prev, pais_destino: e.target.value }))}
                    maxLength={100}
                  />
                )}
              </div>
            </div>

          </div>{/* fin grid */}

          {/* ── Navegación ───────────────────────────────────── */}
          <div className="p2-navegacion">
            <button className="p2-btn p2-btn--cancelar" onClick={handleCancelar}>
              Cancelar tratamiento
            </button>
            <div className="p2-nav-derecha">
              <button className="p2-btn p2-btn--anterior" onClick={handleAnterior}>← Atrás</button>
              <button className="p2-btn p2-btn--siguiente" onClick={handleSiguiente}>Siguiente paso →</button>
            </div>
          </div>

        </div>{/* fin card */}
      </main>

      {pendiente && (
        <ModalDesmarcar
          categoria={pendiente}
          onConfirmar={confirmarDesmarcar}
          onCancelar={() => setPendiente(null)}
        />
      )}
    </div>
  );
}
