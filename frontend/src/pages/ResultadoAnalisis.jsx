import { useState, useMemo } from "react";
import { useLocation, useNavigate, Navigate } from "react-router-dom";
import BarraLateral from "../components/BarraLateral";
import { useFormulario } from "../context/FormularioContext";
import "../styles/asignacionCampos.css";

/* ─── Tooltip de información ──────────────────────────────────── */
function Tooltip({ texto }) {
  const [visible, setVisible] = useState(false);
  return (
    <span className="ac-tooltip-wrap"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      <span className="ac-tooltip-trigger">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </span>
      {visible && <div className="ac-tooltip-burbuja">{texto}</div>}
    </span>
  );
}

/* ─── Componente principal: AsignacionCampos ─────────────────── */
export default function AsignacionCampos() {
  const { state } = useLocation();
  const navigate  = useNavigate();
  const { actualizarForm, actualizarActividades, form } = useFormulario();

  // Todos los hooks antes de cualquier early return (Rules of Hooks)
  const detectados = state?.detectados ?? [];
  const pendientes = state?.pendientes ?? [];

  /* ── Estado local ──────────────────────────────────────────── */
  const [actividades,     setActividades]    = useState([]);
  const [actividadActiva, setActividadActiva] = useState(null);
  const [guardando,       setGuardando]      = useState(false);
  const [msgGuardado,     setMsgGuardado]    = useState("");
  const [borradorOk,      setBorradorOk]     = useState(false);
  const [tablaFiltro,     setTablaFiltro]    = useState("todos");
  const [toastFiltro,     setToastFiltro]    = useState(false);

  /* ── Derivados ─────────────────────────────────────────────── */
  const asignadas = useMemo(
    () => new Set(actividades.flatMap((a) => a.campos.map((c) => c.nombre_columna))),
    [actividades],
  );
  const sinAsignar  = detectados.filter((c) => !asignadas.has(c.nombre_columna)).length;
  const puedeAvanzar = actividades.length > 0 && actividades.some((a) => a.campos.length > 0);

  const tieneMultiTabla = useMemo(
    () => [...detectados, ...pendientes].some((c) => c.tabla_origen),
    [detectados, pendientes],
  );

  const tablasUnicas = useMemo(() => {
    if (!tieneMultiTabla) return [];
    const set = new Set([...detectados, ...pendientes].map((c) => c.tabla_origen).filter(Boolean));
    return [...set].sort();
  }, [tieneMultiTabla, detectados, pendientes]);

  const detectadosFiltrados = useMemo(() => {
    if (!tieneMultiTabla || tablaFiltro === "todos") return detectados;
    return detectados.filter((c) => c.tabla_origen === tablaFiltro);
  }, [detectados, tieneMultiTabla, tablaFiltro]);

  const pendientesFiltrados = useMemo(() => {
    if (!tieneMultiTabla || tablaFiltro === "todos") return pendientes;
    return pendientes.filter((c) => c.tabla_origen === tablaFiltro);
  }, [pendientes, tieneMultiTabla, tablaFiltro]);

  if (!state) return <Navigate to="/subir-archivo" replace />;

  /* ── Acciones sobre actividades ────────────────────────────── */
  function nuevaActividad() {
    const id  = `act_${Date.now()}`;
    const num = actividades.length + 1;
    setActividades((prev) => [...prev, { id, nombre: `RAT ${num}`, campos: [], nombreEditado: false }]);
    setActividadActiva(id);
  }

  function renombrar(id, nombre) {
    setActividades((prev) => prev.map((a) => (a.id === id ? { ...a, nombre, nombreEditado: true } : a)));
  }

  function eliminarActividad(id) {
    setActividades((prev) => prev.filter((a) => a.id !== id));
    if (actividadActiva === id) setActividadActiva(null);
  }

  /* ── Cambiar filtro por tabla ──────────────────────────────── */
  function cambiarFiltro(tabla) {
    if (tabla === tablaFiltro) return;
    if (tabla !== "todos") {
      const camposAsignados = actividades.flatMap((a) => a.campos);
      const hayOtraTabla = camposAsignados.some(
        (c) => c.tabla_origen && c.tabla_origen !== tabla,
      );
      if (hayOtraTabla) setToastFiltro(true);
    }
    setTablaFiltro(tabla);
  }

  /* ── Asignación de campos ──────────────────────────────────── */
  function clickCampo(campo) {
    if (!actividadActiva) return;
    const activa = actividades.find((a) => a.id === actividadActiva);
    if (!activa) return;

    const esMio = activa.campos.some((c) => c.nombre_columna === campo.nombre_columna);
    if (esMio) {
      desasignar(actividadActiva, campo.nombre_columna);
      return;
    }

    // Un mismo campo puede pertenecer a múltiples actividades (ej: RUT en Ventas y en Clínica)
    setActividades((prev) =>
      prev.map((a) =>
        a.id === actividadActiva ? { ...a, campos: [...a.campos, campo] } : a,
      ),
    );
  }

  function asignarTodos() {
    if (!actividadActiva) return;
    const libres = detectados.filter((c) => !asignadas.has(c.nombre_columna));
    if (libres.length === 0) return;
    setActividades((prev) =>
      prev.map((a) =>
        a.id === actividadActiva ? { ...a, campos: [...a.campos, ...libres] } : a,
      ),
    );
  }

  function desasignar(actividadId, nombreColumna) {
    setActividades((prev) =>
      prev.map((a) =>
        a.id === actividadId
          ? { ...a, campos: a.campos.filter((c) => c.nombre_columna !== nombreColumna) }
          : a,
      ),
    );
  }

  /* ── Guardar borrador ──────────────────────────────────────── */
  async function handleGuardarBorrador() {
    setGuardando(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
      let sesionId = form.sesionActual;

      if (sesionId) {
        const res = await fetch(`http://localhost:8000/sesiones/${sesionId}/estado`, {
          method: "PATCH", headers,
          body: JSON.stringify({ estado: "borrador" }),
        });
        if (!res.ok) throw new Error("sesion");
      } else {
        const res = await fetch("http://localhost:8000/sesiones", {
          method: "POST", headers,
          body: JSON.stringify({ fuente: "archivo", estado: "borrador", columnas_json: detectados }),
        });
        if (!res.ok) throw new Error("sesion");
        const data = await res.json();
        sesionId = data.id;
        actualizarForm({ sesionActual: sesionId });
      }

      // Guardar borrador mínimo para cada actividad (preserva nombre y campos asignados)
      if (actividades.length > 0) {
        const existentes = { ...(form.tratamientosGuardados || {}) };
        const nuevosGuardados = { ...existentes };
        for (let i = 0; i < actividades.length; i++) {
          if (existentes[i]) continue;
          const act = actividades[i];
          try {
            const res = await fetch("http://localhost:8000/tratamientos", {
              method: "POST", headers,
              body: JSON.stringify({
                nombre: act.nombre,
                estado: "BORRADOR",
                sesion_id: sesionId,
                campos_detectados: act.campos,
                campos_usados: act.campos,
              }),
            });
            if (res.ok) {
              const trat = await res.json();
              nuevosGuardados[i] = trat.id;
            }
          } catch { /* continuar con siguiente actividad */ }
        }
        actualizarForm({ tratamientosGuardados: nuevosGuardados });
      }

      setBorradorOk(true);
    } catch {
      setMsgGuardado("Error de conexión");
      setTimeout(() => setMsgGuardado(""), 3000);
    } finally {
      setGuardando(false);
    }
  }

  /* ── Continuar → primer formulario ────────────────────────── */
  function handleContinuar() {
    if (!puedeAvanzar) return;
    actualizarActividades(actividades);
    actualizarForm({
      nombre:            actividades[0].nombre,
      campos_detectados: actividades[0].campos,
      campos_pendientes: [],
      campos_sesion:     [...detectados, ...pendientes],
    });
    navigate("/nuevo-tratamiento");
  }

  /* ── Helper: estado visual de un campo ────────────────────── */
  function estadoCampo(nombreColumna) {
    const activa = actividades.find((a) => a.id === actividadActiva);
    if (activa?.campos.some((c) => c.nombre_columna === nombreColumna)) return "en-activa";
    if (asignadas.has(nombreColumna)) return "compartible";
    if (!actividadActiva) return "sin-actividad";
    return "libre";
  }

  function actividadesDeCampo(nombreColumna) {
    return actividades
      .filter((a) => a.campos.some((c) => c.nombre_columna === nombreColumna))
      .map((a) => a.nombre);
  }

  /* ── Render ────────────────────────────────────────────────── */
  return (
    <div className="ac-layout">
      <BarraLateral />

      <main className="ac-main">

        {/* ── Header ── */}
        <div className="ac-header">
          <div className="ac-header-izq">
            <h1>Asignación de campos a RATs</h1>
            <p>Crea RATs y asigna cada campo detectado al que corresponda</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {sinAsignar > 0 && actividadActiva && (
              <button className="ac-btn-marcar-todos" onClick={asignarTodos}>
                Marcar todos
              </button>
            )}
            <span className={`ac-badge-contador ${sinAsignar === 0 && detectados.length > 0 ? "ac-badge-contador--ok" : ""}`}>
              {sinAsignar === 0 && detectados.length > 0
                ? "✓ Todos asignados"
                : `${sinAsignar} campo${sinAsignar !== 1 ? "s" : ""} sin asignar`}
            </span>
          </div>
        </div>

        {/* ── Instrucción ── */}
        <div className="ac-instruccion">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          Selecciona un RAT a la derecha y haz clic en los campos libres para asignarlos.
          Haz clic en un chip <strong>×</strong> para desasignarlo.
        </div>

        {/* ── Chips de filtro por tabla (solo BD multi-tabla) ── */}
        {tieneMultiTabla && (
          <div className="ac-filtro-tablas">
            <span className="ac-filtro-titulo">Tablas detectadas</span>
            <div className="ac-filtro-chips">
              {["todos", ...tablasUnicas].map((t) => (
                <button
                  key={t}
                  className={`ac-filtro-chip ${tablaFiltro === t ? "ac-filtro-chip--activo" : ""}`}
                  onClick={() => cambiarFiltro(t)}
                >
                  {t === "todos" ? "Todos" : t}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Grid dos columnas ── */}
        <div className="ac-grid">

          {/* ── Columna izquierda: campos detectados ── */}
          <div className="ac-panel">
            <div className="ac-panel-header">
              <span className="ac-panel-titulo">Campos detectados ({detectadosFiltrados.length}{tieneMultiTabla && tablaFiltro !== "todos" ? ` de ${detectados.length}` : ""})</span>
            </div>
            <div className="ac-panel-cuerpo">
              {detectados.length === 0 && pendientes.length === 0 ? (
                <p className="ac-vacio">No se detectaron campos en el archivo.</p>
              ) : (
                detectadosFiltrados.map((campo) => {
                  const estado      = estadoCampo(campo.nombre_columna);
                  const esSensible  = campo.tipo === "SENSIBLE";
                  const enOtras     = estado === "compartible" ? actividadesDeCampo(campo.nombre_columna) : [];
                  return (
                    <div
                      key={campo.nombre_columna}
                      className={`ac-campo ac-campo--${estado}`}
                      onClick={() => clickCampo(campo)}
                      title={
                        estado === "compartible"     ? `Ya en: ${enOtras.join(", ")} — clic para agregar también aquí` :
                        estado === "sin-actividad"   ? "Selecciona una actividad primero" :
                        estado === "en-activa"        ? "Clic para desasignar" :
                        "Clic para asignar a la actividad seleccionada"
                      }
                    >
                      <span className="ac-campo-nombre">{campo.nombre_columna}</span>
                      <span className={`ac-campo-badge ${esSensible ? "ac-campo-badge--sensible" : "ac-campo-badge--personal"}`}>
                        {esSensible ? "SENSIBLE" : "PERSONAL"}
                      </span>
                      {tieneMultiTabla && campo.tabla_origen && (
                        <span className="ac-campo-tabla">{campo.tabla_origen}</span>
                      )}
                      {estado === "compartible" && (
                        <span className="ac-campo-actividad" title={enOtras.join(", ")}>en {enOtras.length} act.</span>
                      )}
                      {estado === "en-activa" && (
                        <span style={{ fontSize: 11, color: "#1d4ed8", fontWeight: 700 }}>✓</span>
                      )}
                    </div>
                  );
                })
              )}

              {/* ── Campos sin clasificar (pendientes) ── */}
              {pendientesFiltrados.length > 0 && (
                <>
                  <div className="ac-sep-pendientes">
                    Sin clasificar ({pendientesFiltrados.length}) — inclúyelos si contienen datos personales
                  </div>
                  {pendientesFiltrados.map((campo) => {
                    const estado      = estadoCampo(campo.nombre_columna);
                    const enOtras     = estado === "compartible" ? actividadesDeCampo(campo.nombre_columna) : [];
                    return (
                      <div
                        key={campo.nombre_columna}
                        className={`ac-campo ac-campo--pendiente ac-campo--${estado}`}
                        onClick={() => clickCampo(campo)}
                        title={
                          estado === "compartible"    ? `Ya en: ${enOtras.join(", ")} — clic para agregar también aquí` :
                          estado === "sin-actividad"  ? "Selecciona una actividad primero" :
                          estado === "en-activa"       ? "Clic para desasignar" :
                          "Clic para asignar a la actividad seleccionada"
                        }
                      >
                        <span className="ac-campo-nombre">{campo.nombre_columna}</span>
                        <span className="ac-campo-badge ac-campo-badge--pendiente">?</span>
                        {tieneMultiTabla && campo.tabla_origen && (
                          <span className="ac-campo-tabla">{campo.tabla_origen}</span>
                        )}
                        {estado === "compartible" && (
                          <span className="ac-campo-actividad" title={enOtras.join(", ")}>en {enOtras.length} act.</span>
                        )}
                        {estado === "en-activa" && (
                          <span style={{ fontSize: 11, color: "#6b8099", fontWeight: 700 }}>✓</span>
                        )}
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>

          {/* ── Columna derecha: actividades ── */}
          <div className="ac-panel">
            <div className="ac-panel-header">
              <span className="ac-panel-titulo">
                Registro de actividades de tratamiento ({actividades.length})
                <Tooltip texto="Nombra el RAT según su propósito (ej: «Gestión de nómina», «Atención al cliente», «Reclutamiento de personal»), no según el sistema o departamento. Si los mismos datos se usan para dos fines distintos, créalos como RATs separados." />
              </span>
            </div>
            <div className="ac-panel-cuerpo">

              {actividades.length === 0 && (
                <p className="ac-vacio">Crea un RAT para empezar a asignar campos.</p>
              )}

              {actividades.map((act) => (
                <div
                  key={act.id}
                  className={`ac-actividad-card ${actividadActiva === act.id ? "ac-actividad-card--activa" : ""}`}
                  onClick={() => setActividadActiva(act.id)}
                >
                  <div className="ac-actividad-header">
                    <span className="ac-actividad-dot" />
                    <svg className={`ac-actividad-lapiz ${act.nombreEditado ? "ac-actividad-lapiz--editado" : ""}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" title="Editar nombre">
                      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
                    </svg>
                    <input
                      className={`ac-actividad-nombre ${act.nombreEditado ? "ac-actividad-nombre--editado" : ""}`}
                      value={act.nombre}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => renombrar(act.id, e.target.value)}
                      placeholder="Nombre del RAT"
                      maxLength={80}
                    />
                    <button
                      className="ac-actividad-eliminar"
                      onClick={(e) => { e.stopPropagation(); eliminarActividad(act.id); }}
                      title="Eliminar actividad"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>

                  <div className="ac-chips" onClick={(e) => e.stopPropagation()}>
                    {act.campos.length === 0 ? (
                      <span className="ac-chips-vacio">Sin campos asignados</span>
                    ) : (
                      act.campos.map((c) => (
                        <span
                          key={c.nombre_columna}
                          className={`ac-chip ${c.tipo === "SENSIBLE" ? "ac-chip--sensible" : ""}`}
                        >
                          {c.nombre_columna}
                          <button
                            className="ac-chip-quitar"
                            onClick={() => desasignar(act.id, c.nombre_columna)}
                            title="Desasignar campo"
                          >
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                </div>
              ))}

              <button className="ac-btn-nueva" onClick={nuevaActividad}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Nuevo RAT
              </button>
            </div>
          </div>
        </div>

        {/* ── Toast advertencia cambio de filtro ── */}
        {toastFiltro && (
          <div className="ac-toast-advertencia">
            <span className="ac-toast-texto">⚠ Hay campos asignados de otra tabla. Revisa la asignación antes de continuar.</span>
            <button className="ac-toast-btn ac-toast-btn--dashboard" onClick={() => setToastFiltro(false)}>
              Entendido
            </button>
          </div>
        )}

        {/* ── Toast borrador guardado ── */}
        {borradorOk && (
          <div className="ac-toast-borrador">
            <span className="ac-toast-texto">✓ Borrador guardado correctamente.</span>
            <div className="ac-toast-acciones">
              <button className="ac-toast-btn ac-toast-btn--dashboard" onClick={() => navigate("/dashboard")}>
                Ir al dashboard
              </button>
              <button className="ac-toast-btn ac-toast-btn--continuar" onClick={() => setBorradorOk(false)}>
                Continuar aquí
              </button>
            </div>
          </div>
        )}

        {/* ── Footer fijo ── */}
        <div className="ac-footer">
          <div className="ac-footer-izq">
            <button
              className="ac-btn-borrador"
              onClick={handleGuardarBorrador}
              disabled={guardando || detectados.length === 0}
            >
              {guardando ? "Guardando..." : "Guardar borrador"}
            </button>
            {msgGuardado && <span className="ac-msg-guardado">{msgGuardado}</span>}
          </div>

          <button
            className="ac-btn-continuar"
            onClick={handleContinuar}
            disabled={!puedeAvanzar}
            title={!puedeAvanzar ? "Crea al menos un RAT con campos asignados para continuar" : ""}
          >
            Continuar →
          </button>
        </div>

      </main>
    </div>
  );
}
