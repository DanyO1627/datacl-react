import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useFormulario } from "../../context/FormularioContext";
import { crearTratamiento, actualizarTratamiento } from "../../services/tratamientosService";

import BarraLateral from "../../components/BarraLateral";
import "../../styles/formularioCss/paso3.css";

const API = "http://localhost:8000";

function serializarMedidasSeguridad(medidas, otrasMedidas) {
  const lista = [...(medidas || [])];
  const tieneOtras = lista.includes("otras");
  const base = lista.filter((id) => id !== "otras");

  if (tieneOtras && otrasMedidas?.trim()) {
    base.push(`otras:${otrasMedidas.trim()}`);
  } else if (tieneOtras) {
    base.push("otras");
  }

  return base.length > 0 ? base.join(",") : null;
}

function formatearErrorApi(detail) {
  if (!detail) return "Error al guardar el tratamiento";
  if (typeof detail === "string") return detail;

  if (Array.isArray(detail)) {
    return detail.map((item) => {
      if (typeof item === "string") return item;
      if (item?.msg) {
        const campo = Array.isArray(item.loc) ? item.loc.slice(1).join(" > ") : "";
        return campo ? `${campo}: ${item.msg}` : item.msg;
      }
      return JSON.stringify(item);
    }).join(". ");
  }

  if (typeof detail === "object") {
    if (typeof detail.message === "string") return detail.message;
    return JSON.stringify(detail);
  }

  return String(detail);
}

/* ─── Opciones de plazo de conservación ─────────────────────────
 * "otro" es especial — muestra un campo libre al seleccionarlo.
 */
const PLAZOS = [
  { valor: "1_anio", etiqueta: "1 año" },
  { valor: "2_anios", etiqueta: "2 años" },
  { valor: "5_anios", etiqueta: "5 años" },
  { valor: "10_anios", etiqueta: "10 años" },
  { valor: "indefinido", etiqueta: "Indefinido" },
  { valor: "duracion_relacion", etiqueta: "Mientras dure la relación contractual" },
  { valor: "otro", etiqueta: "Otro" },
];

/* ─── Medidas de seguridad ───────────────────────────────────────
 * "otras" es especial — muestra campo libre al marcarlo.
 */
const MEDIDAS = [
  { id: "cifrado", etiqueta: "Cifrado de datos" },
  { id: "acceso_rol", etiqueta: "Control de acceso por rol" },
  { id: "backups", etiqueta: "Backups periódicos" },
  { id: "contraseñas", etiqueta: "Política de contraseñas" },
  { id: "auditoria", etiqueta: "Auditoría de accesos" },
  { id: "otras", etiqueta: "Otras" },
];

/* ─── Etiquetas legibles para el acordeón ───────────────────────
 * Necesitamos mostrar texto amigable en vez de los valores internos.
 */
const ETIQ_BASE_LEGAL = {
  consentimiento:           "Consentimiento (Art. 12)",
  datos_economicos:         "Obligaciones económicas o financieras (Art. 13 letra a)",
  obligacion_legal:         "Obligación legal (Art. 13 letra b)",
  contrato:                 "Ejecución de contrato (Art. 13 letra c)",
  interes_legitimo:         "Interés legítimo (Art. 13 letra d)",
  defensa_derechos:         "Defensa de derechos ante tribunales (Art. 13 letra e)",
  consentimiento_sensibles: "Consentimiento expreso — datos sensibles (Art. 16 inc. 1)",
  datos_biometricos:        "Datos biométricos (Art. 16 ter)",
};

const ETIQ_ORIGEN = {
  titular:          "Del propio titular",
  terceros:         "De terceros",
  fuentes_publicas: "De fuentes públicas",
};

const ETIQ_TITULARES = {
  empleados:   "Empleados y funcionarios",
  clientes:    "Clientes y consumidores",
  proveedores: "Proveedores y contratistas",
  usuarios:    "Usuarios de plataformas digitales",
  ciudadanos:  "Ciudadanos",
  estudiantes: "Estudiantes",
  pacientes:   "Pacientes",
};

