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
      setTratamientos(await res.json())
    } catch {
      setError('No se pudieron cargar los tratamientos')
    } finally {
      setCargando(false)
    }
  }

  const total = tratamientos.length
  const alto = tratamientos.filter(t => t.nivel_riesgo === 'ALTO').length
  const medio = tratamientos.filter(t => t.nivel_riesgo === 'MEDIO').length
  const bajo = tratamientos.filter(t => t.nivel_riesgo === 'BAJO').length

  async function generarPDF() {
    setGenerando(true)
    setErrorGeneracion('')
    try {
      const res = await fetch(`${API}/informes/generar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.detail || 'Error al generar')
      }
      const informe = await res.json()
      navigate('/informes/confirmacion', { state: { informe } })
    } catch (e) {
      setErrorGeneracion(e.message || 'No se pudo generar el informe')
    } finally {
      setGenerando(false)
    }
  }

  return (
    <div className="vistaprevia-layout">
      <BarraLateral />

      <main className="vistaprevia-main">
        <div className="vistaprevia-header">
          <div>
            <h1 className="vistaprevia-titulo">Vista previa del informe</h1>
            <p className="vistaprevia-subtitulo">
              Revisa el contenido que se incluirá en tu informe PDF antes de generarlo.
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
            {/* Tarjetas métricas */}
            <div className="vistaprevia-metricas">
              <div className="metrica-card metrica-total">
                <span className="metrica-numero">{total}</span>
                <span className="metrica-label">Total tratamientos</span>
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

            {/* Lista de tratamientos */}
            <div className="vistaprevia-seccion">
              <h2 className="vistaprevia-seccion-titulo">Tratamientos incluidos</h2>
              {tratamientos.length === 0 ? (
                <p className="vistaprevia-vacio">
                  No tienes tratamientos registrados. Agrega al menos uno antes de generar un informe.
                </p>
              ) : (
                <ul className="vistaprevia-lista">
                  {tratamientos.map(t => (
                    <li key={t.id} className="vistaprevia-item">
                      <span className="vistaprevia-nombre">{t.nombre}</span>
                      {t.nivel_riesgo && (
                        <span
                          className="vistaprevia-badge"
                          style={{ backgroundColor: BADGE_COLORES[t.nivel_riesgo] }}
                        >
                          {t.nivel_riesgo}
                        </span>
                      )}
                    </li>
                  ))}
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
                <p className="info-ia-titulo">Análisis con inteligencia artificial</p>
                <p className="info-ia-texto">
                  El informe incluirá un análisis automático generado por IA que resume el
                  estado de cumplimiento de tu organización según la Ley 21.719 de Chile.
                  Este proceso puede tomar entre 5 y 10 segundos.
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
              <button
                className="btn-generar-pdf"
                onClick={generarPDF}
                disabled={generando || tratamientos.length === 0}
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
