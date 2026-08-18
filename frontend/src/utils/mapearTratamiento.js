// Mapeo compartido: respuesta de GET /tratamientos/{id} (o cualquier objeto
// de tratamiento con la misma forma) -> objeto plano para el FormularioContext.
//
// R9.4b: antes vivía duplicado a mano en EditarTratamiento.jsx y (a medias,
// desactualizado) en DashboardCliente.jsx/continuarBorrador - cada campo
// nuevo de detalle_extendido había que agregarlo en 2 lugares, y uno de los
// dos siempre se olvidaba. Ahora hay una sola función: quien la llama solo
// agrega encima los campos propios de su flujo (modoEdicion, sesionActual...).

export function parsearMedidas(str) {
  if (!str) return { medidas: [], otras: "" }
  const partes = str.split(",")
  const medidas = []
  let otras = ""
  for (const p of partes) {
    if (p.startsWith("otras:")) {
      medidas.push("otras")
      otras = p.slice(6)
    } else {
      medidas.push(p.trim())
    }
  }
  return { medidas, otras }
}

export function mapearTratamientoAForm(data) {
  const ext = data.detalle_extendido || {}
  const det = data.detalle || {}
  const { medidas, otras } = parsearMedidas(data.medidas_seguridad)
  const docRespaldo = ext.documento_respaldo_permiso

  return {
    // ── Paso 1 ──────────────────────────────────────────
    nombre: data.nombre || "",
    responsable: det.responsable_tratamiento || "",
    es_responsable: det.es_responsable ?? true,
    finalidad: data.finalidad || "",
    base_legal: data.base_legal || "",
    // Paso 1 extendidos
    descripcion_detallada: ext.descripcion_detallada || "",
    proceso_asociado: ext.proceso_asociado || "",
    datos_tratados: (data.datos_tratados || []).map((b) => ({
      categoria_dato: b.categoria_dato || "",
      se_tratan: b.se_tratan || "",
      para_que: b.para_que || "",
      como: b.como || "",
    })),
    base_legal_detalle: (data.base_legal_detalle || []).map((b) => b.descripcion || ""),
    subarea_responsable: ext.subarea_responsable || "",
    procesos_relacionados: ext.procesos_relacionados || "",
    finalidades_secundarias: ext.finalidades_secundarias || "",
    informa_titulares: ext.informa_titulares ? ext.informa_titulares.split(",").filter(Boolean) : [],
    documento_respaldo_tiene: docRespaldo === "No" ? false : docRespaldo != null ? true : null,
    documento_respaldo_descripcion: (docRespaldo && docRespaldo !== "Sí" && docRespaldo !== "No") ? docRespaldo : "",
    // Principios 1 y 2 (R9.5)
    asegura_transparencia_detalle: ext.asegura_transparencia_detalle || "",
    informa_titulares_si_no: ext.informa_titulares_si_no ?? null,
    finalidad_todos_necesarios: ext.finalidad_todos_necesarios ?? null,
    finalidad_misma: ext.finalidad_misma ?? null,
    usa_solo_fines_declarados: ext.usa_solo_fines_declarados ?? null,
    minimizacion_si_no: ext.minimizacion_si_no ?? null,
    // ── Paso 2 ──────────────────────────────────────────
    categorias_titulares: det.categorias_titulares ? det.categorias_titulares.split(",").filter(Boolean) : [],
    universo_titulares: det.universo_titulares || "",
    origen_datos: det.origen_datos || "",
    categoria_datos: det.categoria_datos || "",
    datos_sensibles: data.datos_sensibles ?? false,
    sale_extranjero: data.sale_extranjero ?? false,
    // Paso 2 extendidos
    incluye_nna: ext.incluye_nna ?? false,
    nna_detalle: ext.nna_detalle || "",
    datos_navegacion: ext.datos_navegacion ?? false,
    datos_navegacion_detalle: ext.datos_navegacion_detalle || "",
    // R9.3: descripción de datos sensibles + 3 secciones nuevas de Paso 2
    datos_sensibles_descripcion: ext.datos_sensibles_descripcion || "",
    otros_datos: ext.otros_datos || "",
    datos_academicos_laborales: ext.datos_academicos_laborales || "",
    datos_financieros_patrimoniales: ext.datos_financieros_patrimoniales || "",
    origen_sistemico_datos: ext.origen_sistemico_datos || "",
    destinatarios_internos: ext.destinatarios_internos || "",
    destinatarios_nacionales: ext.destinatarios_nacionales || "",
    destinatarios_internacionales: ext.destinatarios_internacionales || "",
    base_legal_transferencia_internacional: ext.base_legal_transferencia_internacional || "",
    terceros_son_encargados: ext.terceros_son_encargados ?? false,
    contratos_proteccion_datos: ext.contratos_proteccion_datos ?? false,
    contratos_proteccion_datos_detalle: ext.contratos_proteccion_datos_detalle || "",
    datos_transferidos_detalle: ext.datos_transferidos_detalle || "",
    metodo_transferencia: ext.metodo_transferencia ? ext.metodo_transferencia.split(",").filter(Boolean) : [],
    metodo_transferencia_detalle: ext.metodo_transferencia_detalle || "",
    sistemas_origen: ext.sistemas_origen || "",
    sistemas_destino: ext.sistemas_destino || "",
    sistemas_tratamiento: ext.sistemas_tratamiento || "",
    tipos_tratamiento_sistema: ext.tipos_tratamiento_sistema ? ext.tipos_tratamiento_sistema.split(",").filter(Boolean) : [],
    base_datos_nombre: ext.base_datos_nombre || "",
    proveedor_tecnologico: ext.proveedor_tecnologico || "",
    // Campos calculados
    pais_destino: ext.pais_destino || "",
    categorias_sensibles: ext.categorias_sensibles ? ext.categorias_sensibles.split(",").filter(Boolean) : [],
    categorias_datos: ext.categorias_datos_seleccion ? ext.categorias_datos_seleccion.split(",").filter(Boolean) : [],
    // ── Paso 3 ──────────────────────────────────────────
    plazo_conservacion: data.plazo_conservacion || "",
    plazo_otro: data.plazo_otro || "",
    medidas_seguridad: medidas,
    otras_medidas: otras,
    decisiones_automatizadas: data.decisiones_automatizadas ?? false,
    // Principios Ley 21.719
    criterio_plazo: ext.criterio_plazo || "",
    metodo_eliminacion: ext.metodo_eliminacion || "",
    documenta_destruccion: ext.documenta_destruccion ?? false,
    excepciones_plazo: ext.excepciones_plazo || "",
    minimizacion_justificacion: ext.minimizacion_justificacion || "",
    mecanismos_exactitud: ext.mecanismos_exactitud || "",
    evaluacion_periodica: ext.evaluacion_periodica || "",
    cumplimiento_demostrable: ext.cumplimiento_demostrable || "",
    incidentes_historicos: ext.incidentes_historicos || "",
    cambios_futuros: ext.cambios_futuros || "",
    // DPIA
    requiere_dpia: ext.requiere_dpia ?? false,
    dpia_realizada: ext.dpia_realizada ?? null,
    dpia_detalle: ext.dpia_detalle || "",
  }
}
