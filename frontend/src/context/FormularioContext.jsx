import { createContext, useContext, useState } from "react";

/**
 * FormularioContext — comparte el estado del formulario RAT entre los 3 pasos.
 *
 * Uso:
 *   const { form, setForm, camposDetectados, camposPendientes } = useFormulario();
 *
 * Se inicializa desde ResultadosAnalisis vía navigate("/nuevo-tratamiento", { state: {...} })
 * y Paso1 lo lee con useLocation() para pre-cargar los campos detectados.
 */

const FormularioContext = createContext(null);

export function FormularioProvider({ children }) {
  const [form, setForm] = useState({
    // ── Paso 1 ──────────────────────────────────
    nombre: "",
    finalidad: "",
    base_legal: "",

    // ── Paso 2 ──────────────────────────────────
    datos_sensibles: false,
    destinatarios: "",
    plazo_conservacion: "",
    medidas_seguridad: "",
    sale_extranjero: false,
    decisiones_automatizadas: false,

    // ── Campos del análisis ──────────────────────
    // Se reciben desde ResultadosAnalisis y se guardan acá
    campos_detectados: [],   // [{ nombre_columna, tipo, origen? }]
    campos_pendientes: [],   // [{ nombre_columna }]
  });

  // Actualiza solo los campos que se pasan — el resto no se toca
  function actualizarForm(campos) {
    setForm((prev) => ({ ...prev, ...campos }));
  }

  // Reinicia el formulario completo (cuando el usuario cancela o termina)
  function resetForm() {
    setForm({
      nombre: "", finalidad: "", base_legal: "",
      datos_sensibles: false, destinatarios: "",
      plazo_conservacion: "", medidas_seguridad: "",
      sale_extranjero: false, decisiones_automatizadas: false,
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