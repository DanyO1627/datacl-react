import { createContext, useContext, useState, useEffect } from "react";

const FormularioContext = createContext(null);

// Solo se persiste el "puntero" al borrador en curso (qué tratamiento ya
// quedó guardado en la BD), no el formulario completo — evita serializar
// los Set() de ingresoManual y evita re-hidratar texto a medio escribir.
const STORAGE_KEY = "datacl_borrador_activo";

function leerBorradorPersistido() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function crearFormVacio() { return {
  // ── Paso 1 ───────────────────────────────────────────────
  nombre: "", responsable: "", es_responsable: true,
  finalidad: "", base_legal: "",
  // Campos extendidos Paso 1 (B2-03)
  descripcion_detallada: "", subarea_responsable: "",
  procesos_relacionados: "", finalidades_secundarias: "",
  informa_titulares: [], documento_respaldo_tiene: null,
  documento_respaldo_descripcion: "",
  // Paso 1 — R8.3 (orden CEDCA)
  proceso_asociado: "",
  // Paso 1 — R8.4: bloques repetibles que reemplazan descripcion_detallada
  datos_tratados: [],
  // ── Paso 2 ───────────────────────────────────────────────
  categorias_titulares: [], universo_titulares: "", origen_datos: "",
  categorias_datos: [], datos_sensibles: false, categorias_sensibles: [],
  destinatarios: "", otros_datos: "",
  // R9.3: descripción de datos sensibles + 3 secciones nuevas de Paso 2
  datos_sensibles_descripcion: "",
  datos_academicos_laborales: "", datos_financieros_patrimoniales: "", origen_sistemico_datos: "",
  // B2-05: campos extendidos Paso 2
  incluye_nna: false, nna_detalle: "",
  datos_navegacion: false, datos_navegacion_detalle: "",
  // ── Paso 3 ───────────────────────────────────────────────
  // (R9.4: movidos desde Paso2 — "Terceros y transferencias" + "Sistemas y tecnología")
  destinatarios_internos: "", destinatarios_nacionales: "", destinatarios_internacionales: "",
  sale_extranjero: false, pais_destino: "",
  base_legal_transferencia_internacional: "",
  terceros_son_encargados: false,
  contratos_proteccion_datos: false, contratos_proteccion_datos_detalle: "",
  datos_transferidos_detalle: "", metodo_transferencia: [], metodo_transferencia_detalle: "",
  sistemas_origen: "", sistemas_destino: "", sistemas_tratamiento: "",
  tipos_tratamiento_sistema: [], base_datos_nombre: "", proveedor_tecnologico: "",
  // ── Paso 4 ───────────────────────────────────────────────
  // (etiquetado como "Paso 3" hasta R9.0 — el rename de 3 a 4 pasos movió
  // estos campos a Paso4.jsx, el comentario quedó desactualizado hasta ahora)
  plazo_conservacion: "", plazo_otro: "", otras_medidas: "",
  medidas_seguridad: [], decisiones_automatizadas: false,
  // ── Paso 4 — Principios Ley 21.719 ───────────────────────
  criterio_plazo: "", metodo_eliminacion: "", documenta_destruccion: false,
  excepciones_plazo: "", minimizacion_justificacion: "", mecanismos_exactitud: "",
  evaluacion_periodica: "", cumplimiento_demostrable: "",
  incidentes_historicos: "", cambios_futuros: "",
  // ── Paso 4 — DPIA ────────────────────────────────────────
  requiere_dpia: false, dpia_realizada: null, dpia_detalle: "",
  // ── Modo edición ──────────────────────────────────────────
  modoEdicion: false, tratamientoEditId: null,
  // ── Análisis ─────────────────────────────────────────────
  campos_detectados: [], campos_pendientes: [],
  // ── Sesión / actividades ─────────────────────────────────
  sesionActual: null,          // id de la sesión guardada como borrador
  actividadesPendientes: [],   // [{ id, nombre, campos[] }] creadas en AsignacionCampos
  actividadActual: 0,          // índice de la actividad que está completando el formulario
  tratamientosGuardados: {},   // { [actividadActual]: tratamientoId } — borradores en BD
  campos_sesion: [],           // todos los campos originales del archivo (detectados + pendientes)
  // ── Nueva sesión: conexión a BD ───────────────────────────
  conexionBD: {
    paso: 1,            // 1 = instrucciones, 2 = formulario
    motor: "mysql", host: "", puerto: 3306, base_datos: "", usuario: "", password: "",
    estado: "idle",     // idle | ok | error
    errorMsg: "",
    tablas: [], tablasSelec: [],
    columnasTablas: [],       // [{nombre, tabla_origen}] — columnas de las tablas seleccionadas
    diccionarioColumnas: {},  // {nombre_columna: descripcion}
  },
  // ── Nueva sesión: ingreso manual ──────────────────────────
  ingresoManual: {
    seleccionados: new Set(),
    abiertos: new Set(["identificatorios"]),
    personalizados: {},
    inputCustom: {},
  },
}; }

export function FormularioProvider({ children }) {
  const [form, setForm] = useState(() => {
    const persistido = leerBorradorPersistido();
    return persistido ? { ...crearFormVacio(), ...persistido } : crearFormVacio();
  });

  // Guarda solo el puntero al borrador (tratamientosGuardados/sesionActual/
  // actividadActual) para que un crash o un reload accidental durante el
  // guardado no pierda la referencia al tratamiento ya creado en la BD y
  // termine generando un duplicado.
  useEffect(() => {
    const { tratamientosGuardados, sesionActual, actividadActual } = form;
    const hayBorrador = sesionActual || Object.keys(tratamientosGuardados || {}).length > 0;
    if (hayBorrador) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ tratamientosGuardados, sesionActual, actividadActual }));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [form.tratamientosGuardados, form.sesionActual, form.actividadActual]);

  function actualizarForm(campos) {
    setForm((prev) => ({ ...prev, ...campos }));
  }

  function actualizarActividades(actividades) {
    setForm((prev) => ({ ...prev, actividadesPendientes: actividades, actividadActual: 0 }));
  }

  // Avanza a la siguiente actividad: resetea los campos del formulario pero
  // mantiene la lista de actividades e incrementa actividadActual.
  function avanzarActividad() {
    setForm((prev) => {
      const siguiente = prev.actividadActual + 1;
      const sigActividad = prev.actividadesPendientes[siguiente];
      return {
        ...crearFormVacio(),
        sesionActual:          prev.sesionActual,
        actividadesPendientes: prev.actividadesPendientes,
        actividadActual:       siguiente,
        tratamientosGuardados: prev.tratamientosGuardados,
        campos_sesion:         prev.campos_sesion,
        nombre:                sigActividad?.nombre || "",
        campos_detectados:     sigActividad?.campos || [],
        campos_pendientes:     [],
      };
    });
  }

  function resetForm() {
    setForm(crearFormVacio());
  }

  function cargarFormCompleto(campos) {
    setForm({ ...crearFormVacio(), ...campos });
  }

  return (
    <FormularioContext.Provider value={{ form, actualizarForm, actualizarActividades, avanzarActividad, resetForm, cargarFormCompleto }}>
      {children}
    </FormularioContext.Provider>
  );
}

export function useFormulario() {
  const ctx = useContext(FormularioContext);
  if (!ctx) throw new Error("useFormulario debe usarse dentro de <FormularioProvider>");
  return ctx;
}
