import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFormulario } from "../../context/FormularioContext";
import BarraLateral from "../../components/BarraLateral";
import BarraProgreso from "../../components/BarraProgreso";
import "../../styles/formularioCss/paso2.css";

const API = "/api";

const CATEGORIAS_TITULARES = [
  { id: "empleados",   etiqueta: "Empleados y funcionarios" },
  { id: "clientes",    etiqueta: "Clientes y consumidores" },
  { id: "proveedores", etiqueta: "Proveedores y contratistas" },
  { id: "usuarios",    etiqueta: "Usuarios de plataformas digitales" },
  { id: "ciudadanos",  etiqueta: "Ciudadanos" },
  { id: "estudiantes", etiqueta: "Estudiantes" },
  { id: "pacientes",   etiqueta: "Pacientes" },
];

const ORIGENES_DATOS = [
  { valor: "titular",             etiqueta: "Del propio titular" },
  { valor: "terceros",            etiqueta: "De terceros" },
  { valor: "fuentes_publicas",    etiqueta: "De fuentes públicas" },
  { valor: "generacion_interna",  etiqueta: "Generación interna" },
];

// Datos de identificación (R9.3: se agregan imagen facial/firma/huella/pasaporte)
const CATEGORIAS_DATOS_IDENTIFICACION = [
  { id: "nombre_apellido",    etiqueta: "Nombre y apellido",   keywords: ["nombre", "apellido", "name", "lastname", "first_name", "last_name"] },
  { id: "rut_dni",            etiqueta: "RUT / DNI",           keywords: ["rut", "dni", "documento", "cedula", "id_number"] },
  { id: "correo_electronico", etiqueta: "Correo electrónico",  keywords: ["correo", "email", "mail", "e_mail"] },
  { id: "fecha_nacimiento",   etiqueta: "Fecha de nacimiento", keywords: ["fecha_nacimiento", "birthdate", "birth_date", "nacimiento"] },
  { id: "imagen_facial",      etiqueta: "Imagen facial",       keywords: ["imagen_facial", "foto_rostro", "facial", "selfie", "rostro"] },
  { id: "firma",              etiqueta: "Firma",               keywords: ["firma", "signature"] },
  { id: "huella_dactilar",    etiqueta: "Huella dactilar",     keywords: ["huella", "huella_dactilar", "fingerprint"] },
  { id: "numero_pasaporte",   etiqueta: "Número de pasaporte", keywords: ["pasaporte", "passport", "numero_pasaporte"] },
];

// Datos de contacto (R9.3: se separan visualmente de "identificación", mismo array de datos por debajo)
const CATEGORIAS_DATOS_CONTACTO = [
  { id: "telefono",  etiqueta: "Teléfono",  keywords: ["telefono", "phone", "celular", "movil", "fono", "tel"] },
  { id: "direccion", etiqueta: "Dirección", keywords: ["direccion", "address", "domicilio", "calle"] },
];

// Array combinado — lo sigue usando la detección automática (detectadas, más
// abajo) y toggleCategoria, que no necesitan saber de la separación visual.
const CATEGORIAS_DATOS = [...CATEGORIAS_DATOS_IDENTIFICACION, ...CATEGORIAS_DATOS_CONTACTO];

const CATEGORIAS_SENSIBLES = [
  { id: "datos_salud",         etiqueta: "Datos de salud",       tooltip: "Diagnósticos, medicamentos, fichas médicas.",          keywords: ["salud", "health", "medico", "diagnostico", "enfermedad"] },
  { id: "datos_biometricos",   etiqueta: "Datos biométricos",    tooltip: "Huella dactilar, reconocimiento facial, iris.",         keywords: ["biometrico", "biometric", "huella", "facial"] },
  { id: "origen_etnico",       etiqueta: "Origen étnico",        tooltip: "Raza, etnia, pueblo indígena u origen nacional.",       keywords: ["etnico", "raza", "race", "etnia", "indigena"] },
  { id: "religion_creencias",  etiqueta: "Religión o creencias", tooltip: "Creencias religiosas, filosóficas o morales.",          keywords: ["religion", "creencia", "faith"] },
  { id: "orientacion_sexual",  etiqueta: "Orientación sexual",   tooltip: "Orientación o identidad sexual o de género.",           keywords: ["sexual", "orientacion", "genero", "lgbtq"] },
  { id: "opiniones_politicas", etiqueta: "Opiniones políticas",  tooltip: "Afiliación o posturas políticas.",                      keywords: ["politico", "politica", "partido", "ideologia"] },
  { id: "identidad_genero",    etiqueta: "Identidad de género",  tooltip: "Identidad de género autopercibida.",                    keywords: ["identidad_genero", "identidad_de_genero"] },
  { id: "habitos_personales",  etiqueta: "Hábitos personales",   tooltip: "Hábitos, costumbres o estilo de vida personal.",        keywords: ["habitos", "habitos_personales", "lifestyle"] },
];

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

