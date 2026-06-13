import { createContext, useContext, useState } from "react";

const FormularioContext = createContext(null);

const FORM_VACIO = {
  // ── Paso 1 ───────────────────────────────────────────────
  nombre: "", responsable: "", es_responsable: true,
  departamento: "", finalidad: "", base_legal: "",
  // ── Paso 2 ───────────────────────────────────────────────
  categorias_titulares: [], universo_titulares: "", origen_datos: "",
  categorias_datos: [], datos_sensibles: false, categorias_sensibles: [],
  categoria_datos: "",
  destinatarios: "", sale_extranjero: false, pais_destino: "", otros_datos: "",
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
