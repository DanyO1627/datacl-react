import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useFormulario } from "../../context/FormularioContext";
import BarraLateral from "../../components/BarraLateral";
import BarraProgreso from "../../components/BarraProgreso";
import BloqueDatoTratado from "../../components/BloqueDatoTratado";
import { subirImagenProceso, eliminarImagenProceso, obtenerImagenProcesoBlob } from "../../services/tratamientosService";
import "../../styles/formularioCss/paso1.css";

const API = "/api";

// descarta bloques que quedaron completamente vacíos (se agregó el bloque
// pero no se llenó ningún campo) antes de mandarlos al backend
function limpiarBloquesDatos(bloques) {
  return (bloques || [])
    .filter((b) => (b.categoria_dato || b.se_tratan || b.para_que || b.como || "").trim())
    .map((b) => ({
      categoria_dato: b.categoria_dato || null,
      se_tratan:      b.se_tratan      || null,
      para_que:       b.para_que       || null,
      como:           b.como           || null,
    }));
}

/* ─── Componente principal ───────────────────────────────────── */
export default function Paso1() {
  const navigate = useNavigate();
  const { state: datosAnalisis } = useLocation();
  const { form, actualizarForm, resetForm } = useFormulario();
  const esEdicion = form.modoEdicion;

  // Limpiar estado residual solo si hay actividades pendientes de una sesión anterior
  // pero NO se está en modo edición (edición llega sin datosAnalisis intencionalmente).
  useEffect(() => {
    if (!datosAnalisis && !form.modoEdicion && !form.sesionActual && form.actividadesPendientes?.length > 0) {
      resetForm();
    }
  }, []);

  // Pre-cargar campos detectados desde el análisis si el formulario viene vacío.
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
    // Campos extendidos B2-03
    subarea_responsable:         form.subarea_responsable         || "",
    procesos_relacionados:       form.procesos_relacionados       || "",
    // finalidades_secundarias se edita en Paso4 ahora (R9.5b, hallazgo #7 —
    // el modelo la pide junto a "Finalidad", no en Identificación).
    // R8.3 — orden CEDCA
    proceso_asociado:            form.proceso_asociado            || "",
    // R8.4 — bloques repetibles que reemplazan descripcion_detallada
    datos_tratados:              form.datos_tratados               || [],
  });

  const [guardandoBorrador, setGuardandoBorrador] = useState(false);
  const [borradorOk, setBorradorOk] = useState(false);

  // ── Imagen del proceso asociado (R8.2/R8.3) ──────────────────
  // Solo se puede subir/ver una vez que el tratamiento tiene id: en edición
  // ya existe (tratamientoEditId); en creación, recién después de guardar
  // un borrador (tratamientosGuardados[actividadActual]).
  const idxActividad = form.actividadActual ?? 0;
  const tratId = esEdicion ? form.tratamientoEditId : form.tratamientosGuardados?.[idxActividad];

  const [imagenPreview, setImagenPreview] = useState(null);
  const [subiendoImagen, setSubiendoImagen] = useState(false);
  const [errorImagen, setErrorImagen] = useState("");

  useEffect(() => {
    let urlCreada = null;
    async function cargarImagen() {
      if (!tratId) { setImagenPreview(null); return; }
      const blob = await obtenerImagenProcesoBlob(tratId).catch(() => null);
      if (blob) {
        urlCreada = URL.createObjectURL(blob);
        setImagenPreview(urlCreada);
      } else {
        setImagenPreview(null);
      }
    }
    cargarImagen();
    return () => { if (urlCreada) URL.revokeObjectURL(urlCreada); };
  }, [tratId]);

  async function handleSubirImagenProceso(e) {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo || !tratId) return;

    const ext = archivo.name.split(".").pop().toLowerCase();
    if (!["png", "jpg", "jpeg"].includes(ext)) {
      setErrorImagen("Formato no válido. Usa PNG o JPG.");
      return;
    }
    if (archivo.size > 2 * 1024 * 1024) {
      setErrorImagen("El archivo excede 2 MB.");
      return;
    }

    setSubiendoImagen(true);
    setErrorImagen("");
    try {
      await subirImagenProceso(tratId, archivo);
      setImagenPreview(URL.createObjectURL(archivo));
    } catch (err) {
      setErrorImagen(err.message || "Error al subir la imagen.");
    } finally {
      setSubiendoImagen(false);
    }
  }

  async function handleEliminarImagenProceso() {
    if (!tratId) return;
    try {
      await eliminarImagenProceso(tratId);
      setImagenPreview(null);
    } catch {
      setErrorImagen("Error al eliminar la imagen.");
    }
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setLocal((prev) => ({ ...prev, [name]: value }));
  }

  // ── Bloques dinámicos "descripción detallada" (R8.4) ──────────
  function agregarBloqueDato() {
    setLocal((prev) => ({
      ...prev,
      datos_tratados: [...prev.datos_tratados, { categoria_dato: "", se_tratan: "", para_que: "", como: "" }],
    }));
  }

  function actualizarBloqueDato(index, campo, valor) {
    setLocal((prev) => {
      const lista = [...prev.datos_tratados];
      lista[index] = { ...lista[index], [campo]: valor };
      return { ...prev, datos_tratados: lista };
    });
  }

  function eliminarBloqueDato(index) {
    setLocal((prev) => ({
      ...prev,
      datos_tratados: prev.datos_tratados.filter((_, i) => i !== index),
    }));
  }

  async function handleGuardarBorrador() {
    setGuardandoBorrador(true);
    try {
      actualizarForm({ ...local });
      const datos = { ...form, ...local };
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
      // En modo edición, el tratamiento a actualizar es siempre el que se está
      // editando — tratamientosGuardados nunca se llena al entrar por "Editar".
      const tratId = datos.modoEdicion ? datos.tratamientoEditId : datos.tratamientosGuardados?.[idx];
      const payload = {
        nombre: datos.nombre.trim() || "Sin nombre",
        finalidad: datos.finalidad || null,
        base_legal: datos.base_legal || null,
        campos_detectados: datos.campos_detectados || [],
        campos_usados: datos.campos_detectados || [],
        datos_tratados: limpiarBloquesDatos(datos.datos_tratados),
        detalle: {
          responsable_tratamiento: datos.responsable || null,
          es_responsable: datos.es_responsable ?? true,
        },
        detalle_extendido: {
          subarea_responsable: datos.subarea_responsable || null,
          procesos_relacionados: datos.procesos_relacionados || null,
          finalidades_secundarias: datos.finalidades_secundarias || null,
          proceso_asociado: datos.proceso_asociado || null,
        },
      };

      let currentTratId = tratId;
      if (tratId) {
        await fetch(`${API}/tratamientos/${tratId}`, {
          method: "PUT", headers, body: JSON.stringify({ ...payload, estado: "BORRADOR" }),
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
    local.proceso_asociado.trim().length > 0;

  function handleSiguiente() {
    if (!puedeAvanzar) return;
    actualizarForm({ ...local });
    navigate("/nuevo-tratamiento/paso2");
    window.scrollTo(0, 0);
  }

  function handleCancelar() {
    if (esEdicion) {
      const editId = form.tratamientoEditId;
      resetForm();
      navigate(`/tratamientos/${editId}`);
    } else {
      navigate("/dashboard");
    }
  }

  // Badge resumen de lo que detectó el análisis
  const detectados = datosAnalisis?.campos_detectados ?? form.campos_detectados ?? [];
  const pendientes = datosAnalisis?.campos_pendientes ?? form.campos_pendientes  ?? [];

  return (
    <div className="p1-layout">
      <BarraLateral />

      <main className="p1-main">
        <div className="p1-header">
          <h1 className="p1-titulo">{esEdicion ? "Editar tratamiento" : (local.nombre.trim() || "Nuevo tratamiento")}</h1>
          <p className="p1-subtitulo">{esEdicion ? "Modifica la información del tratamiento" : "Completa la información para registrar este tratamiento en el RAT"}</p>
        </div>

        <div className="p1-card">

          {/* ── Banner progreso multi-actividad ── */}
          {!esEdicion && form.actividadesPendientes?.length > 0 && (() => {
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
                    {act.campos.map((c, i) => (
                      <span
                        key={`${c.nombre_columna}_${i}`}
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
          <BarraProgreso pasoActual={1} prefix="p1" />

          {/* ── Resumen del análisis (si viene de pantalla 8) ── */}
          {!esEdicion && detectados.length > 0 && (
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

            {/* Responsable / Líder del proceso + imagen opcional — fila de dos columnas */}
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
                  autoFocus
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
                <label className="p1-label">Imagen del proceso (opcional)</label>
                <span className="p1-campo-hint p1-campo-hint--info">PNG o JPG · Máx. 2 MB</span>

                {imagenPreview && (
                  <img src={imagenPreview} alt="Imagen del proceso" className="p1-imagen-preview" />
                )}

                <div className="p1-imagen-acciones">
                  <label
                    className="p1-btn p1-btn--borrador p1-btn--sm"
                    style={!tratId || subiendoImagen ? { opacity: 0.5, cursor: "not-allowed" } : { cursor: "pointer" }}
                  >
                    {subiendoImagen ? "Subiendo..." : imagenPreview ? "Reemplazar" : "Subir imagen"}
                    <input
                      type="file"
                      accept=".png,.jpg,.jpeg"
                      onChange={handleSubirImagenProceso}
                      disabled={!tratId || subiendoImagen}
                      style={{ display: "none" }}
                    />
                  </label>
                  {imagenPreview && (
                    <button type="button" className="p1-btn p1-btn--cancelar p1-btn--sm" onClick={handleEliminarImagenProceso}>
                      Quitar
                    </button>
                  )}
                </div>

                {!tratId && (
                  <span className="p1-campo-hint p1-campo-hint--info">Guarda un borrador primero para poder subir una imagen.</span>
                )}
                {errorImagen && <span className="p1-campo-hint">{errorImagen}</span>}
              </div>
            </div>

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
              />
              {!local.nombre.trim() && (
                <span className="p1-campo-hint">Este campo es obligatorio para continuar.</span>
              )}
            </div>

            {/* Proceso asociado */}
            <div className="p1-campo">
              <label className="p1-label" htmlFor="proceso_asociado">
                Proceso asociado <span className="p1-requerido">*</span>
              </label>
              <textarea
                id="proceso_asociado"
                name="proceso_asociado"
                className={`p1-textarea ${!local.proceso_asociado.trim() ? "p1-input--vacio" : ""}`}
                placeholder="Denominación clara y entendible del proceso al que pertenece este tratamiento — ¿en qué consiste la organización/programa/servicio?"
                value={local.proceso_asociado}
                onChange={handleChange}
                rows={3}
              />
              {!local.proceso_asociado.trim() && (
                <span className="p1-campo-hint">Este campo es obligatorio para continuar.</span>
              )}
            </div>

            {/* Descripción detallada — bloques dinámicos por categoría de dato (R8.4) */}
            <div className="p1-campo">
              <label className="p1-label">Descripción detallada del tratamiento</label>
              <p className="p1-campo-hint p1-campo-hint--info" style={{ marginBottom: 8 }}>
                Agrega un bloque por cada categoría de dato que trata este proceso.
              </p>

              {local.datos_tratados.map((bloque, index) => (
                <BloqueDatoTratado
                  key={index}
                  bloque={bloque}
                  index={index}
                  onChange={actualizarBloqueDato}
                  onEliminar={eliminarBloqueDato}
                />
              ))}

              <button type="button" className="p1-bloque-dato-agregar" onClick={agregarBloqueDato}>
                + Agregar otra categoría de dato
              </button>
            </div>

            {/* Área responsable */}
            <div className="p1-campo">
              <label className="p1-label" htmlFor="subarea_responsable">
                Área responsable
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

            {/* Relación del proceso con otros procesos internos — siempre visible */}
            <div className="p1-campo">
              <label className="p1-label" htmlFor="procesos_relacionados">
                Relación con otros procesos internos
              </label>
              <textarea
                id="procesos_relacionados"
                name="procesos_relacionados"
                className="p1-textarea"
                placeholder="¿Se relaciona con otros procesos internos? Ej: BackOffice, Contabilidad, TI"
                value={local.procesos_relacionados}
                onChange={handleChange}
                rows={3}
                maxLength={2000}
              />
              <span className="p1-campo-contador">{local.procesos_relacionados.length}/2000</span>
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
              {!esEdicion && (
                <button
                  className="p1-btn p1-btn--borrador"
                  onClick={handleGuardarBorrador}
                  disabled={guardandoBorrador || !local.nombre.trim()}
                >
                  {guardandoBorrador ? "Guardando..." : "Guardar borrador"}
                </button>
              )}
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
