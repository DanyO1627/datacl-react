import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFormulario } from "../../context/FormularioContext";
import BarraLateral from "../../components/BarraLateral";
import "../../styles/formularioCss/paso2.css";

const API = "http://localhost:8000";

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
  { valor: "titular",          etiqueta: "Del propio titular" },
  { valor: "terceros",         etiqueta: "De terceros" },
  { valor: "fuentes_publicas", etiqueta: "De fuentes públicas" },
];

const CATEGORIAS_DATOS = [
  { id: "nombre_apellido",    etiqueta: "Nombre y apellido",   keywords: ["nombre", "apellido", "name", "lastname", "first_name", "last_name"] },
  { id: "rut_dni",            etiqueta: "RUT / DNI",           keywords: ["rut", "dni", "documento", "cedula", "id_number"] },
  { id: "correo_electronico", etiqueta: "Correo electrónico",  keywords: ["correo", "email", "mail", "e_mail"] },
  { id: "telefono",           etiqueta: "Teléfono",            keywords: ["telefono", "phone", "celular", "movil", "fono", "tel"] },
  { id: "direccion",          etiqueta: "Dirección",           keywords: ["direccion", "address", "domicilio", "calle"] },
  { id: "fecha_nacimiento",   etiqueta: "Fecha de nacimiento", keywords: ["fecha_nacimiento", "birthdate", "birth_date", "nacimiento"] },
];

const CATEGORIAS_SENSIBLES = [
  { id: "datos_salud",         etiqueta: "Datos de salud",       tooltip: "Diagnósticos, medicamentos, fichas médicas.",          keywords: ["salud", "health", "medico", "diagnostico", "enfermedad"] },
  { id: "datos_biometricos",   etiqueta: "Datos biométricos",    tooltip: "Huella dactilar, reconocimiento facial, iris.",         keywords: ["biometrico", "biometric", "huella", "facial"] },
  { id: "origen_etnico",       etiqueta: "Origen étnico",        tooltip: "Raza, etnia, pueblo indígena u origen nacional.",       keywords: ["etnico", "raza", "race", "etnia", "indigena"] },
  { id: "religion_creencias",  etiqueta: "Religión o creencias", tooltip: "Creencias religiosas, filosóficas o morales.",          keywords: ["religion", "creencia", "faith"] },
  { id: "orientacion_sexual",  etiqueta: "Orientación sexual",   tooltip: "Orientación o identidad sexual o de género.",           keywords: ["sexual", "orientacion", "genero", "lgbtq"] },
  { id: "opiniones_politicas", etiqueta: "Opiniones políticas",  tooltip: "Afiliación o posturas políticas.",                      keywords: ["politico", "politica", "partido", "ideologia"] },
];

const TIPOS_TRATAMIENTO_SISTEMA = [
  { id: "captura",                  etiqueta: "Captura" },
  { id: "consulta",                 etiqueta: "Consulta / visualización" },
  { id: "modificacion",             etiqueta: "Modificación" },
  { id: "perfilamiento",            etiqueta: "Perfilamiento" },
  { id: "reportes",                 etiqueta: "Generación de reportes" },
  { id: "decisiones_automatizadas", etiqueta: "Decisiones automatizadas" },
  { id: "comunicacion_terceros",    etiqueta: "Comunicación a terceros" },
];

const METODOS_TRANSFERENCIA = [
  { id: "digital", etiqueta: "Digital" },
  { id: "verbal",  etiqueta: "Verbal" },
  { id: "fisico",  etiqueta: "Físico" },
];

const ORDEN_CATEGORIAS_TEMATICAS = [
  "Datos identificatorios", "Datos de contacto", "Datos de salud",
  "Datos financieros", "Datos laborales", "Datos académicos",
  "Datos biométricos", "Otros",
];

function generarTextoCategoria(campos) {
  const grupos = {};
  campos.forEach((campo) => {
    const categoria = campo.categoria_tematica || "Otros";
    const nombre = campo.nombre_columna
      .replace(/_/g, " ")
      .split(" ")
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
      .join(" ");
    (grupos[categoria] ??= []).push(nombre);
  });
  return ORDEN_CATEGORIAS_TEMATICAS
    .filter((c) => grupos[c])
    .map((c) => `${c} — ${grupos[c].join(", ")}.`)
    .join("\n");
}

