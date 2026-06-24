import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import BarraLateral from '../components/BarraLateral'
import { descargarInforme } from '../services/informesService'
import '../styles/historialVersiones.css'

const API = 'http://localhost:8000'

// ── Mapas de colores (mismo criterio que DetalleTratamiento) ──────────────

const COLOR_RIESGO = {
  BAJO:  { clase: 'hv-riesgo-bajo',  etiqueta: 'Riesgo bajo' },
  MEDIO: { clase: 'hv-riesgo-medio', etiqueta: 'Riesgo medio' },
  ALTO:  { clase: 'hv-riesgo-alto',  etiqueta: 'Riesgo alto' },
}

const COLOR_ESTADO = {
  PENDIENTE: { clase: 'hv-estado-pendiente', etiqueta: 'Pendiente' },
  COMPLETO:  { clase: 'hv-estado-completo',  etiqueta: 'Completo' },
  BORRADOR:  { clase: 'hv-estado-pendiente', etiqueta: 'Borrador' },
}

// Etiquetas legibles para los nombres técnicos de campos_modificados
const ETIQUETAS_CAMPOS = {
  // Campos principales del tratamiento
  nombre: 'Nombre',
  finalidad: 'Finalidad',
  base_legal: 'Base legal',
  datos_sensibles: 'Datos sensibles',
  destinatarios: 'Destinatarios',
  plazo_conservacion: 'Plazo de conservación',
  plazo_otro: 'Plazo (otro)',
  medidas_seguridad: 'Medidas de seguridad',
  sale_extranjero: 'Transferencia internacional',
  decisiones_automatizadas: 'Decisiones automatizadas',
  nivel_riesgo: 'Nivel de riesgo',
  estado: 'Estado',
  // Detalle RAT
  categoria_datos: 'Categoría de datos',
  categorias_titulares: 'Categorías de titulares',
  universo_titulares: 'Universo de titulares',
  origen_datos: 'Origen de los datos',
  responsable_tratamiento: 'Responsable',
  departamento: 'Departamento',
  es_responsable: 'Rol del responsable',
  // Detalle extendido — Identificación
  descripcion_detallada: 'Descripción detallada',
  subarea_responsable: 'Subárea responsable',
  procesos_relacionados: 'Procesos relacionados',
  finalidades_secundarias: 'Finalidades secundarias',
  informa_titulares: 'Información a titulares',
  documento_respaldo_permiso: 'Documento de respaldo',
  // Detalle extendido — Datos y transferencias
  datos_navegacion: 'Datos de navegación',
  incluye_nna: 'Incluye datos de menores (NNA)',
  nna_detalle: 'Detalle NNA',
  destinatarios_internos: 'Destinatarios internos',
  destinatarios_nacionales: 'Destinatarios nacionales',
  destinatarios_internacionales: 'Destinatarios internacionales',
  terceros_son_encargados: 'Terceros son encargados',
  contratos_proteccion_datos: 'Contratos de protección de datos',
  datos_transferidos_detalle: 'Datos transferidos (detalle)',
  metodo_transferencia: 'Método de transferencia',
  // Detalle extendido — Sistemas
  sistemas_origen: 'Sistemas de origen',
  sistemas_destino: 'Sistemas de destino',
  sistemas_tratamiento: 'Sistemas de tratamiento',
  tipos_tratamiento_sistema: 'Tipos de tratamiento en sistema',
  base_datos_nombre: 'Base de datos',
  proveedor_tecnologico: 'Proveedor tecnológico',
  // Detalle extendido — Principios Ley 21.719
  criterio_plazo: 'Criterio del plazo',
  metodo_eliminacion: 'Método de eliminación',
  documenta_destruccion: 'Documenta destrucción',
  excepciones_plazo: 'Excepciones al plazo',
  minimizacion_justificacion: 'Justificación de minimización',
  mecanismos_exactitud: 'Mecanismos de exactitud',
  evaluacion_periodica: 'Evaluación periódica',
  cumplimiento_demostrable: 'Cumplimiento demostrable',
  incidentes_historicos: 'Incidentes históricos',
  cambios_futuros: 'Cambios futuros',
  // Detalle extendido — DPIA
  requiere_dpia: 'Requiere DPIA',
  dpia_realizada: 'DPIA realizada',
  dpia_detalle: 'Detalle DPIA',
}

function etiquetaCampo(campo) {
  return ETIQUETAS_CAMPOS[campo] || campo
}

const INFORMA_TITULARES = {
  web: "Aviso en web", correo: "Correo electrónico",
  contrato: "Contrato", mandato: "Mandato", no_informa: "No se informa",
}

