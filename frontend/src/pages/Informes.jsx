import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import BarraLateral from '../components/BarraLateral'
import { obtenerInformes, descargarInforme, eliminarInforme, obtenerAnalisisIA } from '../services/informesService'
import '../styles/informes.css'

export default function Informes() {
  const navigate = useNavigate()
  const [informes, setInformes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [eliminando, setEliminando] = useState(null)
  const [descargando, setDescargando] = useState(null)
  const [modalIA, setModalIA] = useState(null)
  const [cargandoIA, setCargandoIA] = useState(null)

  useEffect(() => { cargar() }, [])

  useEffect(() => {
    if (!modalIA) return
    const onKey = (e) => { if (e.key === 'Escape') setModalIA(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [modalIA])

  async function cargar() {
    try {
      const data = await obtenerInformes()
      setInformes(data)
    } catch {
      setError('No se pudieron cargar los informes')
    } finally {
      setCargando(false)
    }
  }

  function formatearFecha(fecha) {
    if (!fecha) return 'Sin fecha'
    try {
      return new Date(fecha).toLocaleDateString('es-CL', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    } catch { return 'Sin fecha' }
  }

  async function handleDescargar(id) {
    setDescargando(id)
    try {
      await descargarInforme(id)
    } catch {
      alert('No se pudo descargar el informe. Intenta nuevamente.')
    } finally {
      setDescargando(null)
    }
  }

  async function handleVerAnalisis(id) {
    setCargandoIA(id)
    try {
      const data = await obtenerAnalisisIA(id)
      setModalIA({ id, texto: data.contenido_ia })
    } catch {
      alert('No se pudo cargar el análisis. Intenta nuevamente.')
    } finally {
      setCargandoIA(null)
    }
  }

  async function handleEliminar(id) {
    if (!window.confirm('¿Eliminar este informe? Esta acción no se puede deshacer.')) return
    setEliminando(id)
    try {
      await eliminarInforme(id)
      setInformes((prev) => prev.filter((inf) => inf.id !== id))
    } catch {
      alert('No se pudo eliminar el informe. Intenta nuevamente.')
    } finally {
      setEliminando(null)
    }
  }

  return (
    <>
      <div className="informes-layout">
        <BarraLateral />
        <main className="informes-main">
          <div className="informes-header">
            <h1 className="informes-titulo">Informes</h1>
            <button className="btn-generar" onClick={() => navigate('/informes/nuevo')}>
              Generar nuevo informe
            </button>
          </div>

          {cargando ? (
            <p className="tabla-cargando">Cargando...</p>
          ) : error ? (
            <p className="tabla-vacia">{error}</p>
          ) : informes.length === 0 ? (
            <div className="informes-vacio">
              <svg className="informes-vacio-ilustracion" viewBox="0 0 120 120" fill="none">
                <rect x="20" y="15" width="80" height="90" rx="6" fill="#e8e4f5" stroke="#7c5cbf" strokeWidth="2"/>
                <rect x="32" y="35" width="56" height="6" rx="3" fill="#c5b8e8"/>
                <rect x="32" y="50" width="40" height="6" rx="3" fill="#c5b8e8"/>
                <rect x="32" y="65" width="48" height="6" rx="3" fill="#c5b8e8"/>
                <circle cx="90" cy="90" r="22" fill="#7c5cbf"/>
                <line x1="90" y1="80" x2="90" y2="100" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                <line x1="80" y1="90" x2="100" y2="90" stroke="white" strokeWidth="3" strokeLinecap="round"/>
              </svg>
              <p className="informes-vacio-texto">Aún no has generado ningún informe</p>
              <p className="informes-vacio-subtexto">
                Genera tu primer informe PDF con el registro de tratamientos de tu organización.
              </p>
              <button className="btn-generar" onClick={() => navigate('/informes/nuevo')}>
                Generar mi primer informe
              </button>
            </div>
          ) : (
            <div className="tabla-contenedor">
              <table className="tabla-informes">
                <thead>
                  <tr>
                    <th>Fecha de generación</th>
                    <th>Nº tratamientos</th>
                    <th>Versiones de RAT incluidos</th>
                    <th>Análisis IA</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {informes.map((inf) => (
                    <tr key={inf.id}>
                      <td>{formatearFecha(inf.generado_en)}</td>
                      <td>{inf.num_tratamientos ?? '—'}</td>
                      <td>
                        {inf.versiones_snapshot && Object.keys(inf.versiones_snapshot).length > 0 ? (
                          <div className="inf-ver-wrap">
                            <span className="inf-ver-icono">ⓘ</span>
                            <div className="inf-ver-caja">
                              <p className="inf-ver-titulo">Información de versiones de los RAT del informe</p>
                              {Object.entries(inf.versiones_snapshot).map(([id, dato]) => {
                                const nombre = typeof dato === 'object' ? dato.nombre : `#${id}`
                                return (
                                  <Link
                                    key={id}
                                    to={`/mis-tratamientos/${id}/historial`}
                                    className="inf-ver-link"
                                  >
                                    RAT {nombre}
                                  </Link>
                                )
                              })}
                            </div>
                          </div>
                        ) : (
                          <span className="inf-versiones-vacio">—</span>
                        )}
                      </td>
                      <td>
                        {inf.tiene_ia ? (
                          <button
                            className="btn-ver-analisis"
                            onClick={() => handleVerAnalisis(inf.id)}
                            disabled={cargandoIA === inf.id}
                          >
                            {cargandoIA === inf.id ? 'Cargando...' : 'Ver análisis IA'}
                          </button>
                        ) : (
                          <span className="badge-ia badge-ia--no">Sin IA</span>
                        )}
                      </td>
                      <td className="td-acciones">
                        <button
                          className="btn-descargar"
                          onClick={() => handleDescargar(inf.id)}
                          disabled={descargando === inf.id}
                        >
                          {descargando === inf.id ? 'Descargando...' : 'Descargar'}
                        </button>
                        <button
                          className="btn-eliminar"
                          onClick={() => handleEliminar(inf.id)}
                          disabled={eliminando === inf.id}
                        >
                          {eliminando === inf.id ? '...' : 'Eliminar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>

      {modalIA && (
        <div className="modal-ia-overlay" onClick={() => setModalIA(null)}>
          <div className="modal-ia-contenido" onClick={e => e.stopPropagation()}>
            <div className="modal-ia-header">
              <h2 className="modal-ia-titulo">Análisis de inteligencia artificial</h2>
              <button className="modal-ia-cerrar" onClick={() => setModalIA(null)}>✕</button>
            </div>
            <div className="modal-ia-texto">
              <ReactMarkdown>{modalIA.texto}</ReactMarkdown>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