function generarTextoCategoriaManual(idsDatos, idsSensibles) {
  return [
    ...idsDatos.map((id) => CATEGORIAS_DATOS.find((c) => c.id === id)?.etiqueta || id),
    ...idsSensibles.map((id) => CATEGORIAS_SENSIBLES.find((c) => c.id === id)?.etiqueta || id),
  ].join(", ");
}

function sincronizarOtrosEnCategoria(categoriaActual, textoOtros) {
  const base = (categoriaActual || "").replace(/\n?Otros — .*\.?$/, "").replace(/\s+$/, "");
  const otros = (textoOtros || "").trim();
  if (!otros) return base;
  return base ? `${base}\nOtros — ${otros}.` : `Otros — ${otros}.`;
}

function BarraProgreso({ pasoActual }) {
  const pasos = ["Identificación", "Datos y titulares", "Seguridad y conservación"];
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
  const { form, actualizarForm } = useFormulario();

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

  const categoriaDatosInicial = form.categoria_datos || (
    form.campos_detectados.length > 0
      ? generarTextoCategoria(form.campos_detectados)
      : generarTextoCategoriaManual(categoriasDatosIniciales, categoriasSensiblesIniciales)
  );

  const [local, setLocal] = useState({
    // Campos existentes
    categorias_titulares: form.categorias_titulares || [],
    universo_titulares:   form.universo_titulares || "",
    origen_datos:         form.origen_datos || "",
    categorias_datos:     categoriasDatosIniciales,
    datos_sensibles:      primeraVezEnPaso2 ? haySensiblesDetectados : form.datos_sensibles,
    categorias_sensibles: categoriasSensiblesIniciales,
    categoria_datos:      categoriaDatosInicial,
    destinatarios:        form.destinatarios || "",
    sale_extranjero:      form.sale_extranjero ?? false,
    pais_destino:         form.pais_destino || "",
    otros_datos:          form.otros_datos || "",
    // B2-05: nuevos campos
    incluye_nna:                        form.incluye_nna                        ?? false,
    nna_detalle:                        form.nna_detalle                        || "",
    datos_navegacion:                   form.datos_navegacion                   ?? false,
    datos_navegacion_detalle:           form.datos_navegacion_detalle           || "",
    destinatarios_internos:             form.destinatarios_internos             || "",
    destinatarios_nacionales:           form.destinatarios_nacionales           || "",
    destinatarios_internacionales:      form.destinatarios_internacionales      || "",
    terceros_son_encargados:            form.terceros_son_encargados            ?? false,
    contratos_proteccion_datos:         form.contratos_proteccion_datos         ?? false,
    contratos_proteccion_datos_detalle: form.contratos_proteccion_datos_detalle || "",
    datos_transferidos_detalle:         form.datos_transferidos_detalle         || "",
    metodo_transferencia:               form.metodo_transferencia               || [],
    sistemas_origen:                    form.sistemas_origen                    || "",
    sistemas_destino:                   form.sistemas_destino                   || "",
    sistemas_tratamiento:               form.sistemas_tratamiento               || "",
    tipos_tratamiento_sistema:          form.tipos_tratamiento_sistema          || [],
    base_datos_nombre:                  form.base_datos_nombre                  || "",
    proveedor_tecnologico:              form.proveedor_tecnologico              || "",
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

  function toggleMetodoTransferencia(id) {
    setLocal((prev) => {
      const lista = prev.metodo_transferencia;
      return { ...prev, metodo_transferencia: lista.includes(id) ? lista.filter((x) => x !== id) : [...lista, id] };
    });
  }

  function toggleTiposTratamiento(id) {
    setLocal((prev) => {
      const lista = prev.tipos_tratamiento_sistema;
      return { ...prev, tipos_tratamiento_sistema: lista.includes(id) ? lista.filter((x) => x !== id) : [...lista, id] };
    });
  }

  function handleInternacionales(texto) {
    setLocal((prev) => ({
      ...prev,
      destinatarios_internacionales: texto,
      sale_extranjero: texto.trim() !== "" ? true : prev.sale_extranjero,
    }));
  }

  const [guardandoBorrador, setGuardandoBorrador] = useState(false);
  const [borradorOk, setBorradorOk] = useState(false);

  function handleSiguiente() { actualizarForm(local); navigate("/nuevo-tratamiento/paso3"); }
  function handleAnterior()  { actualizarForm(local); navigate("/nuevo-tratamiento"); }
  function handleCancelar()  { navigate("/dashboard"); }

  async function handleGuardarBorrador() {
    setGuardandoBorrador(true);
    try {
      actualizarForm(local);
      const datos = { ...form, ...local };
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
      const tratId = datos.tratamientosGuardados?.[idx];

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
          departamento: datos.departamento || null,
          categorias_titulares: (datos.categorias_titulares || []).join(",") || null,
          universo_titulares: datos.universo_titulares || null,
          origen_datos: datos.origen_datos || null,
          categoria_datos: datos.categoria_datos || null,
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
          <h1 className="p2-titulo">Nuevo tratamiento</h1>
          <p className="p2-subtitulo">Completa la información para registrar este tratamiento en el RAT</p>
        </div>

        <div className="p2-card">
          <BarraProgreso pasoActual={2} />

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
                  rows={3} maxLength={500}
                />
                <span className="p2-campo-contador">{local.universo_titulares.length}/500</span>
              </div>

              <div className="p2-campo-grupo">
                <label className="p2-campo-label">Origen de los datos</label>
                <select className="p2-select"
                  value={local.origen_datos}
                  onChange={(e) => setLocal((prev) => ({ ...prev, origen_datos: e.target.value }))}
                >
                  <option value="">Selecciona el origen...</option>
                  {ORIGENES_DATOS.map((o) => (
                    <option key={o.valor} value={o.valor}>{o.etiqueta}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* ── Columna 2: Categorías de datos ──────────────── */}
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
                <div className="p2-otros-wrap">
                  <label className="p2-otros-label">Otros</label>
                  <textarea className="p2-otros-textarea"
                    placeholder="Especifica otros tipos de datos personales..."
                    value={local.otros_datos}
                    onChange={(e) => {
                      const texto = e.target.value;
                      setLocal((prev) => ({
                        ...prev,
                        otros_datos: texto,
                        categoria_datos: sincronizarOtrosEnCategoria(prev.categoria_datos, texto),
                      }));
                    }}
                    rows={2} maxLength={300}
                  />
                  <span className="p2-campo-contador">{local.otros_datos.length}/300</span>
                </div>
              </div>

              <div className="p2-campo-grupo">
                <label className="p2-campo-label">Categoría de datos (formato RAT)</label>
                <p className="p2-campo-ayuda">Generado automáticamente. Puedes editarlo.</p>
                <textarea className="p2-textarea"
                  placeholder="Ej: Datos identificatorios — Rut Alumno, Nombre Apoderado."
                  value={local.categoria_datos}
                  onChange={(e) => setLocal((prev) => ({ ...prev, categoria_datos: e.target.value }))}
                  rows={5} maxLength={1500}
                />
                <span className="p2-campo-contador">{local.categoria_datos.length}/1500</span>
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
                </div>
              )}

              <div className="p2-separador" />

              <h3 className="p2-col-titulo">Destinatarios de los datos</h3>

              <div className="p2-campo-grupo">
                <label className="p2-campo-label">Internos</label>
                <p className="p2-campo-ayuda">Áreas o unidades internas que acceden a los datos</p>
                <textarea className="p2-textarea"
                  placeholder="Ej: RRHH, Contabilidad, TI..."
                  value={local.destinatarios_internos}
                  onChange={(e) => setLocal((p) => ({ ...p, destinatarios_internos: e.target.value }))}
                  rows={2} maxLength={300}
                />
              </div>

              <div className="p2-campo-grupo">
                <label className="p2-campo-label">Nacionales</label>
                <p className="p2-campo-ayuda">Empresas o entidades externas en Chile</p>
                <textarea className="p2-textarea"
                  placeholder="Ej: AFP Provida, SII, proveedor de nómina..."
                  value={local.destinatarios_nacionales}
                  onChange={(e) => setLocal((p) => ({ ...p, destinatarios_nacionales: e.target.value }))}
                  rows={2} maxLength={300}
                />
              </div>

              <div className="p2-campo-grupo">
                <label className="p2-campo-label">Internacionales</label>
                <p className="p2-campo-ayuda">Terceros fuera de Chile — activa «sale al extranjero» automáticamente</p>
                <textarea className="p2-textarea"
                  placeholder="Ej: Salesforce EE.UU., Google Ireland..."
                  value={local.destinatarios_internacionales}
                  onChange={(e) => handleInternacionales(e.target.value)}
                  rows={2} maxLength={300}
                />
              </div>

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
                  <input type="text" className="p2-input-pais"
                    placeholder="¿A qué país o región?"
                    value={local.pais_destino}
                    onChange={(e) => setLocal((prev) => ({ ...prev, pais_destino: e.target.value }))}
                    maxLength={100}
                  />
                )}
              </div>
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
                    <textarea className="p2-textarea" rows={2} maxLength={400}
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
                    <textarea className="p2-textarea" rows={2} maxLength={400}
                      placeholder="Ej: IP, cookies de sesión, ID de dispositivo, geolocalización..."
                      value={local.datos_navegacion_detalle}
                      onChange={(e) => setLocal((p) => ({ ...p, datos_navegacion_detalle: e.target.value }))}
                      style={{ marginTop: 6 }}
                    />
                  )}
                </div>

              </div>
            </div>

            {/* Terceros y transferencias */}
            <div className="p2-seccion-extra">
              <h3 className="p2-seccion-extra-titulo">Terceros y transferencias</h3>
              <div className="p2-extra-grid">

                <div className="p2-extra-checks">
                  <label className="p2-check-item">
                    <input type="checkbox" className="p2-check-input"
                      checked={local.terceros_son_encargados}
                      onChange={(e) => setLocal((p) => ({ ...p, terceros_son_encargados: e.target.checked }))}
                    />
                    <span className="p2-check-texto">¿Los terceros actúan como encargados del tratamiento?</span>
                  </label>

                  <div>
                    <label className="p2-check-item">
                      <input type="checkbox" className="p2-check-input"
                        checked={local.contratos_proteccion_datos}
                        onChange={(e) => setLocal((p) => ({
                          ...p,
                          contratos_proteccion_datos: e.target.checked,
                          contratos_proteccion_datos_detalle: e.target.checked ? p.contratos_proteccion_datos_detalle : "",
                        }))}
                      />
                      <span className="p2-check-texto">¿Existen contratos de protección de datos firmados con terceros?</span>
                    </label>
                    {local.contratos_proteccion_datos && (
                      <textarea className="p2-textarea" rows={2} maxLength={400}
                        placeholder="Describe los contratos existentes..."
                        value={local.contratos_proteccion_datos_detalle}
                        onChange={(e) => setLocal((p) => ({ ...p, contratos_proteccion_datos_detalle: e.target.value }))}
                        style={{ marginTop: 6 }}
                      />
                    )}
                  </div>
                </div>

                <div>
                  <div className="p2-campo-grupo">
                    <label className="p2-campo-label">¿Qué datos se transfieren a terceros?</label>
                    <textarea className="p2-textarea" rows={3} maxLength={500}
                      placeholder="Ej: Nombre, RUT, correo y sueldo base..."
                      value={local.datos_transferidos_detalle}
                      onChange={(e) => setLocal((p) => ({ ...p, datos_transferidos_detalle: e.target.value }))}
                    />
                  </div>
                  <div className="p2-campo-grupo">
                    <label className="p2-campo-label">¿Cómo se transfieren?</label>
                    <div className="p2-checkboxes">
                      {METODOS_TRANSFERENCIA.map((m) => (
                        <label key={m.id} className={`p2-check-item ${local.metodo_transferencia.includes(m.id) ? "p2-check-item--marcado" : ""}`}>
                          <input type="checkbox" className="p2-check-input"
                            checked={local.metodo_transferencia.includes(m.id)}
                            onChange={() => toggleMetodoTransferencia(m.id)}
                          />
                          <span className="p2-check-texto">{m.etiqueta}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Sistemas y tecnología */}
            <div className="p2-seccion-extra">
              <h3 className="p2-seccion-extra-titulo">Sistemas y tecnología</h3>
              <div className="p2-extra-grid">

                <div className="p2-campo-grupo">
                  <label className="p2-campo-label">Sistemas origen</label>
                  <p className="p2-campo-ayuda">Sistemas donde se originan o capturan los datos</p>
                  <textarea className="p2-textarea" rows={2} maxLength={400}
                    placeholder="Ej: CRM Salesforce, formulario web..."
                    value={local.sistemas_origen}
                    onChange={(e) => setLocal((p) => ({ ...p, sistemas_origen: e.target.value }))}
                  />
                </div>

                <div className="p2-campo-grupo">
                  <label className="p2-campo-label">Sistemas destino</label>
                  <p className="p2-campo-ayuda">Sistemas donde se almacenan o envían los datos</p>
                  <textarea className="p2-textarea" rows={2} maxLength={400}
                    placeholder="Ej: ERP SAP, servidor propio, nube AWS..."
                    value={local.sistemas_destino}
                    onChange={(e) => setLocal((p) => ({ ...p, sistemas_destino: e.target.value }))}
                  />
                </div>

                <div className="p2-campo-grupo">
                  <label className="p2-campo-label">Sistemas de tratamiento</label>
                  <p className="p2-campo-ayuda">Sistemas que procesan activamente los datos</p>
                  <textarea className="p2-textarea" rows={2} maxLength={400}
                    placeholder="Ej: Software de RRHH, plataforma e-commerce..."
                    value={local.sistemas_tratamiento}
                    onChange={(e) => setLocal((p) => ({ ...p, sistemas_tratamiento: e.target.value }))}
                  />
                </div>

                <div className="p2-campo-grupo">
                  <label className="p2-campo-label">Tipos de tratamiento en los sistemas</label>
                  <div className="p2-checkboxes p2-checkboxes--horizontal">
                    {TIPOS_TRATAMIENTO_SISTEMA.map((t) => (
                      <label key={t.id} className={`p2-check-item ${local.tipos_tratamiento_sistema.includes(t.id) ? "p2-check-item--marcado" : ""}`}>
                        <input type="checkbox" className="p2-check-input"
                          checked={local.tipos_tratamiento_sistema.includes(t.id)}
                          onChange={() => toggleTiposTratamiento(t.id)}
                        />
                        <span className="p2-check-texto">{t.etiqueta}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="p2-fila-dos-items">
                  <div className="p2-campo-grupo">
                    <label className="p2-campo-label">Nombre de la base de datos</label>
                    <input type="text" className="p2-input-bd"
                      placeholder="Ej: BD_CLIENTES_PRODUCCION"
                      value={local.base_datos_nombre}
                      onChange={(e) => setLocal((p) => ({ ...p, base_datos_nombre: e.target.value }))}
                      maxLength={200}
                    />
                  </div>
                  <div className="p2-campo-grupo">
                    <label className="p2-campo-label">Proveedor tecnológico</label>
                    <input type="text" className="p2-input-bd"
                      placeholder="Ej: Microsoft Azure, Amazon AWS..."
                      value={local.proveedor_tecnologico}
                      onChange={(e) => setLocal((p) => ({ ...p, proveedor_tecnologico: e.target.value }))}
                      maxLength={200}
                    />
                  </div>
                </div>

              </div>
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
              <button className="p2-btn p2-btn--borrador" onClick={handleGuardarBorrador} disabled={guardandoBorrador}>
                {guardandoBorrador ? "Guardando..." : "Guardar borrador"}
              </button>
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
