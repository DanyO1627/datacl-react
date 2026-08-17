import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useFormulario } from "../../context/FormularioContext";
import { crearTratamiento, actualizarTratamiento } from "../../services/tratamientosService";

import BarraLateral from "../../components/BarraLateral";
import BarraProgreso from "../../components/BarraProgreso";
import ListaDinamicaTexto from "../../components/ListaDinamicaTexto";
import "../../styles/formularioCss/paso1.css";
import "../../styles/formularioCss/paso4.css";

const API = "/api";

/* ─── Opciones base legal con artículos Ley 21.719 (R9.5: movido desde Paso1) ── */
const BASES_LEGALES = [
  {
    valor: "consentimiento",
    etiqueta: "Consentimiento",
    articulo: "Art. 12",
    descripcion: "El titular otorgó su consentimiento libre, informado, específico e inequívoco. Debe ser previo y manifestado de forma inequívoca. El responsable debe poder acreditarlo (Ley 21.719, Art. 12).",
  },
  {
    valor: "datos_economicos",
    etiqueta: "Obligaciones económicas o financieras",
    articulo: "Art. 13 letra a)",
    descripcion: "El tratamiento se refiere a datos relativos a obligaciones de carácter económico, financiero, bancario o comercial, de conformidad con el Título III de la Ley 21.719 (Art. 13 letra a).",
  },
  {
    valor: "obligacion_legal",
    etiqueta: "Obligación legal",
    articulo: "Art. 13 letra b)",
    descripcion: "El tratamiento es necesario para la ejecución o el cumplimiento de una obligación legal o lo dispone la ley. Ej: reportes al SII, registros laborales, AFP (Ley 21.719, Art. 13 letra b).",
  },
  {
    valor: "contrato",
    etiqueta: "Ejecución de contrato",
    articulo: "Art. 13 letra c)",
    descripcion: "El tratamiento es necesario para la celebración o ejecución de un contrato entre el titular y el responsable, o para la ejecución de medidas precontractuales adoptadas a solicitud del titular (Ley 21.719, Art. 13 letra c).",
  },
  {
    valor: "interes_legitimo",
    etiqueta: "Interés legítimo",
    articulo: "Art. 13 letra d)",
    descripcion: "Existe un interés legítimo del responsable o de un tercero que no afecta los derechos y libertades del titular. El titular puede exigir siempre ser informado sobre el tratamiento (Ley 21.719, Art. 13 letra d).",
  },
  {
    valor: "defensa_derechos",
    etiqueta: "Defensa de derechos ante tribunales",
    articulo: "Art. 13 letra e)",
    descripcion: "El tratamiento es necesario para la formulación, ejercicio o defensa de un derecho ante los tribunales de justicia u órganos públicos (Ley 21.719, Art. 13 letra e).",
  },
  {
    valor: "consentimiento_sensibles",
    etiqueta: "Consentimiento expreso — datos sensibles",
    articulo: "Art. 16 inc. 1",
    descripcion: "Datos sensibles (salud, origen étnico, religión, orientación sexual, biométricos, etc.) que requieren consentimiento EXPRESO del titular, otorgado por declaración escrita, verbal o medio tecnológico equivalente (Ley 21.719, Art. 16 inc. 1).",
  },
  {
    valor: "datos_biometricos",
    etiqueta: "Datos biométricos",
    articulo: "Art. 16 ter",
    descripcion: "Datos obtenidos por tratamiento técnico que permiten identificación única (huella, iris, rasgos faciales, voz). Requieren consentimiento expreso más información específica al titular sobre el sistema, finalidad y período de uso (Ley 21.719, Art. 16 ter).",
  },
];

/* ─── Tooltip base legal (R9.5: movido desde Paso1) ──────────── */
function TooltipBaseLegal({ opcion }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="p1-tooltip-wrap"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      <span className="p1-tooltip-trigger">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </span>
      {visible && (
        <div className="p1-tooltip-burbuja">
          <strong>{opcion.etiqueta}</strong>
          <span>{opcion.descripcion}</span>
        </div>
      )}
    </div>
  );
}

// cuenta las palabras (por espacios) para mostrarlas en el contador de la finalidad
function contarPalabras(texto) {
  return texto.trim() === "" ? 0 : texto.trim().split(/\s+/).length;
}

function serializarMedidasSeguridad(medidas, otrasMedidas) {
  const lista = [...(medidas || [])];
  const tieneOtras = lista.includes("otras");
  const base = lista.filter((id) => id !== "otras");

  if (tieneOtras && otrasMedidas?.trim()) {
    base.push(`otras:${otrasMedidas.trim()}`);
  } else if (tieneOtras) {
    base.push("otras");
  }

  return base.length > 0 ? base.join(",") : null;
}

// descarta bloques de "descripción detallada" (R8.4) que quedaron vacíos
function limpiarBloquesDatos(bloques) {
  return (bloques || [])
    .filter((b) => (b.categoria_dato || b.se_tratan || b.para_que || b.como || "").trim())
    .map((b) => ({
      categoria_dato: b.categoria_dato || null,
      se_tratan:      b.se_tratan      || null,
      para_que:       b.para_que       || null,
      como:           b.como           || null,
    }));
}

// descarta declaraciones de base legal adicional (R9.6) vacías y las envuelve
// en {descripcion} — así lo espera BaseLegalEntrada del backend
function limpiarBaseLegalDetalle(items) {
  return (items || [])
    .map((v) => (v || "").trim())
    .filter(Boolean)
    .map((descripcion) => ({ descripcion }));
}

function formatearErrorApi(detail) {
  if (!detail) return "Error al guardar el tratamiento";
  if (typeof detail === "string") return detail;

  if (Array.isArray(detail)) {
    return detail.map((item) => {
      if (typeof item === "string") return item;
      if (item?.msg) {
        const campo = Array.isArray(item.loc) ? item.loc.slice(1).join(" > ") : "";
        return campo ? `${campo}: ${item.msg}` : item.msg;
      }
      return JSON.stringify(item);
    }).join(". ");
  }

  if (typeof detail === "object") {
    if (typeof detail.message === "string") return detail.message;
    return JSON.stringify(detail);
  }

  return String(detail);
}

/* ─── Opciones de plazo de conservación ─────────────────────────
 * "otro" es especial — muestra un campo libre al seleccionarlo.
 */
const PLAZOS = [
  { valor: "1_anio", etiqueta: "1 año" },
  { valor: "2_anios", etiqueta: "2 años" },
  { valor: "5_anios", etiqueta: "5 años" },
  { valor: "10_anios", etiqueta: "10 años" },
  { valor: "indefinido", etiqueta: "Indefinido" },
  { valor: "duracion_relacion", etiqueta: "Mientras dure la relación contractual" },
  { valor: "otro", etiqueta: "Otro" },
];

/* ─── Medidas de seguridad ───────────────────────────────────────
 * "otras" es especial — muestra campo libre al marcarlo.
 */
const MEDIDAS = [
  { id: "cifrado", etiqueta: "Cifrado de datos" },
  { id: "acceso_rol", etiqueta: "Control de acceso por rol" },
  { id: "backups", etiqueta: "Backups periódicos" },
  { id: "contraseñas", etiqueta: "Política de contraseñas" },
  { id: "auditoria", etiqueta: "Auditoría de accesos" },
  { id: "otras", etiqueta: "Otras" },
];

/* ─── Etiquetas legibles para el acordeón ───────────────────────
 * Necesitamos mostrar texto amigable en vez de los valores internos.
 */
const ETIQ_BASE_LEGAL = {
  consentimiento:           "Consentimiento (Art. 12)",
  datos_economicos:         "Obligaciones económicas o financieras (Art. 13 letra a)",
  obligacion_legal:         "Obligación legal (Art. 13 letra b)",
  contrato:                 "Ejecución de contrato (Art. 13 letra c)",
  interes_legitimo:         "Interés legítimo (Art. 13 letra d)",
  defensa_derechos:         "Defensa de derechos ante tribunales (Art. 13 letra e)",
  consentimiento_sensibles: "Consentimiento expreso — datos sensibles (Art. 16 inc. 1)",
  datos_biometricos:        "Datos biométricos (Art. 16 ter)",
};

const ETIQ_ORIGEN = {
  titular:          "Del propio titular",
  terceros:         "De terceros",
  fuentes_publicas: "De fuentes públicas",
};

const ETIQ_TITULARES = {
  empleados:   "Empleados y funcionarios",
  clientes:    "Clientes y consumidores",
  proveedores: "Proveedores y contratistas",
  usuarios:    "Usuarios de plataformas digitales",
  ciudadanos:  "Ciudadanos",
  estudiantes: "Estudiantes",
  pacientes:   "Pacientes",
};

