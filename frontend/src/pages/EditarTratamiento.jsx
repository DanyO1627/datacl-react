import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useFormulario } from '../context/FormularioContext'
import BarraLateral from '../components/BarraLateral'
import '../styles/editarTratamiento.css'

const API = 'http://localhost:8000'

function parsearMedidas(str) {
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

export default function EditarTratamiento() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { token } = useAuth()
  const { cargarFormCompleto } = useFormulario()
  const [error, setError] = useState('')

  useEffect(() => {
    async function cargar() {
      try {
        const res = await fetch(`${API}/tratamientos/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error('No encontrado')
        const data = await res.json()
        const ext = data.detalle_extendido || {}
        const det = data.detalle || {}
        const { medidas, otras } = parsearMedidas(data.medidas_seguridad)
        const docRespaldo = ext.documento_respaldo_permiso

        cargarFormCompleto({
          modoEdicion: true,
          tratamientoEditId: Number(id),
          // ── Paso 1 ──────────────────────────────────────────
          nombre: data.nombre || "",
          responsable: det.responsable_tratamiento || "",
          es_responsable: det.es_responsable ?? true,
          departamento: det.departamento || "",
          finalidad: data.finalidad || "",
          base_legal: data.base_legal || "",
          // Paso 1 extendidos
          descripcion_detallada: ext.descripcion_detallada || "",
          subarea_responsable: ext.subarea_responsable || "",
          procesos_relacionados: ext.procesos_relacionados || "",
          finalidades_secundarias: ext.finalidades_secundarias || "",
          informa_titulares: ext.informa_titulares ? ext.informa_titulares.split(",").filter(Boolean) : [],
          documento_respaldo_tiene: docRespaldo != null ? true : null,
          documento_respaldo_descripcion: (docRespaldo && docRespaldo !== "Sí") ? docRespaldo : "",
          // ── Paso 2 ──────────────────────────────────────────
          categorias_titulares: det.categorias_titulares ? det.categorias_titulares.split(",").filter(Boolean) : [],
          universo_titulares: det.universo_titulares || "",
          origen_datos: det.origen_datos || "",
          categoria_datos: det.categoria_datos || "",
          datos_sensibles: data.datos_sensibles ?? false,
          destinatarios: data.destinatarios || "",
          sale_extranjero: data.sale_extranjero ?? false,
          // Paso 2 extendidos
          incluye_nna: ext.incluye_nna ?? false,
          nna_detalle: ext.nna_detalle || "",
          datos_navegacion: ext.datos_navegacion ?? false,
          datos_navegacion_detalle: ext.datos_navegacion_detalle || "",
          destinatarios_internos: ext.destinatarios_internos || "",
          destinatarios_nacionales: ext.destinatarios_nacionales || "",
          destinatarios_internacionales: ext.destinatarios_internacionales || "",
          terceros_son_encargados: ext.terceros_son_encargados ?? false,
          contratos_proteccion_datos: ext.contratos_proteccion_datos ?? false,
          contratos_proteccion_datos_detalle: ext.contratos_proteccion_datos_detalle || "",
          datos_transferidos_detalle: ext.datos_transferidos_detalle || "",
          metodo_transferencia: ext.metodo_transferencia ? ext.metodo_transferencia.split(",").filter(Boolean) : [],
          sistemas_origen: ext.sistemas_origen || "",
          sistemas_destino: ext.sistemas_destino || "",
          sistemas_tratamiento: ext.sistemas_tratamiento || "",
          tipos_tratamiento_sistema: ext.tipos_tratamiento_sistema ? ext.tipos_tratamiento_sistema.split(",").filter(Boolean) : [],
          base_datos_nombre: ext.base_datos_nombre || "",
          proveedor_tecnologico: ext.proveedor_tecnologico || "",
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
        })

        navigate('/nuevo-tratamiento', { replace: true })
      } catch {
        setError('No se pudo cargar el tratamiento.')
      }
    }
    cargar()
  }, [id, token])

  if (error) {
    return (
      <div className="editar-layout">
        <BarraLateral />
        <main className="editar-main">
          <p className="editar-error">{error}</p>
          <button className="btn-anterior" onClick={() => navigate(-1)}>Volver</button>
        </main>
      </div>
    )
  }

  return (
    <div className="editar-layout">
      <BarraLateral />
      <main className="editar-main">
        <div className="editar-cargando">Cargando tratamiento...</div>
      </main>
    </div>
  )
}
