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
    // ── Paso 1 ──────────────────────────────────────────────
    nombre: "",
    finalidad: "",
    base_legal: "",

    // Paso 2 — necesarios para los checkboxes y el campo de país

    categorias_datos: [],      // checkboxes de la columna izquierda
    datos_sensibles: false,
    categorias_sensibles: [],  // checkboxes que aparecen al activar "datos sensibles"
    destinatarios: "",
    sale_extranjero: false,
    pais_destino: "",          // campo que aparece cuando sale_extranjero = true
    otros_datos: "",

    // Paso 3 — necesarios para el plazo libre y las medidas otras

    plazo_conservacion: "",
    plazo_otro: "",            // campo libre cuando el usuario elige "Otro" en el plazo
    otras_medidas: "",         // campo libre cuando marca "Otras" en medidas de seguridad

    // Array de strings — IDs de medidas marcadas
    // Ej: ["cifrado", "acceso_por_rol", "backups"]
    // IMPORTANTE: en la versión anterior era un string,
    // ahora es array para coincidir con los checkboxes del mockup
    medidas_seguridad: [],
    decisiones_automatizadas: false,

    // ── Campos del análisis (vienen de ResultadosAnalisis) ──
    campos_detectados: [],   // [{ nombre_columna, tipo, es_sensible }]
    campos_pendientes: [],   // [{ nombre_columna }]
  });

  // Actualiza solo los campos que se pasan — el resto no se toca
  function actualizarForm(campos) {
    setForm((prev) => ({ ...prev, ...campos }));
  }

  // Reinicia el formulario completo al cancelar o terminar
  function resetForm() {
    setForm({
      nombre: "", finalidad: "", base_legal: "",
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
