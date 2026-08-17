import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFormulario } from "../../context/FormularioContext";
import BarraLateral from "../../components/BarraLateral";
import BarraProgreso from "../../components/BarraProgreso";
import "../../styles/formularioCss/paso3.css";

const API = "/api";

// R9.4: movidos desde Paso2.jsx tal cual estaban, más "evaluacion_clasificacion"
// y "cruce_datos" nuevos.
const TIPOS_TRATAMIENTO_SISTEMA = [
  { id: "captura",                  etiqueta: "Captura" },
  { id: "consulta",                 etiqueta: "Consulta / visualización" },
  { id: "modificacion",             etiqueta: "Modificación" },
  { id: "perfilamiento",            etiqueta: "Perfilamiento" },
  { id: "reportes",                 etiqueta: "Generación de reportes" },
  { id: "decisiones_automatizadas", etiqueta: "Decisiones automatizadas" },
  { id: "comunicacion_terceros",    etiqueta: "Comunicación a terceros" },
  { id: "evaluacion_clasificacion", etiqueta: "Evaluación/clasificación" },
  { id: "cruce_datos",              etiqueta: "Cruce de datos" },
];

const METODOS_TRANSFERENCIA = [
  { id: "digital", etiqueta: "Digital" },
  { id: "verbal",  etiqueta: "Verbal" },
  { id: "fisico",  etiqueta: "Físico" },
];

/* ─── Componente principal ───────────────────────────────────────
 * Paso 3 — "Transferencias y sistemas" (R9.0 esqueleto, R9.4 contenido).
 * 2 secciones, calcadas del agrupamiento del modelo RAT_CEDCA original
 * ("Transferencias y comunicaciones a terceros" / "Sistemas o Aplicaciones,
 * Soportes y Ubicación") — "Destinatarios" no es una sección aparte ahí,
 * es parte del mismo bloque que "Terceros y transferencias".
 */