const ETIQ_PLAZO = {
  "1_anio": "1 año",
  "2_anios": "2 años",
  "5_anios": "5 años",
  "10_anios": "10 años",
  indefinido: "Indefinido",
  duracion_relacion: "Mientras dure la relación contractual",
  otro: "Otro",
};

const ETIQ_MEDIDAS = {
  cifrado: "Cifrado de datos",
  acceso_rol: "Control de acceso por rol",
  backups: "Backups periódicos",
  contraseñas: "Política de contraseñas",
  auditoria: "Auditoría de accesos",
  otras: "Otras",
};

const ETIQ_SENSIBLES = {
  datos_salud:         "Datos de salud",
  datos_biometricos:   "Datos biométricos",
  origen_etnico:       "Origen étnico",
  religion_creencias:  "Religión o creencias",
  orientacion_sexual:  "Orientación sexual",
  opiniones_politicas: "Opiniones políticas",
};

const ETIQ_CATEGORIAS = {
  nombre_apellido: "Nombre y apellido",
  rut_dni: "RUT / DNI",
  correo_electronico: "Correo electrónico",
  telefono: "Teléfono",
  direccion: "Dirección",
  fecha_nacimiento: "Fecha de nacimiento",
};

const ETIQ_INFORMA_TITULARES = {
  web: "Aviso en web",
  correo: "Correo electrónico",
  contrato: "Contrato",
  mandato: "Mandato",
};

const ETIQ_METODO_TRANSFERENCIA = {
  digital: "Digital",
  verbal: "Verbal",
  fisico: "Físico",
};

// R9.4 — mismo patrón que ETIQ_METODO_TRANSFERENCIA, para el acordeón de revisión.
const ETIQ_TIPOS_TRATAMIENTO = {
  captura: "Captura",
  consulta: "Consulta / visualización",
  modificacion: "Modificación",
  perfilamiento: "Perfilamiento",
  reportes: "Generación de reportes",
  decisiones_automatizadas: "Decisiones automatizadas",
  comunicacion_terceros: "Comunicación a terceros",
  evaluacion_clasificacion: "Evaluación/clasificación",
  cruce_datos: "Cruce de datos",
};

const ETIQ_CRITERIO_PLAZO = {
  legal: "Legal (normativa aplicable)",
  contractual: "Contractual (duración del contrato)",
  operacional: "Operacional (necesidad del proceso)",
};

const ETIQ_METODO_ELIMINACION = {
  digital: "Eliminación segura digital",
  fisica: "Destrucción física",
  anonimizacion: "Anonimización",
  otro: "Otro",
};

const ETIQ_EVALUACION_PERIODICA = {
  anual: "Anual",
  bienal: "Bienal (cada 2 años)",
  ante_cambios: "Ante cambios importantes",
  sin_definir: "Sin definir",
};

const CRITERIOS_PLAZO = [
  { valor: "legal", etiqueta: "Legal (normativa aplicable)" },
  { valor: "contractual", etiqueta: "Contractual (duración del contrato)" },
  { valor: "operacional", etiqueta: "Operacional (necesidad del proceso)" },
];
const METODOS_ELIMINACION = [
  { valor: "digital", etiqueta: "Eliminación segura digital" },
  { valor: "fisica", etiqueta: "Destrucción física" },
  { valor: "anonimizacion", etiqueta: "Anonimización" },
  { valor: "otro", etiqueta: "Otro" },
];
const PERIODOS_EVALUACION = [
  { valor: "anual", etiqueta: "Anual" },
  { valor: "bienal", etiqueta: "Bienal (cada 2 años)" },
  { valor: "ante_cambios", etiqueta: "Ante cambios importantes" },
  { valor: "sin_definir", etiqueta: "Sin definir" },
];

