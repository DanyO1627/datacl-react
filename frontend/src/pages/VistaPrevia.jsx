import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import BarraLateral from '../components/BarraLateral'
import '../styles/vistaPrevia.css'

const API = 'http://localhost:8000'

const BADGE_COLORES = {
  ALTO: '#e53e3e',
  MEDIO: '#d97706',
  BAJO: '#38a169',
}

export default function VistaPrevia() {
  const { token } = useAuth()
  const navigate = useNavigate()

  const [tratamientos, setTratamientos] = useState([])
  const [seleccionados, setSeleccionados] = useState(new Set())
  const [cargando, setCargando] = useState(true)
  const [generando, setGenerando] = useState(false)
  const [error, setError] = useState('')
  const [errorGeneracion, setErrorGeneracion] = useState('')

  useEffect(() => {
    cargarTratamientos()
  }, [])

  async function cargarTratamientos() {
    try {
      const res = await fetch(`${API}/tratamientos`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setTratamientos(data)
      setSeleccionados(new Set(data.map(t => t.id)))
    } catch {
      setError('No se pudieron cargar los tratamientos')
    } finally {
      setCargando(false)
    }
  }

  function toggleSeleccionado(id) {
    setSeleccionados(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleTodos() {
    if (seleccionados.size === tratamientos.length) {
      setSeleccionados(new Set())
    } else {
      setSeleccionados(new Set(tratamientos.map(t => t.id)))
    }
  }

  const seleccionadosList = tratamientos.filter(t => seleccionados.has(t.id))
  const total = seleccionadosList.length
  const alto  = seleccionadosList.filter(t => t.nivel_riesgo === 'ALTO').length
  const medio = seleccionadosList.filter(t => t.nivel_riesgo === 'MEDIO').length
  const bajo  = seleccionadosList.filter(t => t.nivel_riesgo === 'BAJO').length

  async function generarPDF() {
    setGenerando(true)
    setErrorGeneracion('')
    try {
      const res = await fetch(`${API}/informes/generar`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids_tratamientos: [...seleccionados] }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.detail || 'Error al generar')
      }
      const informe = await res.json()
      navigate('/informes/confirmacion', { state: { informe, resumen: { total, alto, medio, bajo } } })
    } catch (e) {
      setErrorGeneracion(e.message || 'No se pudo generar el informe')
    } finally {
      setGenerando(false)
    }
  }

  const todosSeleccionados = tratamientos.length > 0 && seleccionados.size === tratamientos.length
  const ningunoSeleccionado = seleccionados.size === 0

  return (
    <div className="vistaprevia-layout">
      <BarraLateral />

      <main className="vistaprevia-main">
        <div className="vistaprevia-header">
          <div>
            <h1 className="vistaprevia-titulo">Vista previa del informe</h1>
            <p className="vistaprevia-subtitulo">
              Selecciona los tratamientos que quieres incluir en el informe PDF.
            </p>
          </div>
          <button className="btn-cancelar" onClick={() => navigate('/informes')}>
            Cancelar
          </button>
        </div>

        {cargando ? (
          <p className="vistaprevia-cargando">Cargando tratamientos...</p>
        ) : error ? (
          <p className="vistaprevia-error">{error}</p>
        ) : (
          <>
            {/* Tarjetas métricas — reflejan solo los seleccionados */}
            <div className="vistaprevia-metricas">
              <div className="metrica-card metrica-total">
                <span className="metrica-numero">{total}</span>
                <span className="metrica-label">Seleccionados</span>
              </div>
              <div className="metrica-card metrica-alto">
                <span className="metrica-numero">{alto}</span>
                <span className="metrica-label">Riesgo alto</span>
              </div>
              <div className="metrica-card metrica-medio">
                <span className="metrica-numero">{medio}</span>
                <span className="metrica-label">Riesgo medio</span>
              </div>
              <div className="metrica-card metrica-bajo">
                <span className="metrica-numero">{bajo}</span>
                <span className="metrica-label">Riesgo bajo</span>
              </div>
            </div>

            {/* Lista de tratamientos con checkboxes */}
            <div className="vistaprevia-seccion">
              <div className="vistaprevia-seccion-header">
                <h2 className="vistaprevia-seccion-titulo">Tratamientos</h2>
                {tratamientos.length > 0 && (
                  <button
                    type="button"
                    className="btn-seleccionar-todos"
                    onClick={toggleTodos}
                  >
                    {todosSeleccionados ? 'Deseleccionar todos' : 'Seleccionar todos'}
                  </button>
                )}
              </div>

              {tratamientos.length === 0 ? (
                <p className="vistaprevia-vacio">
                  No tienes tratamientos registrados. Agrega al menos uno antes de generar un informe.
                </p>
              ) : (
                <ul className="vistaprevia-lista">
                  {tratamientos.map(t => {
                    const activo = seleccionados.has(t.id)
                    return (
                      <li
                        key={t.id}
                        className={`vistaprevia-item ${!activo ? 'vistaprevia-item--desactivado' : ''}`}
                        onClick={() => toggleSeleccionado(t.id)}
                      >
                        <div className="vistaprevia-item-izq">
                          <input
                            type="checkbox"
                            className="vistaprevia-checkbox"
                            checked={activo}
                            onChange={() => toggleSeleccionado(t.id)}
                            onClick={e => e.stopPropagation()}
                          />
                          <span className="vistaprevia-nombre">{t.nombre}</span>
                        </div>
                        {t.nivel_riesgo && (
                          <span
                            className="vistaprevia-badge"
                            style={{ backgroundColor: activo ? BADGE_COLORES[t.nivel_riesgo] : '#bbb' }}
                          >
                            {t.nivel_riesgo}
                          </span>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            {/* Caja informativa IA */}
            <div className="vistaprevia-info-ia">
              <div className="info-ia-icono">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </div>
              <div>
                <p className="info-ia-titulo">Análisis con inteligencia artificial (opcional)</p>
                <p className="info-ia-texto">
                  El PDF base se genera solo con los tratamientos seleccionados. En el paso
                  siguiente podrás agregar opcionalmente un análisis generado por IA sobre
                  el estado de cumplimiento de tu organización según la Ley 21.719 de Chile.
                </p>
              </div>
            </div>

            {/* Error de generación */}
            {errorGeneracion && (
              <div className="vistaprevia-error-generacion">
                <p>{errorGeneracion}</p>
                <button className="btn-reintentar" onClick={generarPDF}>
                  Reintentar
                </button>
              </div>
            )}

            {/* Botón generar */}
            <div className="vistaprevia-acciones">
              {ningunoSeleccionado && (
                <p className="vistaprevia-aviso-seleccion">
                  Selecciona al menos un tratamiento para continuar.
                </p>
              )}
              <button
                className="btn-generar-pdf"
                onClick={generarPDF}
                disabled={generando || ningunoSeleccionado}
              >
                {generando ? (
                  <>
                    <span className="spinner" />
                    Generando informe...
                  </>
                ) : (
                  'Generar informe PDF'
                )}
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
