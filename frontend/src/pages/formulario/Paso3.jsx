import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFormulario } from "../../context/FormularioContext";
import BarraLateral from "../../components/BarraLateral";
import BarraProgreso from "../../components/BarraProgreso";
import "../../styles/formularioCss/paso3.css";

const API = "/api";

/* ─── Componente principal ───────────────────────────────────────
 * Paso 3 — "Transferencias y sistemas" (R9.0).
 * Esqueleto vacío a propósito: el contenido real (secciones "Terceros y
 * transferencias" y "Sistemas y tecnología", movidas desde Paso2) llega
 * en R9.4. Por ahora solo deja la navegación 1→2→3→4 funcionando y
 * permite guardar borrador sin perder lo ya cargado en los pasos previos.
 */
export default function Paso3() {
  const navigate = useNavigate();
  const { form, actualizarForm } = useFormulario();
  const esEdicion = form.modoEdicion;

  const [guardandoBorrador, setGuardandoBorrador] = useState(false);
  const [borradorOk, setBorradorOk] = useState(false);

  function handleSiguiente() {
    navigate("/nuevo-tratamiento/paso4");
    window.scrollTo(0, 0);
  }

  function handleAnterior() {
    navigate("/nuevo-tratamiento/paso2");
    window.scrollTo(0, 0);
  }

  async function handleGuardarBorrador() {
    setGuardandoBorrador(true);
    try {
      const datos = { ...form };
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
          categoria_datos: datos.categoria_datos || null,
        },
        detalle_extendido: {
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
          pais_destino:                       datos.pais_destino || null,
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
    <div className="p3-layout">
      <BarraLateral />

      <main className="p3-main">
        <div className="p3-header">
          <h1 className="p3-titulo">{esEdicion ? "Editar tratamiento" : "Nuevo tratamiento"}</h1>
          <p className="p3-subtitulo">{esEdicion ? "Modifica la información del tratamiento" : "Completa la información para registrar este tratamiento en el RAT"}</p>
        </div>

        <div className="p3-card">
          <BarraProgreso pasoActual={3} prefix="p3" />

          <div className="p3-vacio">
            <p className="p3-vacio-texto">Contenido de "Transferencias y sistemas" — próximamente.</p>
            <p className="p3-vacio-subtexto">Mientras tanto puedes avanzar al paso siguiente o guardar el borrador con lo que llevas hasta ahora.</p>
          </div>

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
              {!esEdicion && (
                <button
                  className="p3-btn p3-btn--borrador"
                  onClick={handleGuardarBorrador}
                  disabled={guardandoBorrador}
                >
                  {guardandoBorrador ? "Guardando..." : "Guardar borrador"}
                </button>
              )}
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button className="p3-btn p3-btn--anterior" onClick={handleAnterior} disabled={guardandoBorrador}>
                ← Atrás
              </button>
              <button className="p3-btn p3-btn--siguiente" onClick={handleSiguiente} disabled={guardandoBorrador}>
                Siguiente paso →
              </button>
            </div>
          </div>

        </div>{/* fin card */}
      </main>
    </div>
  );
}
