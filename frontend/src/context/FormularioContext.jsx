import { createContext, useContext, useState } from "react";

/**
 * FormularioContext — comparte el estado del formulario RAT entre los 3 pasos.
 *
 * Uso:
 *   const { form, actualizarForm, resetForm } = useFormulario();
 *
 * Se inicializa desde ResultadosAnalisis vía navigate("/nuevo-tratamiento", { state: {...} })
 * y Paso1 lo lee con useLocation() para pre-cargar los campos detectados.
 */

const FormularioContext = createContext(null);

export function FormularioProvider({ children }) {
  const [form, setForm] = useState({
    // ── Paso 1: Identificación ───────────────────────────────
    nombre: "",
    responsable: "",
    es_responsable: true,
    departamento: "",
    finalidad: "",
    base_legal: "",

    // ── Paso 2: Datos y titulares ────────────────────────────
    categorias_titulares: [],  // tipos de personas cuyos datos se tratan
    volumen: "",               // rango de titulares afectados
    origen_datos: "",          // de dónde provienen los datos

    categorias_datos: [],
    datos_sensibles: false,
    categorias_sensibles: [],
    destinatarios: "",
    sale_extranjero: false,
    pais_destino: "",
    otros_datos: "",

    // ── Paso 3: Seguridad y conservación ────────────────────
    plazo_conservacion: "",
    plazo_otro: "",
    otras_medidas: "",
    medidas_seguridad: [],
    decisiones_automatizadas: false,

    // ── Campos del análisis (vienen de ResultadosAnalisis) ──
    campos_detectados: [],
    campos_pendientes: [],
  });

  // Actualiza solo los campos que se pasan — el resto no se toca
  function actualizarForm(campos) {
    setForm((prev) => ({ ...prev, ...campos }));
  }

  // Reinicia el formulario completo al cancelar o terminar
  function resetForm() {
    setForm({
      nombre: "", responsable: "", es_responsable: true, departamento: "",
      finalidad: "", base_legal: "",
      categorias_titulares: [], volumen: "", origen_datos: "",
      categorias_datos: [], datos_sensibles: false,
      categorias_sensibles: [], destinatarios: "",
      sale_extranjero: false, pais_destino: "",
      otros_datos: "",
      plazo_conservacion: "", plazo_otro: "",
      medidas_seguridad: [], otras_medidas: "",
      decisiones_automatizadas: false,
      campos_detectados: [], campos_pendientes: [],
    });
  }

  return (
    <FormularioContext.Provider value={{ form, actualizarForm, resetForm }}>
      {children}
    </FormularioContext.Provider>
  );
}

export function useFormulario() {
  const ctx = useContext(FormularioContext);
  if (!ctx) throw new Error("useFormulario debe usarse dentro de <FormularioProvider>");
  return ctx;
}