export default function Paso3() {
  const navigate = useNavigate();
  const { form, actualizarForm } = useFormulario();
  const esEdicion = form.modoEdicion;

  const [local, setLocal] = useState({
    destinatarios_internos:             form.destinatarios_internos             || "",
    destinatarios_nacionales:           form.destinatarios_nacionales           || "",
    destinatarios_internacionales:      form.destinatarios_internacionales      || "",
    base_legal_transferencia_internacional: form.base_legal_transferencia_internacional || "",
    sale_extranjero:                    form.sale_extranjero                    ?? false,
    pais_destino:                       form.pais_destino                       || "",
    terceros_son_encargados:            form.terceros_son_encargados            ?? false,
    contratos_proteccion_datos:         form.contratos_proteccion_datos         ?? false,
    contratos_proteccion_datos_detalle: form.contratos_proteccion_datos_detalle || "",
    datos_transferidos_detalle:         form.datos_transferidos_detalle         || "",
    metodo_transferencia:               form.metodo_transferencia               || [],
    metodo_transferencia_detalle:       form.metodo_transferencia_detalle       || "",
    sistemas_origen:                    form.sistemas_origen                    || "",
    sistemas_destino:                   form.sistemas_destino                   || "",
    sistemas_tratamiento:               form.sistemas_tratamiento               || "",
    tipos_tratamiento_sistema:          form.tipos_tratamiento_sistema          || [],
    base_datos_nombre:                  form.base_datos_nombre                  || "",
    proveedor_tecnologico:              form.proveedor_tecnologico              || "",
  });

  const [guardandoBorrador, setGuardandoBorrador] = useState(false);
  const [borradorOk, setBorradorOk] = useState(false);

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

  function handleSiguiente() {
    actualizarForm(local);
    navigate("/nuevo-tratamiento/paso4");
    window.scrollTo(0, 0);
  }

  function handleAnterior() {
    actualizarForm(local);
    navigate("/nuevo-tratamiento/paso2");
    window.scrollTo(0, 0);
  }

  async function handleGuardarBorrador() {
    setGuardandoBorrador(true);
    try {
      const datos = { ...form, ...local };
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
          destinatarios_internos:             datos.destinatarios_internos || null,
          destinatarios_nacionales:           datos.destinatarios_nacionales || null,
          destinatarios_internacionales:      datos.destinatarios_internacionales || null,
          base_legal_transferencia_internacional: datos.base_legal_transferencia_internacional || null,
          terceros_son_encargados:            datos.terceros_son_encargados ? true : null,
          contratos_proteccion_datos:         datos.contratos_proteccion_datos ? true : null,
          contratos_proteccion_datos_detalle: datos.contratos_proteccion_datos_detalle || null,
          datos_transferidos_detalle:         datos.datos_transferidos_detalle || null,
          metodo_transferencia:               (datos.metodo_transferencia || []).join(",") || null,
          metodo_transferencia_detalle:       datos.metodo_transferencia_detalle || null,
          sistemas_origen:                    datos.sistemas_origen || null,
          sistemas_destino:                   datos.sistemas_destino || null,
          sistemas_tratamiento:               datos.sistemas_tratamiento || null,
          tipos_tratamiento_sistema:          (datos.tipos_tratamiento_sistema || []).join(",") || null,
          base_datos_nombre:                  datos.base_datos_nombre || null,
          proveedor_tecnologico:              datos.proveedor_tecnologico || null,
          pais_destino:                       datos.pais_destino || null,
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

          {/* ── Secciones ──────────────────────────────────────── */}
          <div className="p3-secciones-extra">

            {/* Terceros y transferencias (incluye destinatarios — mismo bloque que en el modelo RAT_CEDCA) */}
            <div className="p3-seccion-extra">
              <h3 className="p3-seccion-extra-titulo">Terceros y transferencias</h3>

              <div className="p3-campo-grupo">
                <label className="p3-campo-label">Internos</label>
                <p className="p3-campo-ayuda">Áreas o unidades internas que acceden a los datos</p>
                <textarea className="p3-textarea"
                  placeholder="Ej: RRHH, Contabilidad, TI..."
                  value={local.destinatarios_internos}
                  onChange={(e) => setLocal((p) => ({ ...p, destinatarios_internos: e.target.value }))}
                  rows={2} maxLength={3000}
                />
              </div>

              <div className="p3-campo-grupo">
                <label className="p3-campo-label">Nacionales</label>
                <p className="p3-campo-ayuda">Empresas o entidades externas en Chile</p>
                <textarea className="p3-textarea"
                  placeholder="Ej: AFP Provida, SII, proveedor de nómina..."
                  value={local.destinatarios_nacionales}
                  onChange={(e) => setLocal((p) => ({ ...p, destinatarios_nacionales: e.target.value }))}
                  rows={2} maxLength={3000}
                />
              </div>

              <div className="p3-campo-grupo">
                <label className="p3-campo-label">Internacionales</label>
                <p className="p3-campo-ayuda">Terceros fuera de Chile — activa «sale al extranjero» automáticamente</p>
                <textarea className="p3-textarea"
                  placeholder="Ej: Salesforce EE.UU., Google Ireland..."
                  value={local.destinatarios_internacionales}
                  onChange={(e) => handleInternacionales(e.target.value)}
                  rows={2} maxLength={3000}
                />
              </div>

              <div className="p3-campo-grupo">
                <label className="p3-campo-label">Base legal de la transferencia internacional</label>
                <textarea className="p3-textarea" rows={2} maxLength={1500}
                  placeholder="Ej: Cláusulas contractuales tipo, decisión de adecuación..."
                  value={local.base_legal_transferencia_internacional}
                  onChange={(e) => setLocal((p) => ({ ...p, base_legal_transferencia_internacional: e.target.value }))}
                />
              </div>

              <div className="p3-extranjero">
                <div className="p3-extranjero-row">
                  <span className="p3-extranjero-label">¿Los datos salen al extranjero?</span>
                  <button type="button" role="switch" aria-checked={local.sale_extranjero}
                    className={`p3-switch ${local.sale_extranjero ? "p3-switch--on" : ""}`}
                    onClick={() => toggleExtranjero(!local.sale_extranjero)}
                  >
                    <span className="p3-switch-thumb" />
                  </button>
                </div>
                {local.sale_extranjero && (
                  <input type="text" className="p3-input-pais"
                    placeholder="¿A qué país o región?"
                    value={local.pais_destino}
                    onChange={(e) => setLocal((prev) => ({ ...prev, pais_destino: e.target.value }))}
                    maxLength={100}
                  />
                )}
              </div>

              <div className="p3-separador" />

              <div className="p3-extra-grid">
                <div className="p3-extra-checks">
                  <label className="p3-check-item">
                    <input type="checkbox" className="p3-check-input"
                      checked={local.terceros_son_encargados}
                      onChange={(e) => setLocal((p) => ({ ...p, terceros_son_encargados: e.target.checked }))}
                    />
                    <span className="p3-check-texto">¿Los terceros actúan como encargados del tratamiento?</span>
                  </label>

                  <div>
                    <label className="p3-check-item">
                      <input type="checkbox" className="p3-check-input"
                        checked={local.contratos_proteccion_datos}
                        onChange={(e) => setLocal((p) => ({
                          ...p,
                          contratos_proteccion_datos: e.target.checked,
                          contratos_proteccion_datos_detalle: e.target.checked ? p.contratos_proteccion_datos_detalle : "",
                        }))}
                      />
                      <span className="p3-check-texto">¿Existen contratos de protección de datos firmados con terceros?</span>
                    </label>
                    {local.contratos_proteccion_datos && (
                      <textarea className="p3-textarea" rows={2} maxLength={1500}
                        placeholder="Describe los contratos existentes..."
                        value={local.contratos_proteccion_datos_detalle}
                        onChange={(e) => setLocal((p) => ({ ...p, contratos_proteccion_datos_detalle: e.target.value }))}
                        style={{ marginTop: 6 }}
                      />
                    )}
                  </div>
                </div>

                <div>
                  <div className="p3-campo-grupo">
                    <label className="p3-campo-label">¿Qué datos se transfieren a terceros?</label>
                    <textarea className="p3-textarea" rows={3} maxLength={3000}
                      placeholder="Ej: Nombre, RUT, correo y sueldo base..."
                      value={local.datos_transferidos_detalle}
                      onChange={(e) => setLocal((p) => ({ ...p, datos_transferidos_detalle: e.target.value }))}
                    />
                  </div>
                  <div className="p3-campo-grupo">
                    <label className="p3-campo-label">¿Cómo se transfieren?</label>
                    <div className="p3-checkboxes">
                      {METODOS_TRANSFERENCIA.map((m) => (
                        <label key={m.id} className={`p3-check-item ${local.metodo_transferencia.includes(m.id) ? "p3-check-item--marcado" : ""}`}>
                          <input type="checkbox" className="p3-check-input"
                            checked={local.metodo_transferencia.includes(m.id)}
                            onChange={() => toggleMetodoTransferencia(m.id)}
                          />
                          <span className="p3-check-texto">{m.etiqueta}</span>
                        </label>
                      ))}
                    </div>
                    <textarea className="p3-textarea" rows={2} maxLength={1500}
                      placeholder="Detalle del método de transferencia..."
                      value={local.metodo_transferencia_detalle}
                      onChange={(e) => setLocal((p) => ({ ...p, metodo_transferencia_detalle: e.target.value }))}
                      style={{ marginTop: 6 }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Sistemas y tecnología */}
            <div className="p3-seccion-extra">
              <h3 className="p3-seccion-extra-titulo">Sistemas y tecnología</h3>
              <div className="p3-extra-grid">

                <div className="p3-campo-grupo">
                  <label className="p3-campo-label">Sistemas origen</label>
                  <p className="p3-campo-ayuda">Sistemas donde se originan o capturan los datos</p>
                  <textarea className="p3-textarea" rows={2} maxLength={1500}
                    placeholder="Ej: CRM Salesforce, formulario web..."
                    value={local.sistemas_origen}
                    onChange={(e) => setLocal((p) => ({ ...p, sistemas_origen: e.target.value }))}
                  />
                </div>

                <div className="p3-campo-grupo">
                  <label className="p3-campo-label">Sistemas destino</label>
                  <p className="p3-campo-ayuda">Sistemas donde se almacenan o envían los datos</p>
                  <textarea className="p3-textarea" rows={2} maxLength={1500}
                    placeholder="Ej: ERP SAP, servidor propio, nube AWS..."
                    value={local.sistemas_destino}
                    onChange={(e) => setLocal((p) => ({ ...p, sistemas_destino: e.target.value }))}
                  />
                </div>

                <div className="p3-campo-grupo">
                  <label className="p3-campo-label">Sistemas de tratamiento</label>
                  <p className="p3-campo-ayuda">Sistemas que procesan activamente los datos</p>
                  <textarea className="p3-textarea" rows={2} maxLength={1500}
                    placeholder="Ej: Software de RRHH, plataforma e-commerce..."
                    value={local.sistemas_tratamiento}
                    onChange={(e) => setLocal((p) => ({ ...p, sistemas_tratamiento: e.target.value }))}
                  />
                </div>

                <div className="p3-campo-grupo">
                  <label className="p3-campo-label">Tipos de tratamiento en los sistemas</label>
                  <div className="p3-checkboxes p3-checkboxes--horizontal">
                    {TIPOS_TRATAMIENTO_SISTEMA.map((t) => (
                      <label key={t.id} className={`p3-check-item ${local.tipos_tratamiento_sistema.includes(t.id) ? "p3-check-item--marcado" : ""}`}>
                        <input type="checkbox" className="p3-check-input"
                          checked={local.tipos_tratamiento_sistema.includes(t.id)}
                          onChange={() => toggleTiposTratamiento(t.id)}
                        />
                        <span className="p3-check-texto">{t.etiqueta}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="p3-fila-dos-items">
                  <div className="p3-campo-grupo">
                    <label className="p3-campo-label">Nombre de la base de datos</label>
                    <input type="text" className="p3-input-bd"
                      placeholder="Ej: BD_CLIENTES_PRODUCCION"
                      value={local.base_datos_nombre}
                      onChange={(e) => setLocal((p) => ({ ...p, base_datos_nombre: e.target.value }))}
                      maxLength={200}
                    />
                  </div>
                  <div className="p3-campo-grupo">
                    <label className="p3-campo-label">Proveedor tecnológico</label>
                    <input type="text" className="p3-input-bd"
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