const ETIQ_PLAZO = {
  "1_anio": "1 año",
  "2_anios": "2 años",
  "5_anios": "5 años",
  "10_anios": "10 años",
  indefinido: "Indefinido",
  duracion_relacion: "Mientras dure la relación contractual",
  otro: "Otro",
};

const ETIQ_MEDIDAS = {
  cifrado: "Cifrado de datos",
  acceso_rol: "Control de acceso por rol",
  backups: "Backups periódicos",
  contraseñas: "Política de contraseñas",
  auditoria: "Auditoría de accesos",
  otras: "Otras",
};

const ETIQ_SENSIBLES = {
  datos_salud:         "Datos de salud",
  datos_biometricos:   "Datos biométricos",
  origen_etnico:       "Origen étnico",
  religion_creencias:  "Religión o creencias",
  orientacion_sexual:  "Orientación sexual",
  opiniones_politicas: "Opiniones políticas",
};

const ETIQ_CATEGORIAS = {
  nombre_apellido: "Nombre y apellido",
  rut_dni: "RUT / DNI",
  correo_electronico: "Correo electrónico",
  telefono: "Teléfono",
  direccion: "Dirección",
  fecha_nacimiento: "Fecha de nacimiento",
};

/* ─── Barra de progreso ──────────────────────────────────────── */
function BarraProgreso({ pasoActual }) {
  const pasos = ["Identificación", "Datos y titulares", "Seguridad y conservación"];
  return (
    <div className="p3-progreso">
      {pasos.map((nombre, i) => {
        const num = i + 1;
        const activo = num === pasoActual;
        const completado = num < pasoActual;
        return (
          <div key={i} className="p3-progreso-item">
            <div className={`p3-paso-burbuja ${activo ? "activo" : ""} ${completado ? "completado" : ""}`}>
              {completado ? "✓" : num}
            </div>
            <span className={`p3-paso-nombre ${activo ? "activo" : ""}`}>{nombre}</span>
            {i < pasos.length - 1 && <div className={`p3-paso-linea ${completado ? "completada" : ""}`} />}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Componente principal ───────────────────────────────────── */
export default function Paso3() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const { form, actualizarForm, resetForm, avanzarActividad } = useFormulario();
  const categoriasDatos = form.categorias_datos || [];
  const categoriasSensibles = form.categorias_sensibles || [];
  const camposDetectados = form.campos_detectados || [];

  /* Estado local — mismo patrón de Paso1 y Paso2 */
  const [local, setLocal] = useState({
    plazo_conservacion: form.plazo_conservacion || "",
    plazo_otro: form.plazo_otro || "",
    medidas_seguridad: form.medidas_seguridad || [],
    otras_medidas: form.otras_medidas || "",
    decisiones_automatizadas: form.decisiones_automatizadas ?? false,
  });

  /* Acordeón de revisión — por defecto cerrado */
  const [acordeonAbierto, setAcordeonAbierto] = useState(false);

  const [guardando, setGuardando] = useState(false);
  const [guardandoBorrador, setGuardandoBorrador] = useState(false);
  const [borradorOk, setBorradorOk] = useState(false);
  const [error, setError] = useState("");

  /* ── Medidas de seguridad (checkboxes) ──────────────────────── */
  function toggleMedida(id) {
    setLocal((prev) => {
      const lista = prev.medidas_seguridad;
      return {
        ...prev,
        medidas_seguridad: lista.includes(id) ? lista.filter((x) => x !== id) : [...lista, id],
      };
    });
  }

  /* ── Guardar al backend ──────────────────────────────────────── */
  async function handleGuardar() {
    setGuardando(true);
    setError("");

    actualizarForm(local);
    const formularioCompleto = { ...form, ...local };

    const payload = {
      // Campos del tratamiento principal
      nombre:                   formularioCompleto.nombre,
      finalidad:                formularioCompleto.finalidad    || null,
      base_legal:               formularioCompleto.base_legal   || null,
      datos_sensibles:          formularioCompleto.datos_sensibles      ?? false,
      destinatarios: [
        formularioCompleto.destinatarios_internos,
        formularioCompleto.destinatarios_nacionales,
        formularioCompleto.destinatarios_internacionales,
      ].filter(Boolean).join("; ") || formularioCompleto.destinatarios || null,
      sale_extranjero:          formularioCompleto.sale_extranjero      ?? false,
      plazo_conservacion:       formularioCompleto.plazo_conservacion   || null,
      plazo_otro:               formularioCompleto.plazo_otro           || null,
      medidas_seguridad: serializarMedidasSeguridad(
        formularioCompleto.medidas_seguridad,
        formularioCompleto.otras_medidas
      ),
      otras_medidas:            formularioCompleto.otras_medidas        || null,
      decisiones_automatizadas: formularioCompleto.decisiones_automatizadas ?? false,
      campos_detectados:        formularioCompleto.campos_detectados    || [],
      sesion_id:                formularioCompleto.sesionActual         || null,
      campos_usados:            formularioCompleto.sesionActual
        ? (formularioCompleto.campos_detectados || []).map((c) => c.nombre_columna)
        : null,

      // Objeto detalle — va a la tabla detalle_rat con los nombres del schema
      detalle: {
        responsable_tratamiento: formularioCompleto.responsable    || null,
        es_responsable:          formularioCompleto.es_responsable ?? true,
        departamento:            formularioCompleto.departamento   || null,
        // el backend espera string; el frontend lo tiene como array
        categorias_titulares: (formularioCompleto.categorias_titulares || []).join(",") || null,
        universo_titulares:   formularioCompleto.universo_titulares || null,
        origen_datos:         formularioCompleto.origen_datos || null,
        categoria_datos:      formularioCompleto.categoria_datos || null,
      },

    };

    // Solo incluir detalle_extendido si tiene al menos un campo con valor
    const _ext = {
      descripcion_detallada:       formularioCompleto.descripcion_detallada       || null,
      subarea_responsable:         formularioCompleto.subarea_responsable         || null,
      procesos_relacionados:       formularioCompleto.procesos_relacionados       || null,
      finalidades_secundarias:     formularioCompleto.finalidades_secundarias     || null,
      informa_titulares:           (formularioCompleto.informa_titulares || []).join(",") || null,
      documento_respaldo_permiso:  formularioCompleto.documento_respaldo_tiene === true
        ? (formularioCompleto.documento_respaldo_descripcion || "Sí")
        : null,
      // B2-05
      incluye_nna:                        formularioCompleto.incluye_nna ? true : null,
      nna_detalle:                        formularioCompleto.nna_detalle || null,
      datos_navegacion:                   formularioCompleto.datos_navegacion ? true : null,
      datos_navegacion_detalle:           formularioCompleto.datos_navegacion_detalle || null,
      destinatarios_internos:             formularioCompleto.destinatarios_internos || null,
      destinatarios_nacionales:           formularioCompleto.destinatarios_nacionales || null,
      destinatarios_internacionales:      formularioCompleto.destinatarios_internacionales || null,
      terceros_son_encargados:            formularioCompleto.terceros_son_encargados ? true : null,
      contratos_proteccion_datos:         formularioCompleto.contratos_proteccion_datos ? true : null,
      contratos_proteccion_datos_detalle: formularioCompleto.contratos_proteccion_datos_detalle || null,
      datos_transferidos_detalle:         formularioCompleto.datos_transferidos_detalle || null,
      metodo_transferencia:               (formularioCompleto.metodo_transferencia || []).join(",") || null,
      sistemas_origen:                    formularioCompleto.sistemas_origen || null,
      sistemas_destino:                   formularioCompleto.sistemas_destino || null,
      sistemas_tratamiento:               formularioCompleto.sistemas_tratamiento || null,
      tipos_tratamiento_sistema:          (formularioCompleto.tipos_tratamiento_sistema || []).join(",") || null,
      base_datos_nombre:                  formularioCompleto.base_datos_nombre || null,
      proveedor_tecnologico:              formularioCompleto.proveedor_tecnologico || null,
    };
    if (Object.values(_ext).some((v) => v !== null)) {
      payload.detalle_extendido = _ext;
    }

    try {
      const idx = form.actividadActual ?? 0;
      const tratId = form.tratamientosGuardados?.[idx];

      if (tratId) {
        // Ya existe un borrador — actualizar con PUT y cambiar estado
        const medStr = serializarMedidasSeguridad(
          formularioCompleto.medidas_seguridad,
          formularioCompleto.otras_medidas,
        );
        const tieneDestinatarios = formularioCompleto.destinatarios ||
          formularioCompleto.destinatarios_internos ||
          formularioCompleto.destinatarios_nacionales ||
          formularioCompleto.destinatarios_internacionales;
        const estadoFinal = (
          formularioCompleto.finalidad &&
          formularioCompleto.base_legal &&
          formularioCompleto.plazo_conservacion &&
          tieneDestinatarios &&
          medStr
        ) ? "COMPLETO" : "PENDIENTE";

        await actualizarTratamiento(tratId, { ...payload, estado: estadoFinal });
      } else {
        await crearTratamiento(payload);
      }

      const hayMas =
        form.actividadesPendientes.length > 0 &&
        form.actividadActual + 1 < form.actividadesPendientes.length;
      if (hayMas) {
        avanzarActividad();
        navigate("/nuevo-tratamiento");
      } else {
        if (form.sesionActual) {
          await fetch(`${API}/sesiones/${form.sesionActual}/estado`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ estado: "completada" }),
          });
        }
        resetForm();
        navigate("/mis-tratamientos");
      }
    } catch (e) {
      if (e.codigo === 401) {
        navigate("/login");
        return;
      }
      console.error("ERROR GUARDAR:", e.message, e.errores);
      setError(e.message || "Error al guardar el tratamiento. Intenta nuevamente.");
    } finally {
      setGuardando(false);
    }
  }

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
      const medStr = serializarMedidasSeguridad(local.medidas_seguridad, local.otras_medidas);
      const payload3 = {
        nombre: datos.nombre.trim() || "Sin nombre",
        finalidad: datos.finalidad || null,
        base_legal: datos.base_legal || null,
        datos_sensibles: datos.datos_sensibles ?? false,
        destinatarios: [
          datos.destinatarios_internos,
          datos.destinatarios_nacionales,
          datos.destinatarios_internacionales,
        ].filter(Boolean).join("; ") || datos.destinatarios || null,
        sale_extranjero: datos.sale_extranjero ?? false,
        plazo_conservacion: local.plazo_conservacion || null,
        medidas_seguridad: medStr,
        decisiones_automatizadas: local.decisiones_automatizadas ?? false,
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
        detalle_extendido: {
          descripcion_detallada:      datos.descripcion_detallada       || null,
          subarea_responsable:        datos.subarea_responsable         || null,
          procesos_relacionados:      datos.procesos_relacionados       || null,
          finalidades_secundarias:    datos.finalidades_secundarias     || null,
          informa_titulares:          (datos.informa_titulares || []).join(",") || null,
          documento_respaldo_permiso: datos.documento_respaldo_tiene === true
            ? (datos.documento_respaldo_descripcion || "Sí")
            : null,
          incluye_nna:                        datos.incluye_nna ? true : null,
          nna_detalle:                        datos.nna_detalle || null,
          datos_navegacion:                   datos.datos_navegacion ? true : null,
          datos_navegacion_detalle:           datos.datos_navegacion_detalle || null,
          destinatarios_internos:             datos.destinatarios_internos || null,
          destinatarios_nacionales:           datos.destinatarios_nacionales || null,
          destinatarios_internacionales:      datos.destinatarios_internacionales || null,
          terceros_son_encargados:            datos.terceros_son_encargados ? true : null,
          contratos_proteccion_datos:         datos.contratos_proteccion_datos ? true : null,
          contratos_proteccion_datos_detalle: datos.contratos_proteccion_datos_detalle || null,
          datos_transferidos_detalle:         datos.datos_transferidos_detalle || null,
          metodo_transferencia:               (datos.metodo_transferencia || []).join(",") || null,
          sistemas_origen:                    datos.sistemas_origen || null,
          sistemas_destino:                   datos.sistemas_destino || null,
          sistemas_tratamiento:               datos.sistemas_tratamiento || null,
          tipos_tratamiento_sistema:          (datos.tipos_tratamiento_sistema || []).join(",") || null,
          base_datos_nombre:                  datos.base_datos_nombre || null,
          proveedor_tecnologico:              datos.proveedor_tecnologico || null,
        },
      };

      let currentTratId = tratId;
      if (tratId) {
        await fetch(`${API}/tratamientos/${tratId}`, {
          method: "PUT", headers, body: JSON.stringify(payload3),
        });
      } else {
        const res = await fetch(`${API}/tratamientos`, {
          method: "POST", headers,
          body: JSON.stringify({ ...payload3, estado: "BORRADOR", sesion_id: sesionId }),
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

  function handleAnterior() {
    actualizarForm(local);
    navigate("/nuevo-tratamiento/paso2");
  }

  return (
    <div className="p3-layout">
      <BarraLateral />

      <main className="p3-main">
        <div className="p3-header">
          <h1 className="p3-titulo">Nuevo tratamiento</h1>
          <p className="p3-subtitulo">Completa la información para registrar este tratamiento en el RAT</p>
        </div>

        <div className="p3-card">
          <BarraProgreso pasoActual={3} />

          {/* ── Grid 3 secciones ─────────────────────────────── */}
          <div className="p3-grid">

            {/* ── Sección 1: Plazo de conservación ─────────── */}
            <div className="p3-seccion">
              <h3 className="p3-seccion-titulo">Plazo de conservación</h3>

              {/* Select estilizado como el de Paso1 */}
              <div className="p3-select-wrap">
                <select
                  className="p3-select"
                  value={local.plazo_conservacion}
                  onChange={(e) => setLocal((prev) => ({
                    ...prev,
                    plazo_conservacion: e.target.value,
                    plazo_otro: e.target.value !== "otro" ? "" : prev.plazo_otro,
                  }))}
                >
                  <option value="">Plazo de conservación ▾</option>
                  {PLAZOS.map((p) => (
                    <option key={p.valor} value={p.valor}>{p.etiqueta}</option>
                  ))}
                </select>
              </div>

              {/* Lista visible de opciones (igual al mockup) */}
              <div className="p3-plazos-lista">
                {PLAZOS.filter((p) => p.valor !== "otro").map((p) => (
                  <div key={p.valor}
                    className={`p3-plazo-opcion ${local.plazo_conservacion === p.valor ? "p3-plazo-opcion--activo" : ""}`}
                    onClick={() => setLocal((prev) => ({ ...prev, plazo_conservacion: p.valor, plazo_otro: "" }))}
                  >
                    {p.etiqueta}
                  </div>
                ))}
                {/* Opción "Otro" con campo libre */}
                <div
                  className={`p3-plazo-opcion ${local.plazo_conservacion === "otro" ? "p3-plazo-opcion--activo" : ""}`}
                  onClick={() => setLocal((prev) => ({ ...prev, plazo_conservacion: "otro" }))}
                >
                  Otro
                </div>
                {local.plazo_conservacion === "otro" && (
                  <input
                    type="text"
                    className="p3-input-otro"
                    placeholder="Especifica el plazo..."
                    value={local.plazo_otro}
                    onChange={(e) => setLocal((prev) => ({ ...prev, plazo_otro: e.target.value }))}
                    maxLength={100}
                    autoFocus
                  />
                )}
              </div>
            </div>

            {/* ── Sección 2: Medidas de seguridad ──────────── */}
            <div className="p3-seccion">
              <h3 className="p3-seccion-titulo">Medidas de seguridad</h3>
              <div className="p3-checkboxes">
                {MEDIDAS.map((m) => {
                  const marcado = local.medidas_seguridad.includes(m.id);
                  return (
                    <label key={m.id} className={`p3-check-item ${marcado ? "p3-check-item--marcado" : ""}`}>
                      <input
                        type="checkbox"
                        className="p3-check-input"
                        checked={marcado}
                        onChange={() => toggleMedida(m.id)}
                      />
                      <span className="p3-check-texto">{m.etiqueta}</span>
                    </label>
                  );
                })}
                {/* Campo libre para "Otras" */}
                {local.medidas_seguridad.includes("otras") && (
                  <>
                    <textarea
                      className="p3-textarea-otro"
                      placeholder="Describe otras medidas..."
                      value={local.otras_medidas}
                      onChange={(e) => setLocal((prev) => ({ ...prev, otras_medidas: e.target.value }))}
                      rows={3}
                      maxLength={500}
                    />
                    <p className="p3-campo-ayuda">Si son varias medidas, sepáralas por comas o en líneas distintas.</p>
                    <span className="p3-campo-contador">{local.otras_medidas.length}/500</span>
                  </>
                )}
              </div>
            </div>

            {/* ── Sección 3: Decisiones automatizadas ──────── */}
            <div className="p3-seccion">
              <h3 className="p3-seccion-titulo">¿Hay decisiones automatizadas sobre las personas con estos datos?</h3>
              <p className="p3-seccion-desc">
                Algoritmos o IA que toman decisiones sobre personas sin intervención humana
                (ej: aprobación de crédito, scoring).
              </p>

              {/* Switch igual al de Paso2 */}
              <div className="p3-switch-wrap">
                <button
                  type="button"
                  role="switch"
                  aria-checked={local.decisiones_automatizadas}
                  className={`p3-switch ${local.decisiones_automatizadas ? "p3-switch--on" : ""}`}
                  onClick={() => setLocal((prev) => ({ ...prev, decisiones_automatizadas: !prev.decisiones_automatizadas }))}
                >
                  <span className="p3-switch-thumb" />
                </button>
                <span className="p3-switch-label">
                  {local.decisiones_automatizadas ? "Sí" : "No"}
                </span>
              </div>
            </div>

          </div>{/* fin grid */}

          {/* ── Acordeón de revisión ─────────────────────────── */}
          <div className={`p3-acordeon ${acordeonAbierto ? "p3-acordeon--abierto" : ""}`}>
            <button
              type="button"
              className="p3-acordeon-header"
              onClick={() => setAcordeonAbierto((v) => !v)}
            >
              <span className="p3-acordeon-icono">▼</span>
              <span className="p3-acordeon-titulo">Revisar todo antes de guardar</span>
            </button>

            {acordeonAbierto && (
              <div className="p3-acordeon-body">

                <div className="p3-revision-seccion">
                  <h4 className="p3-revision-titulo">Paso 1 — Identificación</h4>
                  <FilaRevision label="Nombre" valor={form.nombre} />
                  <FilaRevision label="Responsable" valor={form.responsable} />
                  <FilaRevision label="Departamento" valor={form.departamento} />
                  <FilaRevision label="Finalidad" valor={form.finalidad} />
                  <FilaRevision label="Base legal" valor={(form.base_legal || "").split(",").filter(Boolean).map((v) => ETIQ_BASE_LEGAL[v] || v).join(", ")} />
                </div>

                <div className="p3-revision-seccion">
                  <h4 className="p3-revision-titulo">Paso 2 — Datos y titulares</h4>
                  <FilaRevision
                    label="Categorías de titulares"
                    valor={(form.categorias_titulares || []).map((id) => ETIQ_TITULARES[id] || id).join(", ")}
                  />
                  <FilaRevision label="Universo de titulares" valor={form.universo_titulares} />
                  <FilaRevision label="Origen de los datos" valor={(form.origen_datos || "").split(",").filter(Boolean).map((v) => ETIQ_ORIGEN[v] || v).join(", ")} />
                  <FilaRevision
                    label="Categorías de datos"
                    valor={categoriasDatos.map((id) => ETIQ_CATEGORIAS[id] || id).join(", ")}
                  />
                  <FilaRevision
                    label="¿Datos sensibles?"
                    valor={form.datos_sensibles ? "Sí" : "No"}
                  />
                  {form.datos_sensibles && categoriasSensibles.length > 0 && (
                    <FilaRevision
                      label="Tipos sensibles"
                      valor={categoriasSensibles.map((id) => ETIQ_SENSIBLES[id] || id).join(", ")}
                    />
                  )}
                  <FilaRevision label="Destinatarios" valor={form.destinatarios} />
                  <FilaRevision label="Sale al extranjero" valor={form.sale_extranjero ? `Sí — ${form.pais_destino || "país no especificado"}` : "No"} />
                </div>

                <div className="p3-revision-seccion">
                  <h4 className="p3-revision-titulo">Paso 3 — Seguridad y conservación</h4>
                  <FilaRevision
                    label="Plazo"
                    valor={local.plazo_conservacion === "otro"
                      ? `Otro: ${local.plazo_otro}`
                      : ETIQ_PLAZO[local.plazo_conservacion]}
                  />
                  <FilaRevision
                    label="Medidas de seguridad"
                    valor={local.medidas_seguridad.map((id) => ETIQ_MEDIDAS[id] || id).join(", ")}
                  />
                  {local.medidas_seguridad.includes("otras") && local.otras_medidas && (
                    <FilaRevision label="Otras medidas" valor={local.otras_medidas} />
                  )}
                  <FilaRevision label="Decisiones automatizadas" valor={local.decisiones_automatizadas ? "Sí" : "No"} />
                </div>

                {camposDetectados.length > 0 && (
                  <div className="p3-revision-seccion">
                    <h4 className="p3-revision-titulo">Campos detectados ({camposDetectados.length})</h4>
                    <div className="p3-campos-tabla">
                      {camposDetectados.map((c, i) => (
                        <div key={i} className="p3-campos-fila">
                          <span className="p3-campo-nombre">{c.nombre_columna}</span>
                          <span className="p3-campo-tipo">{c.tipo || "—"}</span>
                          <span className={`p3-campo-badge ${c.es_sensible ? "p3-campo-badge--sensible" : ""}`}>
                            {c.es_sensible ? "Sensible" : "Personal"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>

          {error && <p className="p3-error">{error}</p>}

          {/* ── Toast borrador guardado ── */}
          {borradorOk && (
            <div className="p3-toast-borrador">
              <span className="p3-toast-texto">✓ Borrador guardado correctamente.</span>
              <div className="p3-toast-acciones">
                <button className="p3-toast-btn p3-toast-btn--dashboard" onClick={() => navigate("/dashboard")}>
                  Ir al dashboard
                </button>
                <button className="p3-toast-btn p3-toast-btn--continuar" onClick={() => setBorradorOk(false)}>
                  Continuar aquí
                </button>
              </div>
            </div>
          )}

          {/* ── Navegación ───────────────────────────────────── */}
          <div className="p3-navegacion">
            <div className="p3-nav-izquierda">
              <button
                className="p3-btn p3-btn--borrador"
                onClick={handleGuardarBorrador}
                disabled={guardandoBorrador || guardando}
              >
                {guardandoBorrador ? "Guardando..." : "Guardar borrador"}
              </button>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button className="p3-btn p3-btn--anterior" onClick={handleAnterior} disabled={guardando || guardandoBorrador}>
                ← Atrás
              </button>
              <button
                className={`p3-btn p3-btn--guardar ${guardando ? "p3-btn--cargando" : ""}`}
                onClick={handleGuardar}
                disabled={guardando || guardandoBorrador}
              >
                {guardando
                  ? "Guardando..."
                  : form.actividadesPendientes.length > 0 &&
                    form.actividadActual + 1 < form.actividadesPendientes.length
                  ? "Guardar y continuar →"
                  : "Guardar"}
              </button>
            </div>
          </div>

        </div>{/* fin card */}
      </main>
    </div>
  );
}

/* ─── Fila del acordeón ──────────────────────────────────────── */
function FilaRevision({ label, valor }) {
  return (
    <div className="p3-fila-revision">
      <span className="p3-fila-label">{label}</span>
      <span className={`p3-fila-valor ${!valor ? "p3-fila-valor--vacio" : ""}`}>
        {valor || "No especificado"}
      </span>
    </div>
  );
}
