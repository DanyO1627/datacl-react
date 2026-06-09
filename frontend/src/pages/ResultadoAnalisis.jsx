import { useState, useMemo } from "react";
import { useLocation, useNavigate, Navigate } from "react-router-dom";
import BarraLateral from "../components/BarraLateral";
import { useFormulario } from "../context/FormularioContext";
import "../styles/asignacionCampos.css";

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

  /* ── Derivados ─────────────────────────────────────────────── */
  const asignadas = useMemo(
    () => new Set(actividades.flatMap((a) => a.campos.map((c) => c.nombre_columna))),
    [actividades],
  );
  const sinAsignar  = detectados.filter((c) => !asignadas.has(c.nombre_columna)).length;
  const puedeAvanzar = sinAsignar === 0 && actividades.length > 0;

  if (!state) return <Navigate to="/subir-archivo" replace />;

  /* ── Acciones sobre actividades ────────────────────────────── */
  function nuevaActividad() {
    const id  = `act_${Date.now()}`;
    const num = actividades.length + 1;
    setActividades((prev) => [...prev, { id, nombre: `Actividad ${num}`, campos: [], nombreEditado: false }]);
    setActividadActiva(id);
  }

  function renombrar(id, nombre) {
    setActividades((prev) => prev.map((a) => (a.id === id ? { ...a, nombre, nombreEditado: true } : a)));
  }

  function eliminarActividad(id) {
    setActividades((prev) => prev.filter((a) => a.id !== id));
    if (actividadActiva === id) setActividadActiva(null);
  }

  /* ── Asignación de campos ──────────────────────────────────── */
  function clickCampo(campo) {
    if (!actividadActiva) return;
    const activa = actividades.find((a) => a.id === actividadActiva);
    if (!activa) return;

    const esMio = activa.campos.some((c) => c.nombre_columna === campo.nombre_columna);
    if (esMio) {
      // Desasignar del activa
      desasignar(actividadActiva, campo.nombre_columna);
      return;
    }
    if (asignadas.has(campo.nombre_columna)) return; // ya está en otra

    // Asignar
    setActividades((prev) =>
      prev.map((a) =>
        a.id === actividadActiva ? { ...a, campos: [...a.campos, campo] } : a,
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
    if (asignadas.has(nombreColumna)) return "asignado-otro";
    if (!actividadActiva) return "sin-actividad";
    return "libre";
  }

  function nombreActividadDeCampo(nombreColumna) {
    return actividades.find((a) => a.campos.some((c) => c.nombre_columna === nombreColumna))?.nombre ?? "";
  }

  /* ── Render ────────────────────────────────────────────────── */
  return (
    <div className="ac-layout">
      <BarraLateral />

      <main className="ac-main">

        {/* ── Header ── */}
        <div className="ac-header">
          <div className="ac-header-izq">
            <h1>Asignación de campos a actividades</h1>
            <p>Crea actividades y asigna cada campo detectado a la que corresponda</p>
          </div>
          <span className={`ac-badge-contador ${sinAsignar === 0 && detectados.length > 0 ? "ac-badge-contador--ok" : ""}`}>
            {sinAsignar === 0 && detectados.length > 0
              ? "✓ Todos asignados"
              : `${sinAsignar} campo${sinAsignar !== 1 ? "s" : ""} sin asignar`}
          </span>
        </div>

        {/* ── Instrucción ── */}
        <div className="ac-instruccion">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          Selecciona una actividad a la derecha y haz clic en los campos libres para asignarlos.
          Haz clic en un chip <strong>×</strong> para desasignarlo.
        </div>

        {/* ── Grid dos columnas ── */}
        <div className="ac-grid">

          {/* ── Columna izquierda: campos detectados ── */}
          <div className="ac-panel">
            <div className="ac-panel-header">
              <span className="ac-panel-titulo">Campos detectados ({detectados.length})</span>
            </div>
            <div className="ac-panel-cuerpo">
              {detectados.length === 0 && pendientes.length === 0 ? (
                <p className="ac-vacio">No se detectaron campos en el archivo.</p>
              ) : (
                detectados.map((campo) => {
                  const estado      = estadoCampo(campo.nombre_columna);
                  const esSensible  = campo.tipo === "SENSIBLE";
                  const activNombre = estado === "asignado-otro" ? nombreActividadDeCampo(campo.nombre_columna) : "";
                  return (
                    <div
                      key={campo.nombre_columna}
                      className={`ac-campo ac-campo--${estado}`}
                      onClick={() => clickCampo(campo)}
                      title={
                        estado === "asignado-otro"   ? `Asignado a "${activNombre}"` :
                        estado === "sin-actividad"   ? "Selecciona una actividad primero" :
                        estado === "en-activa"        ? "Clic para desasignar" :
                        "Clic para asignar a la actividad seleccionada"
                      }
                    >
                      <span className="ac-campo-nombre">{campo.nombre_columna}</span>
                      <span className={`ac-campo-badge ${esSensible ? "ac-campo-badge--sensible" : "ac-campo-badge--personal"}`}>
                        {esSensible ? "SENSIBLE" : "PERSONAL"}
                      </span>
                      {estado === "asignado-otro" && (
                        <span className="ac-campo-actividad" title={activNombre}>→ {activNombre}</span>
                      )}
                      {estado === "en-activa" && (
                        <span style={{ fontSize: 11, color: "#1d4ed8", fontWeight: 700 }}>✓</span>
                      )}
                    </div>
                  );
                })
              )}

              {/* ── Campos sin clasificar (pendientes) ── */}
              {pendientes.length > 0 && (
                <>
                  <div className="ac-sep-pendientes">
                    Sin clasificar ({pendientes.length}) — inclúyelos si contienen datos personales
                  </div>
                  {pendientes.map((campo) => {
                    const estado      = estadoCampo(campo.nombre_columna);
                    const activNombre = estado === "asignado-otro" ? nombreActividadDeCampo(campo.nombre_columna) : "";
                    return (
                      <div
                        key={campo.nombre_columna}
                        className={`ac-campo ac-campo--pendiente ac-campo--${estado}`}
                        onClick={() => clickCampo(campo)}
                        title={
                          estado === "asignado-otro"  ? `Asignado a "${activNombre}"` :
                          estado === "sin-actividad"  ? "Selecciona una actividad primero" :
                          estado === "en-activa"       ? "Clic para desasignar" :
                          "Clic para asignar a la actividad seleccionada"
                        }
                      >
                        <span className="ac-campo-nombre">{campo.nombre_columna}</span>
                        <span className="ac-campo-badge ac-campo-badge--pendiente">?</span>
                        {estado === "asignado-otro" && (
                          <span className="ac-campo-actividad" title={activNombre}>→ {activNombre}</span>
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
              <span className="ac-panel-titulo">Actividades ({actividades.length})</span>
            </div>
            <div className="ac-panel-cuerpo">

              {actividades.length === 0 && (
                <p className="ac-vacio">Crea una actividad para empezar a asignar campos.</p>
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
                      placeholder="Nombre de la actividad"
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
                Nueva actividad
              </button>
            </div>
          </div>
        </div>

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
            title={!puedeAvanzar ? "Asigna todos los campos antes de continuar" : ""}
          >
            Continuar →
          </button>
        </div>

      </main>
    </div>
  );
}