function traducirValor(campo, valor) {
  if (valor == null || valor === '') return '—'
  if (campo === 'informa_titulares') {
    return valor.split(',').filter(Boolean).map(v => INFORMA_TITULARES[v.trim()] || v.trim()).join(', ')
  }
  return valor
}

// ── Helpers ─────────────────────────────────────────────────────────────

function getIniciales(nombre) {
  if (!nombre) return '—'
  if (nombre.includes('@')) return nombre[0].toUpperCase()
  const partes = nombre.trim().split(/\s+/).filter(Boolean)
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase()
  return (partes[0][0] + partes[1][0]).toUpperCase()
}

function formatearFecha(fechaStr, conHora = true) {
  if (!fechaStr) return '—'
  const fecha = new Date(fechaStr)
  const opciones = { year: 'numeric', month: 'long', day: 'numeric' }
  if (conHora) {
    opciones.hour = '2-digit'
    opciones.minute = '2-digit'
  }
  return fecha.toLocaleDateString('es-CL', opciones)
}

// ── Componente principal ───────────────────────────────────────────────

export default function HistorialVersiones() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { token, usuario } = useAuth()

  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [tratamiento, setTratamiento] = useState(null)
  const [versiones, setVersiones] = useState([])

  const [busqueda, setBusqueda] = useState('')
  const [filtroPersona, setFiltroPersona] = useState('TODOS')
  const [versionDetalle, setVersionDetalle] = useState(null)

  // Cada "Ver" trae el snapshot completo de esa versión a demanda
  const [cargandoVersion, setCargandoVersion] = useState(null)
  const [generandoPDF, setGenerandoPDF] = useState(false)

  useEffect(() => {
    async function cargar() {
      try {
        const [resTrat, resVer] = await Promise.all([
          fetch(`${API}/tratamientos/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API}/tratamientos/${id}/versiones`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ])
        if (!resTrat.ok) throw new Error('No encontrado')
        setTratamiento(await resTrat.json())
        // El backend ya devuelve las versiones ordenadas desc por numero_version
        setVersiones(resVer.ok ? await resVer.json() : [])
      } catch {
        setError('No se pudo cargar el historial de versiones.')
      } finally {
        setCargando(false)
      }
    }
    cargar()
  }, [id, token])

  // La versión con mayor numero_version (primera del arreglo) es la vigente
  const vigenteVersion = versiones[0] || null
  const anteriores = versiones.slice(1)

  const personas = useMemo(() => {
    return [...new Set(anteriores.map((v) => v.modificado_por).filter(Boolean))]
  }, [anteriores])

  const anterioresFiltradas = anteriores.filter((v) => {
    const texto = busqueda.trim().toLowerCase()
    const coincideBusqueda =
      !texto ||
      v.descripcion_cambio?.toLowerCase().includes(texto) ||
      v.modificado_por?.toLowerCase().includes(texto) ||
      v.campos_modificados?.some((c) => etiquetaCampo(c.campo).toLowerCase().includes(texto))
    const coincidePersona = filtroPersona === 'TODOS' || v.modificado_por === filtroPersona
    return coincideBusqueda && coincidePersona
  })

  async function descargarPDF() {
    setGenerandoPDF(true)
    try {
      const res = await fetch(`${API}/informes/generar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ids_tratamientos: [Number(id)] }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.detail || 'No se pudo generar el PDF.')
      }
      const informe = await res.json()
      await descargarInforme(informe.id, usuario?.nombre)
    } catch (e) {
      alert(e.message || 'No se pudo generar el PDF.')
    } finally {
      setGenerandoPDF(false)
    }
  }

  async function verVersion(numero) {
    setCargandoVersion(numero)
    try {
      const res = await fetch(`${API}/tratamientos/${id}/versiones/${numero}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error()
      const detalle = await res.json()
      setVersionDetalle(detalle)
    } catch {
      alert('No se pudo cargar el detalle de esta versión.')
    } finally {
      setCargandoVersion(null)
    }
  }

  if (cargando) {
    return (
      <div className="hv-layout">
        <BarraLateral />
        <main className="hv-main">
          <div className="hv-cargando">Cargando historial de versiones...</div>
        </main>
      </div>
    )
  }

  if (error || !tratamiento) {
    return (
      <div className="hv-layout">
        <BarraLateral />
        <main className="hv-main">
          <p className="hv-error">{error || 'No se pudo cargar el tratamiento.'}</p>
          <Link to="/mis-tratamientos" className="hv-volver">← Volver a mis tratamientos</Link>
        </main>
      </div>
    )
  }

  const riesgoVigente = COLOR_RIESGO[tratamiento.nivel_riesgo] || COLOR_RIESGO.BAJO
  const estadoVigente = COLOR_ESTADO[tratamiento.estado] || COLOR_ESTADO.PENDIENTE

  return (
    <>
    <div className="hv-layout">
      <BarraLateral />

      <main className="hv-main">

        {/* Breadcrumb */}
        <nav className="hv-breadcrumb">
          <Link to="/mis-tratamientos">Mis tratamientos</Link>
          <span>/</span>
          <Link to={`/tratamientos/${id}`}>{tratamiento.nombre}</Link>
          <span>/</span>
          <span>Historial de versiones</span>
        </nav>

        <h1 className="hv-titulo">RAT — {tratamiento.nombre}</h1>
        <p className="hv-subtitulo">
          Historial completo de modificaciones realizadas a este tratamiento de datos.
        </p>

        {/* Metadata */}
        <div className="hv-metadata">
          <div className="hv-metadata-item">
            <span className="hv-metadata-label">Creado el</span>
            <span className="hv-metadata-valor">{formatearFecha(tratamiento.creado_en, false)}</span>
          </div>
          <div className="hv-metadata-item">
            <span className="hv-metadata-label">Responsable</span>
            <span className="hv-metadata-valor">{tratamiento.detalle?.responsable_tratamiento || '—'}</span>
          </div>
          <div className="hv-metadata-item">
            <span className="hv-metadata-label">Total de versiones</span>
            <span className="hv-metadata-valor">{versiones.length}</span>
          </div>
          <div className="hv-metadata-item">
            <span className="hv-metadata-label">Última modificación</span>
            <span className="hv-metadata-valor">
              {formatearFecha(vigenteVersion?.creado_en || tratamiento.actualizado_en || tratamiento.creado_en)}
            </span>
          </div>
        </div>

        {/* Versión vigente */}
        <div className="hv-vigente-card">
          <div className="hv-vigente-header">
            <span className="hv-vigente-tag">
              VERSIÓN VIGENTE{vigenteVersion ? ` — V${vigenteVersion.numero_version}` : ''}
            </span>
            <div className="hv-vigente-badges">
              <span className={`hv-badge ${riesgoVigente.clase}`}>{riesgoVigente.etiqueta}</span>
              <span className={`hv-badge ${estadoVigente.clase}`}>{estadoVigente.etiqueta}</span>
              {tratamiento.sale_extranjero && (
                <span className="hv-badge hv-badge-internacional">Transferencia internacional</span>
              )}
            </div>
          </div>

          <h2 className="hv-vigente-nombre">{tratamiento.nombre}</h2>
          <p className="hv-vigente-base-legal">Base legal: {tratamiento.base_legal || '—'}</p>
          <p className="hv-vigente-modificado">
            {vigenteVersion
              ? <>Última modificación por <strong>{vigenteVersion.modificado_por || '—'}</strong> el {formatearFecha(vigenteVersion.creado_en)}</>
              : 'Aún no se ha generado ninguna versión de este RAT.'
            }
          </p>

          <div className="hv-vigente-acciones">
            <button className="hv-btn hv-btn-secundario" onClick={descargarPDF} disabled={generandoPDF}>
              {generandoPDF ? 'Generando PDF...' : 'Descargar PDF'}
            </button>
            <button className="hv-btn hv-btn-secundario" onClick={() => navigate(`/tratamientos/${id}/editar`)}>
              Editar
            </button>
            <button className="hv-btn hv-btn-primario" onClick={() => navigate(`/tratamientos/${id}`)}>
              Ver RAT completo
            </button>
          </div>
        </div>

        {/* Banner informativo */}
        <div className="hv-info-banner">
          Cada vez que se guarda una modificación de este tratamiento se genera una nueva versión.
          Aquí puedes revisar el detalle de cada cambio realizado a lo largo del tiempo.
        </div>

        {/* Versiones anteriores */}
        <section className="hv-anteriores">
          <div className="hv-anteriores-header">
            <h2 className="hv-anteriores-titulo">Versiones anteriores</h2>
            {anteriores.length > 0 && (
              <input
                className="hv-buscador"
                type="text"
                placeholder="Buscar por descripción, persona o campo..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            )}
          </div>

          {versiones.length === 0 ? (
            <p className="hv-vacio">
              Este tratamiento aún no tiene versiones registradas. Las versiones se generan
              automáticamente cada vez que el RAT se guarda.
            </p>
          ) : anteriores.length === 0 ? (
            <p className="hv-vacio">Aún no hay versiones anteriores. Esta es la primera versión del RAT.</p>
          ) : (
            <>
              <div className="hv-filtros-pills">
                <button
                  className={`hv-pill ${filtroPersona === 'TODOS' ? 'hv-pill-activa' : ''}`}
                  onClick={() => setFiltroPersona('TODOS')}
                >
                  Todos
                </button>
                {personas.map((p) => (
                  <button
                    key={p}
                    className={`hv-pill ${filtroPersona === p ? 'hv-pill-activa' : ''}`}
                    onClick={() => setFiltroPersona(p)}
                  >
                    {p}
                  </button>
                ))}
              </div>

              {anterioresFiltradas.length === 0 ? (
                <p className="hv-vacio">No hay versiones que coincidan con la búsqueda.</p>
              ) : (
                <div className="hv-tabla-wrapper">
                  <table className="hv-tabla">
                    <thead>
                      <tr>
                        <th>V.</th>
                        <th>Fecha y hora</th>
                        <th>Modificado por</th>
                        <th>Descripción</th>
                        <th>Riesgo</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {anterioresFiltradas.map((v) => {
                        const riesgo = COLOR_RIESGO[v.nivel_riesgo] || COLOR_RIESGO.BAJO
                        return (
                          <tr key={v.numero_version}>
                            <td className="hv-col-version">V{v.numero_version}</td>
                            <td className="hv-col-fecha">{formatearFecha(v.creado_en)}</td>
                            <td>
                              <div className="hv-persona">
                                <span className="hv-avatar">{getIniciales(v.modificado_por)}</span>
                                <span>{v.modificado_por || '—'}</span>
                              </div>
                            </td>
                            <td>
                              <p className="hv-descripcion">{v.descripcion_cambio || '—'}</p>
                              {v.campos_modificados?.length > 0 && (
                                <div className="hv-campos-pills">
                                  {v.campos_modificados.map((c, i) => (
                                    <span
                                      key={i}
                                      className="hv-campo-pill"
                                      title={`${traducirValor(c.campo, c.antes)} → ${traducirValor(c.campo, c.despues)}`}
                                    >
                                      {etiquetaCampo(c.campo)}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td>
                              <span className={`hv-badge ${riesgo.clase}`}>{riesgo.etiqueta}</span>
                            </td>
                            <td>
                              <div className="hv-acciones-tabla">
                                <button
                                  className="hv-btn-link"
                                  onClick={() => verVersion(v.numero_version)}
                                  disabled={cargandoVersion === v.numero_version}
                                >
                                  {cargandoVersion === v.numero_version ? 'Cargando...' : 'Ver'}
                                </button>
                                <button className="hv-btn-link" onClick={descargarPDF}>PDF</button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </div>

    {versionDetalle && (
      <div className="hv-modal-overlay" onClick={() => setVersionDetalle(null)}>
        <div className="hv-modal" onClick={e => e.stopPropagation()}>
          <div className="hv-modal-header">
            <div>
              <span className="hv-modal-etiqueta">V{versionDetalle.numero_version}</span>
              <h2 className="hv-modal-titulo">{versionDetalle.descripcion_cambio || 'Sin descripción'}</h2>
              {versionDetalle.modificado_por && (
                <p className="hv-modal-meta">Por {versionDetalle.modificado_por} · {formatearFecha(versionDetalle.creado_en)}</p>
              )}
            </div>
            <button className="hv-modal-cerrar" onClick={() => setVersionDetalle(null)}>✕</button>
          </div>

          {versionDetalle.campos_modificados?.length > 0 ? (
            <div className="hv-modal-body">
              <p className="hv-modal-seccion">Campos modificados</p>
              <table className="hv-modal-tabla">
                <thead>
                  <tr>
                    <th>Campo</th>
                    <th>Antes</th>
                    <th>Después</th>
                  </tr>
                </thead>
                <tbody>
                  {versionDetalle.campos_modificados.map((c, i) => (
                    <tr key={i}>
                      <td className="hv-modal-campo">{etiquetaCampo(c.campo)}</td>
                      <td className="hv-modal-antes">{traducirValor(c.campo, c.antes)}</td>
                      <td className="hv-modal-despues">{traducirValor(c.campo, c.despues)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="hv-modal-body">
              <p className="hv-modal-vacio">Esta es la versión inicial del RAT, sin cambios previos registrados.</p>
            </div>
          )}
        </div>
      </div>
    )}
    </>
  )
}
