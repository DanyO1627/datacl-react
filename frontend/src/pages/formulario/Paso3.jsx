import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useFormulario } from "../../context/FormularioContext";
import { crearTratamiento } from "../../services/tratamientosService";
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
  consentimiento: "Consentimiento",
  contrato: "Contrato",
  obligacion_legal: "Obligación legal",
  interes_legitimo: "Interés legítimo",
};

const ETIQ_PLAZO = {
  "1_anio": "1 año",
  "2_anios": "2 años",
  "5_anios": "5 años",
  "10_anios": "10 años",
  indefinido: "Indefinido",
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
  const pasos = ["Información general", "Datos y seguridad", "Revisión"];
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
  const { form, actualizarForm, resetForm } = useFormulario();
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
      nombre: formularioCompleto.nombre,
      finalidad: formularioCompleto.finalidad || null,
      base_legal: formularioCompleto.base_legal || null,
      categorias_datos: formularioCompleto.categorias_datos || [],
      datos_sensibles: formularioCompleto.datos_sensibles ?? false,
      categorias_sensibles: formularioCompleto.categorias_sensibles || [],
      destinatarios: formularioCompleto.destinatarios || null,
      sale_extranjero: formularioCompleto.sale_extranjero ?? false,
      pais_destino: formularioCompleto.pais_destino || null,
      plazo_conservacion: formularioCompleto.plazo_conservacion || null,
      plazo_otro: formularioCompleto.plazo_otro || null,
      medidas_seguridad: serializarMedidasSeguridad(
        formularioCompleto.medidas_seguridad,
        formularioCompleto.otras_medidas
      ),
      otras_medidas: formularioCompleto.otras_medidas || null,
      decisiones_automatizadas: formularioCompleto.decisiones_automatizadas ?? false,
      campos_detectados: formularioCompleto.campos_detectados || [],
    };

    try {
      await crearTratamiento(payload);
      resetForm();
      navigate("/mis-tratamientos");
    } catch (e) {
      // Si es 401, redirigir al login
      if (e.codigo === 401) {
        navigate("/login");
        return;
      }
      setError(e.message);
    } finally {
      setGuardando(false);
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
                  <input
                    type="text"
                    className="p3-input-otro"
                    placeholder="Describe otras medidas..."
                    value={local.otras_medidas}
                    onChange={(e) => setLocal((prev) => ({ ...prev, otras_medidas: e.target.value }))}
                    maxLength={300}
                  />
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
                  <h4 className="p3-revision-titulo">Paso 1 — Información general</h4>
                  <FilaRevision label="Nombre" valor={form.nombre} />
                  <FilaRevision label="Finalidad" valor={form.finalidad} />
                  <FilaRevision label="Base legal" valor={ETIQ_BASE_LEGAL[form.base_legal] || form.base_legal} />
                </div>

                <div className="p3-revision-seccion">
                  <h4 className="p3-revision-titulo">Paso 2 — Datos y seguridad</h4>
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
                      valor={categoriasSensibles.join(", ")}
                    />
                  )}
                  <FilaRevision label="Destinatarios" valor={form.destinatarios} />
                  <FilaRevision label="Sale al extranjero" valor={form.sale_extranjero ? `Sí — ${form.pais_destino || "país no especificado"}` : "No"} />
                </div>

                <div className="p3-revision-seccion">
                  <h4 className="p3-revision-titulo">Paso 3 — Conservación y riesgo</h4>
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

          {/* ── Navegación ───────────────────────────────────── */}
          <div className="p3-navegacion">
            <button className="p3-btn p3-btn--anterior" onClick={handleAnterior} disabled={guardando}>
              ← Atrás
            </button>
            <button
              className={`p3-btn p3-btn--guardar ${guardando ? "p3-btn--cargando" : ""}`}
              onClick={handleGuardar}
              disabled={guardando}
            >
              {guardando ? "Guardando..." : "Guardar"}
            </button>
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