/* ─── Componente principal ───────────────────────────────────── */
export default function Paso4() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const { form, actualizarForm, resetForm, avanzarActividad } = useFormulario();
  const esEdicion = form.modoEdicion;
  const categoriasDatos = form.categorias_datos || [];
  const categoriasSensibles = form.categorias_sensibles || [];
  const camposDetectados = form.campos_detectados || [];

  /* Estado local — mismo patrón de Paso1 y Paso2 */
  const [local, setLocal] = useState({
    // Principio 1 — Licitud y transparencia / Principio 2 — Finalidad (R9.5: movidos desde Paso1)
    finalidad: form.finalidad || "",
    base_legal: form.base_legal ? form.base_legal.split(",").filter(Boolean) : [],
    base_legal_detalle: form.base_legal_detalle || [],
    asegura_transparencia_detalle: form.asegura_transparencia_detalle || "",
    informa_titulares_si_no: form.informa_titulares_si_no ?? null,
    informa_titulares: form.informa_titulares || [],
    documento_respaldo_tiene: form.documento_respaldo_tiene ?? null,
    documento_respaldo_descripcion: form.documento_respaldo_descripcion || "",
    finalidad_todos_necesarios: form.finalidad_todos_necesarios ?? null,
    finalidad_misma: form.finalidad_misma ?? null,
    usa_solo_fines_declarados: form.usa_solo_fines_declarados ?? null,
    minimizacion_si_no: form.minimizacion_si_no ?? null,
    plazo_conservacion: form.plazo_conservacion || "",
    plazo_otro: form.plazo_otro || "",
    medidas_seguridad: form.medidas_seguridad || [],
    otras_medidas: form.otras_medidas || "",
    decisiones_automatizadas: form.decisiones_automatizadas ?? false,
    // Principios Ley 21.719
    criterio_plazo: form.criterio_plazo || "",
    metodo_eliminacion: form.metodo_eliminacion || "",
    documenta_destruccion: form.documenta_destruccion ?? false,
    excepciones_plazo: form.excepciones_plazo || "",
    minimizacion_justificacion: form.minimizacion_justificacion || "",
    mecanismos_exactitud: form.mecanismos_exactitud || "",
    evaluacion_periodica: form.evaluacion_periodica || "",
    cumplimiento_demostrable: form.cumplimiento_demostrable || "",
    incidentes_historicos: form.incidentes_historicos || "",
    cambios_futuros: form.cambios_futuros || "",
    // DPIA
    requiere_dpia: form.requiere_dpia ?? false,
    dpia_realizada: form.dpia_realizada ?? null,
    dpia_detalle: form.dpia_detalle || "",
  });

  /* Acordeón de revisión — por defecto cerrado */
  const [acordeonAbierto, setAcordeonAbierto] = useState(false);
  const [principiosAbierto, setPrincipiosAbierto] = useState(false);
  const [dpiaAbierto, setDpiaAbierto] = useState(false);

  const [guardando, setGuardando] = useState(false);
  const [guardandoBorrador, setGuardandoBorrador] = useState(false);
  const [borradorOk, setBorradorOk] = useState(false);
  const [error, setError] = useState("");

  /* ── Base legal / informa a titulares (checkboxes, R9.5) ──────── */
  function toggleBaseLegal(valor) {
    setLocal((prev) => {
      const lista = prev.base_legal;
      return {
        ...prev,
        base_legal: lista.includes(valor)
          ? lista.filter((v) => v !== valor)
          : [...lista, valor],
      };
    });
  }

  function toggleInformaTitulares(valor) {
    setLocal((prev) => {
      const actual = prev.informa_titulares || [];
      return {
        ...prev,
        informa_titulares: actual.includes(valor)
          ? actual.filter((v) => v !== valor)
          : [...actual, valor],
      };
    });
  }

  /* ── Medidas de seguridad (checkboxes) ──────────────────────── */
  function toggleMedida(id) {
    setLocal((prev) => {
      const lista = prev.medidas_seguridad;
      return {
        ...prev,
        medidas_seguridad: lista.includes(id) ? lista.filter((x) => x !== id) : [...lista, id],
      };
    });
  }

  /* ── Guardar al backend ──────────────────────────────────────── */
  async function handleGuardar() {
    setGuardando(true);
    setError("");

    const localParaGuardar = { ...local, base_legal: local.base_legal.join(",") };
    actualizarForm(localParaGuardar);
    const formularioCompleto = { ...form, ...localParaGuardar };

    const payload = {
      // Campos del tratamiento principal
      nombre:                   formularioCompleto.nombre,
      finalidad:                formularioCompleto.finalidad    || null,
      base_legal:               formularioCompleto.base_legal   || null,
      datos_sensibles:          formularioCompleto.datos_sensibles      ?? false,
      destinatarios: [
        formularioCompleto.destinatarios_internos,
        formularioCompleto.destinatarios_nacionales,
        formularioCompleto.destinatarios_internacionales,
      ].filter(Boolean).join("; ") || formularioCompleto.destinatarios || null,
      sale_extranjero:          formularioCompleto.sale_extranjero      ?? false,
      plazo_conservacion:       formularioCompleto.plazo_conservacion   || null,
      plazo_otro:               formularioCompleto.plazo_otro           || null,
      medidas_seguridad: serializarMedidasSeguridad(
        formularioCompleto.medidas_seguridad,
        formularioCompleto.otras_medidas
      ),
      otras_medidas:            formularioCompleto.otras_medidas        || null,
      decisiones_automatizadas: formularioCompleto.decisiones_automatizadas ?? false,
      campos_detectados:        formularioCompleto.campos_detectados    || [],
      sesion_id:                formularioCompleto.sesionActual         || null,
      campos_usados:            formularioCompleto.sesionActual
        ? (formularioCompleto.campos_detectados || []).map((c) => c.nombre_columna)
        : null,
      datos_tratados:           limpiarBloquesDatos(formularioCompleto.datos_tratados),
      base_legal_detalle:       limpiarBaseLegalDetalle(formularioCompleto.base_legal_detalle),

      // Objeto detalle — va a la tabla detalle_rat con los nombres del schema
      detalle: {
        responsable_tratamiento: formularioCompleto.responsable    || null,
        es_responsable:          formularioCompleto.es_responsable ?? true,
        // el backend espera string; el frontend lo tiene como array
        categorias_titulares: (formularioCompleto.categorias_titulares || []).join(",") || null,
        universo_titulares:   formularioCompleto.universo_titulares || null,
        origen_datos:         formularioCompleto.origen_datos || null,
      },

    };

    // Solo incluir detalle_extendido si tiene al menos un campo con valor
    const _ext = {
      proceso_asociado:            formularioCompleto.proceso_asociado            || null,
      subarea_responsable:         formularioCompleto.subarea_responsable         || null,
      procesos_relacionados:       formularioCompleto.procesos_relacionados       || null,
      finalidades_secundarias:     formularioCompleto.finalidades_secundarias     || null,
      informa_titulares:           (formularioCompleto.informa_titulares || []).join(",") || null,
      documento_respaldo_permiso:  formularioCompleto.documento_respaldo_tiene === true
        ? (formularioCompleto.documento_respaldo_descripcion || "Sí")
        : formularioCompleto.documento_respaldo_tiene === false ? "No" : null,
      // Principios 1 y 2 (R9.5)
      asegura_transparencia_detalle: formularioCompleto.asegura_transparencia_detalle || null,
      informa_titulares_si_no:       formularioCompleto.informa_titulares_si_no       ?? null,
      finalidad_todos_necesarios:    formularioCompleto.finalidad_todos_necesarios    ?? null,
      finalidad_misma:               formularioCompleto.finalidad_misma               ?? null,
      usa_solo_fines_declarados:     formularioCompleto.usa_solo_fines_declarados     ?? null,
      minimizacion_si_no:            formularioCompleto.minimizacion_si_no            ?? null,
      // R9.3/R9.4 (Paso 2 y 3) — faltaban acá: se guardaban solo si el
      // usuario paraba a hacer "Guardar borrador" en Paso2/Paso3, pero se
      // perdían si completaba todo el wizard de corrido hasta "Guardar" (R9.7b).
      datos_sensibles_descripcion:        formularioCompleto.datos_sensibles_descripcion        || null,
      datos_academicos_laborales:         formularioCompleto.datos_academicos_laborales         || null,
      datos_financieros_patrimoniales:    formularioCompleto.datos_financieros_patrimoniales    || null,
      origen_sistemico_datos:             formularioCompleto.origen_sistemico_datos             || null,
      base_legal_transferencia_internacional: formularioCompleto.base_legal_transferencia_internacional || null,
      metodo_transferencia_detalle:       formularioCompleto.metodo_transferencia_detalle       || null,
      otros_datos:                        formularioCompleto.otros_datos                        || null,
      // B2-05
      incluye_nna:                        formularioCompleto.incluye_nna ? true : null,
      nna_detalle:                        formularioCompleto.nna_detalle || null,
      datos_navegacion:                   formularioCompleto.datos_navegacion ? true : null,
      datos_navegacion_detalle:           formularioCompleto.datos_navegacion_detalle || null,
      destinatarios_internos:             formularioCompleto.destinatarios_internos || null,
      destinatarios_nacionales:           formularioCompleto.destinatarios_nacionales || null,
      destinatarios_internacionales:      formularioCompleto.destinatarios_internacionales || null,
      terceros_son_encargados:            formularioCompleto.terceros_son_encargados ? true : null,
      contratos_proteccion_datos:         formularioCompleto.contratos_proteccion_datos ? true : null,
      contratos_proteccion_datos_detalle: formularioCompleto.contratos_proteccion_datos_detalle || null,
      datos_transferidos_detalle:         formularioCompleto.datos_transferidos_detalle || null,
      metodo_transferencia:               (formularioCompleto.metodo_transferencia || []).join(",") || null,
      sistemas_origen:                    formularioCompleto.sistemas_origen || null,
      sistemas_destino:                   formularioCompleto.sistemas_destino || null,
      sistemas_tratamiento:               formularioCompleto.sistemas_tratamiento || null,
      tipos_tratamiento_sistema:          (formularioCompleto.tipos_tratamiento_sistema || []).join(",") || null,
      base_datos_nombre:                  formularioCompleto.base_datos_nombre || null,
      proveedor_tecnologico:              formularioCompleto.proveedor_tecnologico || null,
      // Campos calculados/seleccionados
      pais_destino:                       formularioCompleto.pais_destino || null,
      categorias_sensibles:               (formularioCompleto.categorias_sensibles || []).join(",") || null,
      categorias_datos_seleccion:         (formularioCompleto.categorias_datos || []).join(",") || null,
      // Principios Ley 21.719
      criterio_plazo:              formularioCompleto.criterio_plazo              || null,
      metodo_eliminacion:          formularioCompleto.metodo_eliminacion          || null,
      documenta_destruccion:       formularioCompleto.documenta_destruccion       ?? false,
      excepciones_plazo:           formularioCompleto.excepciones_plazo           || null,
      minimizacion_justificacion:  formularioCompleto.minimizacion_justificacion  || null,
      mecanismos_exactitud:        formularioCompleto.mecanismos_exactitud        || null,
      evaluacion_periodica:        formularioCompleto.evaluacion_periodica        || null,
      cumplimiento_demostrable:    formularioCompleto.cumplimiento_demostrable    || null,
      incidentes_historicos:       formularioCompleto.incidentes_historicos       || null,
      cambios_futuros:             formularioCompleto.cambios_futuros             || null,
      // DPIA
      requiere_dpia:               formularioCompleto.requiere_dpia               ?? false,
      dpia_realizada:              formularioCompleto.requiere_dpia ? (formularioCompleto.dpia_realizada ?? null) : null,
      dpia_detalle:                formularioCompleto.requiere_dpia ? (formularioCompleto.dpia_detalle || null) : null,
    };
    if (Object.values(_ext).some((v) => v !== null)) {
      payload.detalle_extendido = _ext;
    }

    try {
      if (esEdicion) {
        const medStr = serializarMedidasSeguridad(formularioCompleto.medidas_seguridad, formularioCompleto.otras_medidas);
        const tieneDestinatarios = formularioCompleto.destinatarios || formularioCompleto.destinatarios_internos || formularioCompleto.destinatarios_nacionales || formularioCompleto.destinatarios_internacionales;
        const estadoFinal = (formularioCompleto.finalidad && formularioCompleto.base_legal && formularioCompleto.plazo_conservacion && tieneDestinatarios && medStr) ? "COMPLETO" : "PENDIENTE";
        const { campos_detectados, sesion_id, campos_usados, otras_medidas, ...editPayload } = payload;
        await actualizarTratamiento(form.tratamientoEditId, { ...editPayload, estado: estadoFinal });
        const editId = form.tratamientoEditId;
        resetForm();
        navigate(`/tratamientos/${editId}`);
        return;
      }

      const idx = form.actividadActual ?? 0;
      const tratId = form.tratamientosGuardados?.[idx];

      if (tratId) {
        const medStr = serializarMedidasSeguridad(
          formularioCompleto.medidas_seguridad,
          formularioCompleto.otras_medidas,
        );
        const tieneDestinatarios = formularioCompleto.destinatarios ||
          formularioCompleto.destinatarios_internos ||
          formularioCompleto.destinatarios_nacionales ||
          formularioCompleto.destinatarios_internacionales;
        const estadoFinal = (
          formularioCompleto.finalidad &&
          formularioCompleto.base_legal &&
          formularioCompleto.plazo_conservacion &&
          tieneDestinatarios &&
          medStr
        ) ? "COMPLETO" : "PENDIENTE";

        try {
          await actualizarTratamiento(tratId, { ...payload, estado: estadoFinal });
        } catch (putErr) {
          const msg = putErr.message?.toLowerCase() ?? "";
          if (msg.includes("no encontrado") || msg.includes("not found")) {
            actualizarForm({ tratamientosGuardados: {}, sesionActual: null });
            const { sesion_id, campos_usados, ...payloadSinSesion } = payload;
            const creado = await crearTratamiento({ ...payloadSinSesion, sesion_id: null, campos_usados: null });
            if (creado?.id) {
              await fetch(`${API}/tratamientos/${creado.id}/evaluar`, {
                method: "POST", headers: { Authorization: `Bearer ${token}` },
              });
            }
          } else {
            throw putErr;
          }
        }
      } else {
        const creado = await crearTratamiento(payload);
        if (creado?.id) {
          await fetch(`${API}/tratamientos/${creado.id}/evaluar`, {
            method: "POST", headers: { Authorization: `Bearer ${token}` },
          });
        }
      }

      const hayMas =
        form.actividadesPendientes.length > 0 &&
        form.actividadActual + 1 < form.actividadesPendientes.length;
      if (hayMas) {
        avanzarActividad();
        navigate("/nuevo-tratamiento");
      } else {
        if (form.sesionActual) {
          await fetch(`${API}/sesiones/${form.sesionActual}/estado`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ estado: "completada" }),
          });
        }
        resetForm();
        navigate("/mis-tratamientos");
      }
    } catch (e) {
      if (e.codigo === 401) {
        navigate("/login");
        return;
      }
      console.error("ERROR GUARDAR:", e.message, e.errores);
      setError(e.message || "Error al guardar el tratamiento. Intenta nuevamente.");
    } finally {
      setGuardando(false);
    }
  }

  async function handleGuardarBorrador() {
    setGuardandoBorrador(true);
    try {
      const localParaGuardar = { ...local, base_legal: local.base_legal.join(",") };
      actualizarForm(localParaGuardar);
      const datos = { ...form, ...localParaGuardar };
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
      const medStr = serializarMedidasSeguridad(local.medidas_seguridad, local.otras_medidas);
      const payload3 = {
        nombre: datos.nombre.trim() || "Sin nombre",
        finalidad: datos.finalidad || null,
        base_legal: datos.base_legal || null,
        datos_sensibles: datos.datos_sensibles ?? false,
        destinatarios: [
          datos.destinatarios_internos,
          datos.destinatarios_nacionales,
          datos.destinatarios_internacionales,
        ].filter(Boolean).join("; ") || datos.destinatarios || null,
        sale_extranjero: datos.sale_extranjero ?? false,
        plazo_conservacion: local.plazo_conservacion || null,
        medidas_seguridad: medStr,
        decisiones_automatizadas: local.decisiones_automatizadas ?? false,
        campos_detectados: datos.campos_detectados || [],
        campos_usados: datos.campos_detectados || [],
        datos_tratados: limpiarBloquesDatos(datos.datos_tratados),
        base_legal_detalle: limpiarBaseLegalDetalle(datos.base_legal_detalle),
        detalle: {
          responsable_tratamiento: datos.responsable || null,
          es_responsable: datos.es_responsable ?? true,
          categorias_titulares: (datos.categorias_titulares || []).join(",") || null,
          universo_titulares: datos.universo_titulares || null,
          origen_datos: datos.origen_datos || null,
        },
        detalle_extendido: {
          proceso_asociado:           datos.proceso_asociado            || null,
          subarea_responsable:        datos.subarea_responsable         || null,
          procesos_relacionados:      datos.procesos_relacionados       || null,
          finalidades_secundarias:    datos.finalidades_secundarias     || null,
          informa_titulares:          (datos.informa_titulares || []).join(",") || null,
          documento_respaldo_permiso: datos.documento_respaldo_tiene === true
            ? (datos.documento_respaldo_descripcion || "Sí")
            : datos.documento_respaldo_tiene === false ? "No" : null,
          // Principios 1 y 2 (R9.5)
          asegura_transparencia_detalle: datos.asegura_transparencia_detalle || null,
          informa_titulares_si_no:       datos.informa_titulares_si_no       ?? null,
          finalidad_todos_necesarios:    datos.finalidad_todos_necesarios    ?? null,
          finalidad_misma:               datos.finalidad_misma               ?? null,
          usa_solo_fines_declarados:     datos.usa_solo_fines_declarados     ?? null,
          minimizacion_si_no:            datos.minimizacion_si_no            ?? null,
          // R9.3/R9.4 (Paso 2 y 3) — mismo fix que en handleGuardar (R9.7b)
          datos_sensibles_descripcion:        datos.datos_sensibles_descripcion        || null,
          datos_academicos_laborales:         datos.datos_academicos_laborales         || null,
          datos_financieros_patrimoniales:    datos.datos_financieros_patrimoniales    || null,
          origen_sistemico_datos:             datos.origen_sistemico_datos             || null,
          base_legal_transferencia_internacional: datos.base_legal_transferencia_internacional || null,
          metodo_transferencia_detalle:       datos.metodo_transferencia_detalle       || null,
          otros_datos:                        datos.otros_datos                        || null,
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
          // Campos calculados/seleccionados
          pais_destino:                       datos.pais_destino || null,
          categorias_sensibles:               (datos.categorias_sensibles || []).join(",") || null,
          categorias_datos_seleccion:         (datos.categorias_datos || []).join(",") || null,
          // Principios Ley 21.719
          criterio_plazo:              local.criterio_plazo              || null,
          metodo_eliminacion:          local.metodo_eliminacion          || null,
          documenta_destruccion:       local.documenta_destruccion       ?? false,
          excepciones_plazo:           local.excepciones_plazo           || null,
          minimizacion_justificacion:  local.minimizacion_justificacion  || null,
          mecanismos_exactitud:        local.mecanismos_exactitud        || null,
          evaluacion_periodica:        local.evaluacion_periodica        || null,
          cumplimiento_demostrable:    local.cumplimiento_demostrable    || null,
          incidentes_historicos:       local.incidentes_historicos       || null,
          cambios_futuros:             local.cambios_futuros             || null,
          requiere_dpia:               local.requiere_dpia               ?? false,
          dpia_realizada:              local.requiere_dpia ? (local.dpia_realizada ?? null) : null,
          dpia_detalle:                local.requiere_dpia ? (local.dpia_detalle || null) : null,
        },
      };

      let currentTratId = tratId;
      if (tratId) {
        await fetch(`${API}/tratamientos/${tratId}`, {
          method: "PUT", headers, body: JSON.stringify(payload3),
        });
      } else {
        const res = await fetch(`${API}/tratamientos`, {
          method: "POST", headers,
          body: JSON.stringify({ ...payload3, estado: "BORRADOR", sesion_id: sesionId }),
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

  function handleAnterior() {
    actualizarForm({ ...local, base_legal: local.base_legal.join(",") });
    navigate("/nuevo-tratamiento/paso3");
    window.scrollTo(0, 0);
  }

  // R9.5: finalidad y base legal ahora se completan en este paso — se exigen
  // recién al guardar de verdad, no al guardar un borrador (que es parcial por definición).
  const puedeGuardar = local.finalidad.trim().length > 0 && local.base_legal.length > 0;

  return (
    <div className="p4-layout">
      <BarraLateral />

      <main className="p4-main">
        <div className="p4-header">
          <h1 className="p4-titulo">{esEdicion ? "Editar tratamiento" : "Nuevo tratamiento"}</h1>
          <p className="p4-subtitulo">{esEdicion ? "Modifica la información del tratamiento" : "Completa la información para registrar este tratamiento en el RAT"}</p>
        </div>

        <div className="p4-card">
          <BarraProgreso pasoActual={4} prefix="p4" />

          {/* ── Principio 1 — Licitud y transparencia (R9.5: movido desde Paso1 + campos nuevos) ── */}
          <div className="p4-seccion" style={{ marginBottom: "1.6rem" }}>
            <h3 className="p4-seccion-titulo">Principio 1 — Licitud y transparencia</h3>

            {/* Base legal */}
            <div className="p1-campo">
              <div className="p1-label-row">
                <label className="p1-label" htmlFor="base_legal">
                  Base legal
                </label>
                <div className="p1-bases-info">
                  {BASES_LEGALES.map((op) => (
                    <TooltipBaseLegal key={op.valor} opcion={op} />
                  ))}
                </div>
              </div>
              <div className="p1-checkboxes">
                {BASES_LEGALES.map((op) => {
                  const marcado = local.base_legal.includes(op.valor);
                  return (
                    <label key={op.valor} className={`p1-check-item ${marcado ? "p1-check-item--marcado" : ""}`}>
                      <input
                        type="checkbox"
                        className="p1-check-input"
                        checked={marcado}
                        onChange={() => toggleBaseLegal(op.valor)}
                      />
                      <span className="p1-check-texto">{op.etiqueta}</span>
                      <span className="p1-check-articulo">{op.articulo}</span>
                    </label>
                  );
                })}
              </div>
              {local.base_legal.length > 0 && (
                <div className="p1-bases-seleccionadas">
                  {local.base_legal.map((valor) => {
                    const base = BASES_LEGALES.find((b) => b.valor === valor);
                    return base ? (
                      <p key={valor} className="p1-base-desc">
                        <span className="p1-base-articulo">{base.articulo} —</span> {base.descripcion}
                      </p>
                    ) : null;
                  })}
                </div>
              )}
            </div>

            {/* Base legal adicional — lista dinámica de texto libre (R9.6) */}
            <div className="p1-campo">
              <label className="p1-label">Base legal adicional (opcional)</label>
              <p className="p1-campo-hint p1-campo-hint--info" style={{ marginBottom: 8 }}>
                Agrega, una por una, otras normas, consentimientos o documentos que respaldan este tratamiento.
              </p>
              <ListaDinamicaTexto
                items={local.base_legal_detalle}
                onChange={(items) => setLocal((p) => ({ ...p, base_legal_detalle: items }))}
                placeholder="Ej: Ley de inclusión laboral 21.015"
                textoBoton="+ Agregar otra base legal"
                rows={2}
              />
            </div>

            {/* Transparencia — pregunta compartida con Principio 4, un solo campo */}
            <div className="p4-campo-grupo">
              <label className="p4-campo-label">¿De qué manera asegura que el tratamiento se realiza conforme a la ley y de forma transparente?</label>
              <textarea
                className="p4-textarea-campo"
                rows={3}
                placeholder="Ej: políticas de privacidad públicas, avisos de tratamiento, registro de actividades..."
                value={local.asegura_transparencia_detalle}
                onChange={(e) => setLocal((p) => ({ ...p, asegura_transparencia_detalle: e.target.value }))}
                maxLength={1500}
              />
            </div>

            {/* ¿Se informa a titulares? — Sí/No antes de los canales */}
            <div className="p4-campo-grupo">
              <label className="p4-campo-label">¿Se informa a los titulares sobre el tratamiento de sus datos?</label>
              <div className="p4-radio-grupo">
                <label className="p4-radio-item">
                  <input
                    type="radio"
                    name="informa_titulares_si_no"
                    checked={local.informa_titulares_si_no === true}
                    onChange={() => setLocal((p) => ({ ...p, informa_titulares_si_no: true }))}
                  />
                  <span>Sí</span>
                </label>
                <label className="p4-radio-item">
                  <input
                    type="radio"
                    name="informa_titulares_si_no"
                    checked={local.informa_titulares_si_no === false}
                    onChange={() => setLocal((p) => ({ ...p, informa_titulares_si_no: false, informa_titulares: [] }))}
                  />
                  <span>No</span>
                </label>
              </div>
            </div>
            {local.informa_titulares_si_no === true && (
              <div className="p1-campo">
                <label className="p1-label">¿Cómo se informa a los titulares?</label>
                <div className="p1-checkboxes">
                  {[
                    { valor: "web",       etiqueta: "Aviso en web" },
                    { valor: "correo",    etiqueta: "Correo electrónico" },
                    { valor: "contrato",  etiqueta: "Contrato" },
                    { valor: "mandato",   etiqueta: "Mandato" },
                  ].map(({ valor, etiqueta }) => (
                    <label key={valor} className="p1-checkbox-opcion">
                      <input
                        type="checkbox"
                        checked={(local.informa_titulares || []).includes(valor)}
                        onChange={() => toggleInformaTitulares(valor)}
                      />
                      <span>{etiqueta}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Documento de respaldo */}
            <div className="p1-campo">
              <label className="p1-label">¿Existe documento de respaldo o permiso?</label>
              <div className="p1-radios">
                <label className="p1-rol-opcion">
                  <input
                    type="radio"
                    name="documento_respaldo_tiene"
                    checked={local.documento_respaldo_tiene === true}
                    onChange={() => setLocal((p) => ({ ...p, documento_respaldo_tiene: true }))}
                  />
                  <span>Sí</span>
                </label>
                <label className="p1-rol-opcion">
                  <input
                    type="radio"
                    name="documento_respaldo_tiene"
                    checked={local.documento_respaldo_tiene === false}
                    onChange={() => setLocal((p) => ({ ...p, documento_respaldo_tiene: false, documento_respaldo_descripcion: "" }))}
                  />
                  <span>No</span>
                </label>
              </div>
              {local.documento_respaldo_tiene === true && (
                <>
                  <textarea
                    className="p1-textarea"
                    placeholder="Describe el documento de respaldo o permiso"
                    value={local.documento_respaldo_descripcion}
                    onChange={(e) => setLocal((p) => ({ ...p, documento_respaldo_descripcion: e.target.value }))}
                    rows={2}
                    maxLength={1000}
                    style={{ marginTop: 8 }}
                  />
                  <span className="p1-campo-contador">{local.documento_respaldo_descripcion.length}/1000</span>
                </>
              )}
            </div>
          </div>

          {/* ── Principio 2 — Finalidad (R9.5: movido desde Paso1 + campos nuevos) ── */}
          <div className="p4-seccion" style={{ marginBottom: "1.6rem" }}>
            <h3 className="p4-seccion-titulo">Principio 2 — Finalidad</h3>

            <div className="p1-campo">
              <label className="p1-label" htmlFor="finalidad">
                Finalidad
              </label>
              <textarea
                id="finalidad"
                name="finalidad"
                className="p1-textarea"
                placeholder="Describe el objetivo de este tratamiento de datos. Ej: Gestionar el pago de remuneraciones y cumplir con obligaciones laborales y previsionales."
                value={local.finalidad}
                onChange={(e) => {
                  if (contarPalabras(e.target.value) > 2000) return;
                  setLocal((p) => ({ ...p, finalidad: e.target.value }));
                }}
                rows={3}
              />
              <span className={`p1-campo-contador ${contarPalabras(local.finalidad) >= 2000 ? "p1-campo-contador--limite" : ""}`}>
                {contarPalabras(local.finalidad)}/2000 palabras
              </span>
            </div>

            <div className="p4-campo-grupo">
              <label className="p4-campo-label">¿Todos los datos tienen finalidad y son necesarios?</label>
              <div className="p4-radio-grupo">
                <label className="p4-radio-item">
                  <input type="radio" name="finalidad_todos_necesarios" checked={local.finalidad_todos_necesarios === true} onChange={() => setLocal((p) => ({ ...p, finalidad_todos_necesarios: true }))} />
                  <span>Sí</span>
                </label>
                <label className="p4-radio-item">
                  <input type="radio" name="finalidad_todos_necesarios" checked={local.finalidad_todos_necesarios === false} onChange={() => setLocal((p) => ({ ...p, finalidad_todos_necesarios: false }))} />
                  <span>No</span>
                </label>
              </div>
            </div>

            <div className="p4-campo-grupo">
              <label className="p4-campo-label">Todos los datos tienen la misma finalidad</label>
              <div className="p4-radio-grupo">
                <label className="p4-radio-item">
                  <input type="radio" name="finalidad_misma" checked={local.finalidad_misma === true} onChange={() => setLocal((p) => ({ ...p, finalidad_misma: true }))} />
                  <span>Sí</span>
                </label>
                <label className="p4-radio-item">
                  <input type="radio" name="finalidad_misma" checked={local.finalidad_misma === false} onChange={() => setLocal((p) => ({ ...p, finalidad_misma: false }))} />
                  <span>No</span>
                </label>
              </div>
            </div>

            <div className="p4-campo-grupo">
              <label className="p4-campo-label">¿Los datos se usan solo para fines declarados?</label>
              <div className="p4-radio-grupo">
                <label className="p4-radio-item">
                  <input type="radio" name="usa_solo_fines_declarados" checked={local.usa_solo_fines_declarados === true} onChange={() => setLocal((p) => ({ ...p, usa_solo_fines_declarados: true }))} />
                  <span>Sí</span>
                </label>
                <label className="p4-radio-item">
                  <input type="radio" name="usa_solo_fines_declarados" checked={local.usa_solo_fines_declarados === false} onChange={() => setLocal((p) => ({ ...p, usa_solo_fines_declarados: false }))} />
                  <span>No</span>
                </label>
              </div>
            </div>
          </div>

          {/* ── Grid 3 secciones ─────────────────────────────── */}
          <div className="p4-grid">

            {/* ── Sección 1: Plazo de conservación ─────────── */}
            <div className="p4-seccion">
              <h3 className="p4-seccion-titulo">Plazo de conservación</h3>

              {/* Select estilizado como el de Paso1 */}
              <div className="p4-select-wrap">
                <select
                  className="p4-select"
                  value={local.plazo_conservacion}
                  onChange={(e) => setLocal((prev) => ({
                    ...prev,
                    plazo_conservacion: e.target.value,
                    plazo_otro: e.target.value !== "otro" ? "" : prev.plazo_otro,
                  }))}
                >
                  <option value="">Plazo de conservación ▾</option>
                  {PLAZOS.map((p) => (
                    <option key={p.valor} value={p.valor}>{p.etiqueta}</option>
                  ))}
                </select>
              </div>

              {/* Lista visible de opciones (igual al mockup) */}
              <div className="p4-plazos-lista">
                {PLAZOS.filter((p) => p.valor !== "otro").map((p) => (
                  <div key={p.valor}
                    className={`p4-plazo-opcion ${local.plazo_conservacion === p.valor ? "p4-plazo-opcion--activo" : ""}`}
                    onClick={() => setLocal((prev) => ({ ...prev, plazo_conservacion: p.valor, plazo_otro: "" }))}
                  >
                    {p.etiqueta}
                  </div>
                ))}
                {/* Opción "Otro" con campo libre */}
                <div
                  className={`p4-plazo-opcion ${local.plazo_conservacion === "otro" ? "p4-plazo-opcion--activo" : ""}`}
                  onClick={() => setLocal((prev) => ({ ...prev, plazo_conservacion: "otro" }))}
                >
                  Otro
                </div>
                {local.plazo_conservacion === "otro" && (
                  <input
                    type="text"
                    className="p4-input-otro"
                    placeholder="Especifica el plazo..."
                    value={local.plazo_otro}
                    onChange={(e) => setLocal((prev) => ({ ...prev, plazo_otro: e.target.value }))}
                    maxLength={100}
                    autoFocus
                  />
                )}
              </div>
            </div>

            {/* ── Sección 2: Medidas de seguridad ──────────── */}
            <div className="p4-seccion">
              <h3 className="p4-seccion-titulo">Medidas de seguridad</h3>
              <div className="p4-checkboxes">
                {MEDIDAS.map((m) => {
                  const marcado = local.medidas_seguridad.includes(m.id);
                  return (
                    <label key={m.id} className={`p4-check-item ${marcado ? "p4-check-item--marcado" : ""}`}>
                      <input
                        type="checkbox"
                        className="p4-check-input"
                        checked={marcado}
                        onChange={() => toggleMedida(m.id)}
                      />
                      <span className="p4-check-texto">{m.etiqueta}</span>
                    </label>
                  );
                })}
                {/* Campo libre para "Otras" */}
                {local.medidas_seguridad.includes("otras") && (
                  <>
                    <textarea
                      className="p4-textarea-otro"
                      placeholder="Describe otras medidas..."
                      value={local.otras_medidas}
                      onChange={(e) => setLocal((prev) => ({ ...prev, otras_medidas: e.target.value }))}
                      rows={3}
                      maxLength={1500}
                    />
                    <p className="p4-campo-ayuda">Si son varias medidas, sepáralas por comas o en líneas distintas.</p>
                    <span className="p4-campo-contador">{local.otras_medidas.length}/1500</span>
                  </>
                )}
              </div>
            </div>

            {/* ── Sección 3: Decisiones automatizadas ──────── */}
            <div className="p4-seccion">
              <h3 className="p4-seccion-titulo">¿Hay decisiones automatizadas sobre las personas con estos datos?</h3>
              <p className="p4-seccion-desc">
                Algoritmos o IA que toman decisiones sobre personas sin intervención humana
                (ej: aprobación de crédito, scoring).
              </p>

              {/* Switch igual al de Paso2 */}
              <div className="p4-switch-wrap">
                <button
                  type="button"
                  role="switch"
                  aria-checked={local.decisiones_automatizadas}
                  className={`p4-switch ${local.decisiones_automatizadas ? "p4-switch--on" : ""}`}
                  onClick={() => setLocal((prev) => ({ ...prev, decisiones_automatizadas: !prev.decisiones_automatizadas }))}
                >
                  <span className="p4-switch-thumb" />
                </button>
                <span className="p4-switch-label">
                  {local.decisiones_automatizadas ? "Sí" : "No"}
                </span>
              </div>
            </div>

          </div>{/* fin grid */}

          {/* ── Principios Ley 21.719 (panel colapsable) ─────── */}
          <div className={`p4-panel ${principiosAbierto ? "p4-panel--abierto" : ""}`}>
            <button type="button" className="p4-panel-header" onClick={() => setPrincipiosAbierto((v) => !v)}>
              <span className="p4-panel-icono">▼</span>
              <div className="p4-panel-textos">
                <span className="p4-panel-titulo">Principios de la Ley 21.719 <span className="p4-opcional">(opcional)</span></span>
                <span className="p4-panel-desc">Limitación del plazo, minimización, exactitud y cumplimiento demostrable</span>
              </div>
            </button>
            {principiosAbierto && (
              <div className="p4-panel-body">
                <div className="p4-panel-grid">
                  <div className="p4-campo-grupo">
                    <label className="p4-campo-label">Criterio para definir el plazo</label>
                    <select className="p4-select-campo" value={local.criterio_plazo} onChange={(e) => setLocal((p) => ({ ...p, criterio_plazo: e.target.value }))}>
                      <option value="">Seleccionar...</option>
                      {CRITERIOS_PLAZO.map((o) => <option key={o.valor} value={o.valor}>{o.etiqueta}</option>)}
                    </select>
                  </div>
                  <div className="p4-campo-grupo">
                    <label className="p4-campo-label">Evaluación periódica del tratamiento</label>
                    <select className="p4-select-campo" value={local.evaluacion_periodica} onChange={(e) => setLocal((p) => ({ ...p, evaluacion_periodica: e.target.value }))}>
                      <option value="">Seleccionar...</option>
                      {PERIODOS_EVALUACION.map((o) => <option key={o.valor} value={o.valor}>{o.etiqueta}</option>)}
                    </select>
                  </div>
                </div>
                <div className="p4-panel-grid">
                  <div className="p4-campo-grupo">
                    <label className="p4-campo-label">Método de eliminación de datos</label>
                    <select className="p4-select-campo" value={local.metodo_eliminacion} onChange={(e) => setLocal((p) => ({ ...p, metodo_eliminacion: e.target.value }))}>
                      <option value="">Seleccionar...</option>
                      {METODOS_ELIMINACION.map((o) => <option key={o.valor} value={o.valor}>{o.etiqueta}</option>)}
                    </select>
                  </div>
                  <div className="p4-campo-grupo p4-campo-grupo--centrado">
                    <label className={`p4-check-item ${local.documenta_destruccion ? "p4-check-item--marcado" : ""}`}>
                      <input type="checkbox" className="p4-check-input" checked={local.documenta_destruccion} onChange={(e) => setLocal((p) => ({ ...p, documenta_destruccion: e.target.checked }))} />
                      <span className="p4-check-texto">¿Se documenta la destrucción/eliminación de datos?</span>
                    </label>
                  </div>
                </div>
                <div className="p4-campo-grupo">
                  <label className="p4-campo-label">Excepciones al plazo de conservación</label>
                  <textarea className="p4-textarea-campo" rows={2} placeholder="Ej: datos retenidos por obligación legal más allá del plazo estándar..." value={local.excepciones_plazo} onChange={(e) => setLocal((p) => ({ ...p, excepciones_plazo: e.target.value }))} maxLength={1500} />
                </div>
                <div className="p4-panel-grid">
                  <div className="p4-campo-grupo">
                    <label className="p4-campo-label">¿Se aplica minimización de datos?</label>
                    <div className="p4-radio-grupo">
                      <label className="p4-radio-item">
                        <input type="radio" name="minimizacion_si_no" checked={local.minimizacion_si_no === true} onChange={() => setLocal((p) => ({ ...p, minimizacion_si_no: true }))} />
                        <span>Sí</span>
                      </label>
                      <label className="p4-radio-item">
                        <input type="radio" name="minimizacion_si_no" checked={local.minimizacion_si_no === false} onChange={() => setLocal((p) => ({ ...p, minimizacion_si_no: false }))} />
                        <span>No</span>
                      </label>
                    </div>
                    {local.minimizacion_si_no === true && (
                      <textarea className="p4-textarea-campo" style={{ marginTop: 6 }} rows={3} placeholder="¿Por qué son necesarios exactamente estos datos y no más?" value={local.minimizacion_justificacion} onChange={(e) => setLocal((p) => ({ ...p, minimizacion_justificacion: e.target.value }))} maxLength={1500} />
                    )}
                  </div>
                  <div className="p4-campo-grupo">
                    <label className="p4-campo-label">Mecanismos para garantizar exactitud</label>
                    <textarea className="p4-textarea-campo" rows={3} placeholder="Ej: validación automática, actualización periódica..." value={local.mecanismos_exactitud} onChange={(e) => setLocal((p) => ({ ...p, mecanismos_exactitud: e.target.value }))} maxLength={1500} />
                  </div>
                </div>
                <div className="p4-panel-grid">
                  <div className="p4-campo-grupo">
                    <label className="p4-campo-label">Medidas de cumplimiento demostrable</label>
                    <textarea className="p4-textarea-campo" rows={3} placeholder="Documentos, registros o procedimientos que evidencian el cumplimiento..." value={local.cumplimiento_demostrable} onChange={(e) => setLocal((p) => ({ ...p, cumplimiento_demostrable: e.target.value }))} maxLength={1500} />
                  </div>
                  <div className="p4-campo-grupo">
                    <label className="p4-campo-label">Incidentes históricos <span className="p4-opcional">(opcional)</span></label>
                    <textarea className="p4-textarea-campo" rows={3} placeholder="Registros de brechas de seguridad anteriores relevantes..." value={local.incidentes_historicos} onChange={(e) => setLocal((p) => ({ ...p, incidentes_historicos: e.target.value }))} maxLength={1500} />
                  </div>
                </div>
                <div className="p4-campo-grupo">
                  <label className="p4-campo-label">Cambios futuros previstos <span className="p4-opcional">(opcional)</span></label>
                  <textarea className="p4-textarea-campo" rows={2} placeholder="Cambios planificados en el tratamiento que podrían afectar el riesgo..." value={local.cambios_futuros} onChange={(e) => setLocal((p) => ({ ...p, cambios_futuros: e.target.value }))} maxLength={1500} />
                </div>
              </div>
            )}
          </div>

          {/* ── Evaluación de Impacto DPIA (panel colapsable) ── */}
          <div className={`p4-panel ${dpiaAbierto ? "p4-panel--abierto" : ""}`} style={{ marginTop: 12 }}>
            <button type="button" className="p4-panel-header" onClick={() => setDpiaAbierto((v) => !v)}>
              <span className="p4-panel-icono">▼</span>
              <div className="p4-panel-textos">
                <span className="p4-panel-titulo">Evaluación de Impacto (DPIA) <span className="p4-opcional">(opcional)</span></span>
                <span className="p4-panel-desc">Art. 68 Ley 21.719 — obligatoria en tratamientos de alto riesgo</span>
              </div>
            </button>
            {dpiaAbierto && (
              <div className="p4-panel-body">
                <label className={`p4-check-item ${local.requiere_dpia ? "p4-check-item--marcado" : ""}`} style={{ alignSelf: "flex-start" }}>
                  <input type="checkbox" className="p4-check-input" checked={local.requiere_dpia} onChange={(e) => setLocal((p) => ({ ...p, requiere_dpia: e.target.checked, dpia_realizada: null, dpia_detalle: "" }))} />
                  <span className="p4-check-texto">Este tratamiento requiere una DPIA</span>
                </label>
                {local.requiere_dpia && (
                  <>
                    <div className="p4-campo-grupo" style={{ marginTop: 12 }}>
                      <label className="p4-campo-label">¿Se ha realizado la DPIA?</label>
                      <div className="p4-radio-grupo">
                        <label className="p4-radio-item">
                          <input type="radio" name="dpia_realizada" checked={local.dpia_realizada === true} onChange={() => setLocal((p) => ({ ...p, dpia_realizada: true }))} />
                          <span>Sí</span>
                        </label>
                        <label className="p4-radio-item">
                          <input type="radio" name="dpia_realizada" checked={local.dpia_realizada === false} onChange={() => setLocal((p) => ({ ...p, dpia_realizada: false }))} />
                          <span>No</span>
                        </label>
                      </div>
                    </div>
                    <div className="p4-campo-grupo">
                      <label className="p4-campo-label">Detalles de la DPIA</label>
                      <textarea className="p4-textarea-campo" rows={4} placeholder="Fecha, responsable, conclusiones principales, medidas adoptadas..." value={local.dpia_detalle} onChange={(e) => setLocal((p) => ({ ...p, dpia_detalle: e.target.value }))} maxLength={3000} />
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* ── Acordeón de revisión ─────────────────────────── */}
          <div className={`p4-acordeon ${acordeonAbierto ? "p4-acordeon--abierto" : ""}`}>
            <button
              type="button"
              className="p4-acordeon-header"
              onClick={() => setAcordeonAbierto((v) => !v)}
            >
              <span className="p4-acordeon-icono">▼</span>
              <span className="p4-acordeon-titulo">Revisar todo antes de guardar</span>
            </button>

            {acordeonAbierto && (
              <div className="p4-acordeon-body">

                <div className="p4-revision-seccion">
                  <h4 className="p4-revision-titulo">Paso 1 — Identificación</h4>
                  <FilaRevision label="Nombre" valor={form.nombre} />
                  <FilaRevision label="Proceso asociado" valor={form.proceso_asociado} />
                  <FilaRevision label="Responsable" valor={form.responsable} />
                  <FilaRevision label="Área responsable" valor={form.subarea_responsable} />
                  <FilaRevision
                    label="Descripción detallada"
                    valor={(form.datos_tratados || []).filter((b) => b.categoria_dato || b.se_tratan || b.para_que || b.como).length > 0
                      ? `${form.datos_tratados.length} bloque(s): ${form.datos_tratados.map((b) => b.categoria_dato || "sin categoría").join(", ")}`
                      : null}
                  />
                  <FilaRevision label="Procesos relacionados" valor={form.procesos_relacionados} />
                  <FilaRevision label="Finalidades secundarias" valor={form.finalidades_secundarias} />
                </div>

                <div className="p4-revision-seccion">
                  <h4 className="p4-revision-titulo">Paso 4 — Principio 1 (Licitud y transparencia)</h4>
                  <FilaRevision label="Base legal" valor={(form.base_legal || "").split(",").filter(Boolean).map((v) => ETIQ_BASE_LEGAL[v] || v).join(", ")} />
                  <FilaRevision
                    label="Base legal adicional"
                    valor={(form.base_legal_detalle || []).filter(Boolean).length > 0
                      ? form.base_legal_detalle.filter(Boolean).join(" · ")
                      : null}
                  />
                  <FilaRevision label="¿Asegura licitud y transparencia?" valor={form.asegura_transparencia_detalle} />
                  <FilaRevision label="¿Se informa a titulares?" valor={form.informa_titulares_si_no === true ? "Sí" : form.informa_titulares_si_no === false ? "No" : null} />
                  {form.informa_titulares_si_no === true && (
                    <FilaRevision
                      label="¿Cómo se informa a los titulares?"
                      valor={(form.informa_titulares || []).map((v) => ETIQ_INFORMA_TITULARES[v] || v).join(", ")}
                    />
                  )}
                  <FilaRevision
                    label="Documento de respaldo"
                    valor={form.documento_respaldo_tiene === true
                      ? `Sí — ${form.documento_respaldo_descripcion || "sin descripción"}`
                      : form.documento_respaldo_tiene === false ? "No" : null}
                  />
                </div>

                <div className="p4-revision-seccion">
                  <h4 className="p4-revision-titulo">Paso 4 — Principio 2 (Finalidad)</h4>
                  <FilaRevision label="Finalidad" valor={form.finalidad} />
                  <FilaRevision label="¿Todos los datos tienen finalidad y son necesarios?" valor={form.finalidad_todos_necesarios === true ? "Sí" : form.finalidad_todos_necesarios === false ? "No" : null} />
                  <FilaRevision label="¿Todos los datos tienen la misma finalidad?" valor={form.finalidad_misma === true ? "Sí" : form.finalidad_misma === false ? "No" : null} />
                  <FilaRevision label="¿Se usan solo para fines declarados?" valor={form.usa_solo_fines_declarados === true ? "Sí" : form.usa_solo_fines_declarados === false ? "No" : null} />
                </div>

                <div className="p4-revision-seccion">
                  <h4 className="p4-revision-titulo">Paso 2 — Datos y titulares</h4>
                  <FilaRevision
                    label="Categorías de titulares"
                    valor={(form.categorias_titulares || []).map((id) => ETIQ_TITULARES[id] || id).join(", ")}
                  />
                  <FilaRevision label="Universo de titulares" valor={form.universo_titulares} />
                  <FilaRevision label="Origen de los datos" valor={(form.origen_datos || "").split(",").filter(Boolean).map((v) => ETIQ_ORIGEN[v] || v).join(", ")} />
                  <FilaRevision
                    label="Categorías de datos"
                    valor={categoriasDatos.map((id) => ETIQ_CATEGORIAS[id] || id).join(", ")}
                  />
                  <FilaRevision
                    label="¿Datos sensibles?"
                    valor={form.datos_sensibles ? "Sí" : "No"}
                  />
                  {form.datos_sensibles && categoriasSensibles.length > 0 && (
                    <FilaRevision
                      label="Tipos sensibles"
                      valor={categoriasSensibles.map((id) => ETIQ_SENSIBLES[id] || id).join(", ")}
                    />
                  )}
                  <FilaRevision label="¿Incluye NNA?" valor={form.incluye_nna ? "Sí" : "No"} />
                  <FilaRevision label="¿Datos de navegación?" valor={form.datos_navegacion ? "Sí" : "No"} />
                  {form.datos_navegacion && (
                    <FilaRevision label="Detalle navegación" valor={form.datos_navegacion_detalle} />
                  )}
                </div>

                <div className="p4-revision-seccion">
                  <h4 className="p4-revision-titulo">Paso 3 — Transferencias y sistemas</h4>
                  <FilaRevision label="Destinatarios" valor={form.destinatarios} />
                  <FilaRevision label="Destinatarios internos" valor={form.destinatarios_internos} />
                  <FilaRevision label="Destinatarios nacionales" valor={form.destinatarios_nacionales} />
                  <FilaRevision label="Destinatarios internacionales" valor={form.destinatarios_internacionales} />
                  <FilaRevision label="Base legal transferencia internacional" valor={form.base_legal_transferencia_internacional} />
                  <FilaRevision label="Sale al extranjero" valor={form.sale_extranjero ? `Sí — ${form.pais_destino || "país no especificado"}` : "No"} />
                  <FilaRevision label="¿Terceros son encargados?" valor={form.terceros_son_encargados ? "Sí" : "No"} />
                  <FilaRevision label="¿Contratos de protección?" valor={form.contratos_proteccion_datos ? "Sí" : "No"} />
                  {form.contratos_proteccion_datos && (
                    <FilaRevision label="Detalle contratos" valor={form.contratos_proteccion_datos_detalle} />
                  )}
                  <FilaRevision
                    label="Método de transferencia"
                    valor={(form.metodo_transferencia || []).map((v) => ETIQ_METODO_TRANSFERENCIA[v] || v).join(", ")}
                  />
                  <FilaRevision label="Detalle método de transferencia" valor={form.metodo_transferencia_detalle} />
                  <FilaRevision label="Sistema origen" valor={form.sistemas_origen} />
                  <FilaRevision label="Sistema destino" valor={form.sistemas_destino} />
                  <FilaRevision label="Sistema tratamiento" valor={form.sistemas_tratamiento} />
                  <FilaRevision
                    label="Tipos de tratamiento en sistema"
                    valor={(form.tipos_tratamiento_sistema || []).map((v) => ETIQ_TIPOS_TRATAMIENTO[v] || v).join(", ")}
                  />
                  <FilaRevision label="Base de datos" valor={form.base_datos_nombre} />
                  <FilaRevision label="Proveedor tecnológico" valor={form.proveedor_tecnologico} />
                </div>

                <div className="p4-revision-seccion">
                  <h4 className="p4-revision-titulo">Paso 4 — Seguridad y conservación</h4>
                  <FilaRevision
                    label="Plazo"
                    valor={local.plazo_conservacion === "otro"
                      ? `Otro: ${local.plazo_otro}`
                      : ETIQ_PLAZO[local.plazo_conservacion]}
                  />
                  <FilaRevision
                    label="Medidas de seguridad"
                    valor={local.medidas_seguridad.map((id) => ETIQ_MEDIDAS[id] || id).join(", ")}
                  />
                  {local.medidas_seguridad.includes("otras") && local.otras_medidas && (
                    <FilaRevision label="Otras medidas" valor={local.otras_medidas} />
                  )}
                  <FilaRevision label="Decisiones automatizadas" valor={local.decisiones_automatizadas ? "Sí" : "No"} />
                </div>

                <div className="p4-revision-seccion">
                  <h4 className="p4-revision-titulo">Paso 4 — Principios Ley 21.719</h4>
                  <FilaRevision label="Criterio de plazo" valor={ETIQ_CRITERIO_PLAZO[local.criterio_plazo]} />
                  <FilaRevision label="Método de eliminación" valor={ETIQ_METODO_ELIMINACION[local.metodo_eliminacion]} />
                  <FilaRevision label="¿Documenta destrucción?" valor={local.documenta_destruccion ? "Sí" : "No"} />
                  <FilaRevision label="Excepciones al plazo" valor={local.excepciones_plazo} />
                  <FilaRevision label="Evaluación periódica" valor={ETIQ_EVALUACION_PERIODICA[local.evaluacion_periodica]} />
                  <FilaRevision label="¿Se aplica minimización de datos?" valor={local.minimizacion_si_no === true ? "Sí" : local.minimizacion_si_no === false ? "No" : null} />
                  <FilaRevision label="Justificación minimización" valor={local.minimizacion_justificacion} />
                  <FilaRevision label="Mecanismos de exactitud" valor={local.mecanismos_exactitud} />
                  <FilaRevision label="Cumplimiento demostrable" valor={local.cumplimiento_demostrable} />
                </div>

                <div className="p4-revision-seccion">
                  <h4 className="p4-revision-titulo">Paso 4 — DPIA</h4>
                  <FilaRevision label="¿Requiere DPIA?" valor={local.requiere_dpia ? "Sí" : "No"} />
                  {local.requiere_dpia && (
                    <>
                      <FilaRevision label="¿DPIA realizada?" valor={local.dpia_realizada === true ? "Sí" : local.dpia_realizada === false ? "No" : null} />
                      <FilaRevision label="Detalle DPIA" valor={local.dpia_detalle} />
                    </>
                  )}
                </div>

                {camposDetectados.length > 0 && (
                  <div className="p4-revision-seccion">
                    <h4 className="p4-revision-titulo">Campos detectados ({camposDetectados.length})</h4>
                    <div className="p4-campos-tabla">
                      {camposDetectados.map((c, i) => (
                        <div key={i} className="p4-campos-fila">
                          <span className="p4-campo-nombre">{c.nombre_columna}</span>
                          <span className="p4-campo-tipo">{c.tipo || "—"}</span>
                          <span className={`p4-campo-badge ${c.es_sensible ? "p4-campo-badge--sensible" : ""}`}>
                            {c.es_sensible ? "Sensible" : "Personal"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>

          {error && <p className="p4-error">{error}</p>}

          {/* ── Toast borrador guardado ── */}
          {borradorOk && (
            <div className="p4-toast-borrador">
              <span className="p4-toast-texto">✓ Borrador guardado correctamente.</span>
              <div className="p4-toast-acciones">
                <button className="p4-toast-btn p4-toast-btn--dashboard" onClick={() => navigate("/dashboard")}>
                  Ir al dashboard
                </button>
                <button className="p4-toast-btn p4-toast-btn--continuar" onClick={() => setBorradorOk(false)}>
                  Continuar aquí
                </button>
              </div>
            </div>
          )}

          {!puedeGuardar && (
            <p className="p4-error" style={{ marginBottom: 0 }}>
              Completa Finalidad y Base legal (Principio 2, arriba) para poder guardar.
            </p>
          )}

          {/* ── Navegación ───────────────────────────────────── */}
          <div className="p4-navegacion">
            <div className="p4-nav-izquierda">
              {!esEdicion && (
                <button
                  className="p4-btn p4-btn--borrador"
                  onClick={handleGuardarBorrador}
                  disabled={guardandoBorrador || guardando}
                >
                  {guardandoBorrador ? "Guardando..." : "Guardar borrador"}
                </button>
              )}
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button className="p4-btn p4-btn--anterior" onClick={handleAnterior} disabled={guardando || guardandoBorrador}>
                ← Atrás
              </button>
              <button
                className={`p4-btn p4-btn--guardar ${guardando ? "p4-btn--cargando" : ""}`}
                onClick={handleGuardar}
                disabled={guardando || guardandoBorrador || !puedeGuardar}
              >
                {guardando
                  ? "Guardando..."
                  : esEdicion
                  ? "Actualizar RAT"
                  : form.actividadesPendientes.length > 0 &&
                    form.actividadActual + 1 < form.actividadesPendientes.length
                  ? "Guardar y continuar →"
                  : "Guardar"}
              </button>
            </div>
          </div>

        </div>{/* fin card */}
      </main>
    </div>
  );
}

/* ─── Fila del acordeón ──────────────────────────────────────── */
function FilaRevision({ label, valor }) {
  return (
    <div className="p4-fila-revision">
      <span className="p4-fila-label">{label}</span>
      <span className={`p4-fila-valor ${!valor ? "p4-fila-valor--vacio" : ""}`}>
        {valor || "No especificado"}
      </span>
    </div>
  );
}