export default function Paso2() {
  const navigate = useNavigate();
  const { form, actualizarForm, resetForm } = useFormulario();
  const esEdicion = form.modoEdicion;

  const detectadas = new Set();
  form.campos_detectados.forEach((campo) => {
    const col  = campo.nombre_columna.toLowerCase();
    const desc = (campo.descripcion ?? "").toLowerCase();
    CATEGORIAS_DATOS.forEach((cat) => {
      if (cat.keywords.some((kw) => col.includes(kw) || desc.includes(kw))) detectadas.add(cat.id);
    });
    if (campo.tipo === "SENSIBLE") {
      CATEGORIAS_SENSIBLES.forEach((cat) => {
        if (cat.keywords.some((kw) => col.includes(kw) || desc.includes(kw))) detectadas.add(cat.id);
      });
    }
  });

  const haySensiblesDetectados = [...detectadas].some((id) =>
    CATEGORIAS_SENSIBLES.some((c) => c.id === id)
  );

  const [desmarcadas, setDesmarcadas] = useState(new Set());

  const primeraVezEnPaso2 = form.categorias_datos.length === 0 && form.categorias_sensibles.length === 0;

  const categoriasDatosIniciales = primeraVezEnPaso2
    ? [...detectadas].filter((id) => CATEGORIAS_DATOS.some((c) => c.id === id))
    : form.categorias_datos;
  const categoriasSensiblesIniciales = primeraVezEnPaso2
    ? [...detectadas].filter((id) => CATEGORIAS_SENSIBLES.some((c) => c.id === id))
    : form.categorias_sensibles;

  const [local, setLocal] = useState({
    // Campos existentes
    categorias_titulares: form.categorias_titulares || [],
    universo_titulares:   form.universo_titulares || "",
    origen_datos:         form.origen_datos ? form.origen_datos.split(",").filter(Boolean) : [],
    categorias_datos:     categoriasDatosIniciales,
    datos_sensibles:      primeraVezEnPaso2 ? haySensiblesDetectados : form.datos_sensibles,
    categorias_sensibles: categoriasSensiblesIniciales,
    datos_sensibles_descripcion: form.datos_sensibles_descripcion || "",
    otros_datos:          form.otros_datos || "",
    // R9.3: secciones nuevas
    datos_academicos_laborales:      form.datos_academicos_laborales      || "",
    datos_financieros_patrimoniales: form.datos_financieros_patrimoniales || "",
    origen_sistemico_datos:          form.origen_sistemico_datos          || "",
    // B2-05: nuevos campos
    incluye_nna:                        form.incluye_nna                        ?? false,
    nna_detalle:                        form.nna_detalle                        || "",
    datos_navegacion:                   form.datos_navegacion                   ?? false,
    datos_navegacion_detalle:           form.datos_navegacion_detalle           || "",
  });

  const [pendiente, setPendiente] = useState(null);

  function toggleCategoria(cat, campo) {
    const marcado = local[campo].includes(cat.id);
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

  function toggleOrigenDatos(valor) {
    setLocal((prev) => {
      const lista = prev.origen_datos;
      return {
        ...prev,
        origen_datos: lista.includes(valor)
          ? lista.filter((v) => v !== valor)
          : [...lista, valor],
      };
    });
  }

  function toggleSensibles(valor) {
    setLocal((prev) => ({
      ...prev,
      datos_sensibles: valor,
      categorias_sensibles: valor ? prev.categorias_sensibles : [],
    }));
  }

  const [guardandoBorrador, setGuardandoBorrador] = useState(false);
  const [borradorOk, setBorradorOk] = useState(false);

  function handleSiguiente() { actualizarForm({ ...local, origen_datos: local.origen_datos.join(",") }); navigate("/nuevo-tratamiento/paso3"); window.scrollTo(0, 0); }
  function handleAnterior()  { actualizarForm({ ...local, origen_datos: local.origen_datos.join(",") }); navigate("/nuevo-tratamiento"); window.scrollTo(0, 0); }
  function handleCancelar()  {
    if (esEdicion) {
      const editId = form.tratamientoEditId;
      resetForm();
      navigate(`/tratamientos/${editId}`);
    } else {
      navigate("/dashboard");
    }
  }

  async function handleGuardarBorrador() {
    setGuardandoBorrador(true);
    try {
      const datos = { ...form, ...local, origen_datos: local.origen_datos.join(",") };
      actualizarForm(datos);
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

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
        if (!res.ok) throw new Error("sesion");
        const sesion = await res.json();
        sesionId = sesion.id;
        actualizarForm({ sesionActual: sesionId });
      }

      const idx = datos.actividadActual ?? 0;
      // En modo edición, el tratamiento a actualizar es siempre el que se está
      // editando — tratamientosGuardados nunca se llena al entrar por "Editar".
      const tratId = datos.modoEdicion ? datos.tratamientoEditId : datos.tratamientosGuardados?.[idx];

      const destinatariosGenerado = [
        datos.destinatarios_internos,
        datos.destinatarios_nacionales,
        datos.destinatarios_internacionales,
      ].filter(Boolean).join("; ") || datos.destinatarios || null;

      const payload = {
        nombre: datos.nombre.trim() || "Sin nombre",
        finalidad: datos.finalidad || null,
        base_legal: datos.base_legal || null,
        datos_sensibles: datos.datos_sensibles ?? false,
        destinatarios: destinatariosGenerado,
        sale_extranjero: datos.sale_extranjero ?? false,
        campos_detectados: datos.campos_detectados || [],
        campos_usados: datos.campos_detectados || [],
        detalle: {
          responsable_tratamiento: datos.responsable || null,
          es_responsable: datos.es_responsable ?? true,
          categorias_titulares: (datos.categorias_titulares || []).join(",") || null,
          universo_titulares: datos.universo_titulares || null,
          origen_datos: datos.origen_datos || null,
        },
        detalle_extendido: {
          datos_sensibles_descripcion:        datos.datos_sensibles_descripcion        || null,
          otros_datos:                        datos.otros_datos                        || null,
          datos_academicos_laborales:         datos.datos_academicos_laborales         || null,
          datos_financieros_patrimoniales:    datos.datos_financieros_patrimoniales    || null,
          origen_sistemico_datos:             datos.origen_sistemico_datos             || null,
          incluye_nna:                        datos.incluye_nna ? true : null,
          nna_detalle:                        datos.nna_detalle || null,
          datos_navegacion:                   datos.datos_navegacion ? true : null,
          datos_navegacion_detalle:           datos.datos_navegacion_detalle || null,
          categorias_sensibles:               (datos.categorias_sensibles || []).join(",") || null,
          categorias_datos_seleccion:         (datos.categorias_datos || []).join(",") || null,
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
        if (!res.ok) throw new Error("tratamiento");
        const trat = await res.json();
        currentTratId = trat.id;
      }

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

  return (
    <div className="p2-layout">
      <BarraLateral />

      <main className="p2-main">
        <div className="p2-header">
          <h1 className="p2-titulo">{esEdicion ? "Editar tratamiento" : "Nuevo tratamiento"}</h1>
          <p className="p2-subtitulo">{esEdicion ? "Modifica la información del tratamiento" : "Completa la información para registrar este tratamiento en el RAT"}</p>
        </div>

        <div className="p2-card">
          <BarraProgreso pasoActual={2} prefix="p2" />

          {/* ── Grid 3 columnas ───────────────────────────────── */}
          <div className="p2-grid">

            {/* ── Columna 1: Titulares ─────────────────────────── */}
            <div className="p2-columna">
              <h3 className="p2-col-titulo">Categoría de titulares</h3>
              <p className="p2-col-desc">¿Qué tipo de personas son los titulares de estos datos?</p>
              <div className="p2-checkboxes">
                {CATEGORIAS_TITULARES.map((cat) => {
                  const marcado = local.categorias_titulares.includes(cat.id);
                  return (
                    <label key={cat.id} className={`p2-check-item ${marcado ? "p2-check-item--marcado" : ""}`}>
                      <input type="checkbox" className="p2-check-input"
                        checked={marcado}
                        onChange={() => setLocal((prev) => {
                          const lista = prev.categorias_titulares;
                          return {
                            ...prev,
                            categorias_titulares: lista.includes(cat.id)
                              ? lista.filter((x) => x !== cat.id)
                              : [...lista, cat.id],
                          };
                        })}
                      />
                      <span className="p2-check-texto">{cat.etiqueta}</span>
                    </label>
                  );
                })}
              </div>

              <div className="p2-campo-grupo">
                <label className="p2-campo-label">Universo de titulares</label>
                <p className="p2-campo-ayuda">Describe quiénes son las personas cuyos datos trata esta actividad</p>
                <textarea className="p2-textarea"
                  placeholder="Ej: Alumnos y apoderados del establecimiento educacional"
                  value={local.universo_titulares}
                  onChange={(e) => setLocal((prev) => ({ ...prev, universo_titulares: e.target.value }))}
                  rows={3} maxLength={2000}
                />
                <span className="p2-campo-contador">{local.universo_titulares.length}/2000</span>
              </div>

              <div className="p2-campo-grupo">
                <label className="p2-campo-label">Origen de los datos</label>
                <div className="p2-checkboxes">
                  {ORIGENES_DATOS.map((o) => {
                    const marcado = local.origen_datos.includes(o.valor);
                    return (
                      <label key={o.valor} className={`p2-check-item ${marcado ? "p2-check-item--marcado" : ""}`}>
                        <input type="checkbox" className="p2-check-input"
                          checked={marcado}
                          onChange={() => toggleOrigenDatos(o.valor)}
                        />
                        <span className="p2-check-texto">{o.etiqueta}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ── Columna 2: Categorías de datos ──────────────── */}
            <div className="p2-columna">
              <h3 className="p2-col-titulo">Categoría de datos personales</h3>
              <div className="p2-checkboxes">
                {CATEGORIAS_DATOS_IDENTIFICACION.map((cat) => {
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
                <div className="p2-otros-wrap">
                  <label className="p2-otros-label">Otros</label>
                  <textarea className="p2-otros-textarea"
                    placeholder="Especifica otros tipos de datos personales..."
                    value={local.otros_datos}
                    onChange={(e) => setLocal((prev) => ({ ...prev, otros_datos: e.target.value }))}
                    rows={2} maxLength={2000}
                  />
                  <span className="p2-campo-contador">{local.otros_datos.length}/2000</span>
                </div>
              </div>

              {/* Datos de contacto — bloque propio (R9.3), mismo dato (categorias_datos) por debajo */}
              <div className="p2-separador" />
              <label className="p2-campo-label">Datos de contacto</label>
              <div className="p2-checkboxes">
                {CATEGORIAS_DATOS_CONTACTO.map((cat) => {
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
              </div>

              <div className="p2-campo-grupo">
                <label className="p2-campo-label">Datos académicos / laborales</label>
                <p className="p2-campo-ayuda">Grado académico, título profesional, cargo o función, certificaciones...</p>
                <textarea className="p2-textarea"
                  placeholder="Ej: Título profesional, cargo actual, certificaciones vigentes..."
                  value={local.datos_academicos_laborales}
                  onChange={(e) => setLocal((prev) => ({ ...prev, datos_academicos_laborales: e.target.value }))}
                  rows={3} maxLength={1500}
                />
                <span className="p2-campo-contador">{local.datos_academicos_laborales.length}/1500</span>
              </div>
            </div>

            {/* ── Columna 3: Datos sensibles + Destinatarios ── */}
            <div className="p2-columna">
              <h3 className="p2-col-titulo">
                ¿Este tratamiento incluye datos sensibles?
                <Tooltip texto="Los datos sensibles exigen mayor protección según el Art. 16 de la Ley 21.719." />
              </h3>

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
                  <div className="p2-campo-grupo">
                    <label className="p2-campo-label">Descripción de los datos sensibles</label>
                    <textarea className="p2-textarea"
                      placeholder="Describe con tus palabras los datos sensibles que se tratan..."
                      value={local.datos_sensibles_descripcion}
                      onChange={(e) => setLocal((prev) => ({ ...prev, datos_sensibles_descripcion: e.target.value }))}
                      rows={3} maxLength={1500}
                    />
                    <span className="p2-campo-contador">{local.datos_sensibles_descripcion.length}/1500</span>
                  </div>
                </div>
              )}
            </div>

          </div>{/* fin grid */}

          {/* ── Secciones adicionales ─────────────────────────── */}
          <div className="p2-secciones-extra">

            {/* Datos especiales: NNA + navegación */}
            <div className="p2-seccion-extra">
              <h3 className="p2-seccion-extra-titulo">Datos especiales</h3>
              <div className="p2-toggles-fila">

                <div className="p2-toggle-item">
                  <label className="p2-check-item">
                    <input type="checkbox" className="p2-check-input"
                      checked={local.incluye_nna}
                      onChange={(e) => setLocal((p) => ({
                        ...p,
                        incluye_nna: e.target.checked,
                        nna_detalle: e.target.checked ? p.nna_detalle : "",
                      }))}
                    />
                    <span className="p2-check-texto">¿El tratamiento incluye datos de menores de edad (NNA)?</span>
                  </label>
                  {local.incluye_nna && (
                    <textarea className="p2-textarea" rows={2} maxLength={1500}
                      placeholder="Ej: Fichas de alumnos, datos médicos de menores de 18 años..."
                      value={local.nna_detalle}
                      onChange={(e) => setLocal((p) => ({ ...p, nna_detalle: e.target.value }))}
                      style={{ marginTop: 6 }}
                    />
                  )}
                </div>

                <div className="p2-toggle-item">
                  <label className="p2-check-item">
                    <input type="checkbox" className="p2-check-input"
                      checked={local.datos_navegacion}
                      onChange={(e) => setLocal((p) => ({
                        ...p,
                        datos_navegacion: e.target.checked,
                        datos_navegacion_detalle: e.target.checked ? p.datos_navegacion_detalle : "",
                      }))}
                    />
                    <span className="p2-check-texto">¿Se tratan datos de navegación o identificadores digitales?</span>
                  </label>
                  {local.datos_navegacion && (
                    <textarea className="p2-textarea" rows={2} maxLength={1500}
                      placeholder="Ej: IP, cookies de sesión, ID de dispositivo, geolocalización..."
                      value={local.datos_navegacion_detalle}
                      onChange={(e) => setLocal((p) => ({ ...p, datos_navegacion_detalle: e.target.value }))}
                      style={{ marginTop: 6 }}
                    />
                  )}
                </div>

                <div className="p2-toggle-item">
                  <div className="p2-campo-grupo">
                    <label className="p2-campo-label">Datos financieros y patrimoniales</label>
                    <p className="p2-campo-ayuda">Ingresos, cuenta corriente, historial bancario, bienes muebles e inmuebles...</p>
                    <textarea className="p2-textarea" rows={3} maxLength={1500}
                      placeholder="Ej: Ingresos mensuales, cuenta corriente, historial crediticio..."
                      value={local.datos_financieros_patrimoniales}
                      onChange={(e) => setLocal((p) => ({ ...p, datos_financieros_patrimoniales: e.target.value }))}
                    />
                    <span className="p2-campo-contador">{local.datos_financieros_patrimoniales.length}/1500</span>
                  </div>
                </div>

              </div>
            </div>

            {/* Origen sistémico de los datos (R9.3) */}
            <div className="p2-seccion-extra">
              <h3 className="p2-seccion-extra-titulo">¿Cuál es el origen sistémico de los datos?</h3>
              <p className="p2-campo-ayuda">Sistemas o bases de datos desde donde se originan estos datos, en términos generales.</p>
              <textarea className="p2-textarea" rows={3} maxLength={1500}
                placeholder="Ej: Los datos se generan y almacenan directamente en el sistema interno de gestión..."
                value={local.origen_sistemico_datos}
                onChange={(e) => setLocal((p) => ({ ...p, origen_sistemico_datos: e.target.value }))}
              />
              <span className="p2-campo-contador">{local.origen_sistemico_datos.length}/1500</span>
            </div>

          </div>{/* fin secciones-extra */}

          {/* ── Toast borrador guardado ── */}
          {borradorOk && (
            <div className="p2-toast-borrador">
              <span className="p2-toast-texto">✓ Borrador guardado correctamente.</span>
              <div className="p2-toast-acciones">
                <button className="p2-toast-btn p2-toast-btn--dashboard" onClick={() => navigate("/dashboard")}>
                  Ir al dashboard
                </button>
                <button className="p2-toast-btn p2-toast-btn--continuar" onClick={() => setBorradorOk(false)}>
                  Continuar aquí
                </button>
              </div>
            </div>
          )}

          {/* ── Navegación ───────────────────────────────────── */}
          <div className="p2-navegacion">
            <div className="p2-nav-izquierda">
              <button className="p2-btn p2-btn--cancelar" onClick={handleCancelar}>Cancelar</button>
              {!esEdicion && (
                <button className="p2-btn p2-btn--borrador" onClick={handleGuardarBorrador} disabled={guardandoBorrador}>
                  {guardandoBorrador ? "Guardando..." : "Guardar borrador"}
                </button>
              )}
            </div>
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
