import { createContext, useContext, useState } from "react";

const FormularioContext = createContext(null);

const FORM_VACIO = {
  // ── Paso 1 ───────────────────────────────────────────────
  nombre: "", responsable: "", es_responsable: true,
  departamento: "", finalidad: "", base_legal: "",
  // Campos extendidos Paso 1 (B2-03)
  descripcion_detallada: "", subarea_responsable: "",
  procesos_relacionados: "", finalidades_secundarias: "",
  informa_titulares: [], documento_respaldo_tiene: null,
  documento_respaldo_descripcion: "",
  // ── Paso 2 ───────────────────────────────────────────────
  categorias_titulares: [], universo_titulares: "", origen_datos: "",
  categorias_datos: [], datos_sensibles: false, categorias_sensibles: [],
  categoria_datos: "",
  destinatarios: "", sale_extranjero: false, pais_destino: "", otros_datos: "",
  // B2-05: campos extendidos Paso 2
  incluye_nna: false, nna_detalle: "",
  datos_navegacion: false, datos_navegacion_detalle: "",
  destinatarios_internos: "", destinatarios_nacionales: "", destinatarios_internacionales: "",
  terceros_son_encargados: false,
  contratos_proteccion_datos: false, contratos_proteccion_datos_detalle: "",
  datos_transferidos_detalle: "", metodo_transferencia: [],
  sistemas_origen: "", sistemas_destino: "", sistemas_tratamiento: "",
  tipos_tratamiento_sistema: [], base_datos_nombre: "", proveedor_tecnologico: "",
  // ── Paso 3 ───────────────────────────────────────────────
  plazo_conservacion: "", plazo_otro: "", otras_medidas: "",
  medidas_seguridad: [], decisiones_automatizadas: false,
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
  },
  // ── Nueva sesión: ingreso manual ──────────────────────────
  ingresoManual: {
    seleccionados: new Set(),
    abiertos: new Set(["identificatorios"]),
    personalizados: {},
    inputCustom: {},
  },
};

export function FormularioProvider({ children }) {
  const [form, setForm] = useState(FORM_VACIO);

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
        ...FORM_VACIO,
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
    setForm(FORM_VACIO);
  }

  return (
    <FormularioContext.Provider value={{ form, actualizarForm, actualizarActividades, avanzarActividad, resetForm }}>
      {children}
    </FormularioContext.Provider>
  );
}

export function useFormulario() {
  const ctx = useContext(FormularioContext);
  if (!ctx) throw new Error("useFormulario debe usarse dentro de <FormularioProvider>");
  return ctx;
}
