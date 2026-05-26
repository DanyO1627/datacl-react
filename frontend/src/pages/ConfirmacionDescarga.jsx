import { useState } from 'react'
import { useLocation, useNavigate, Navigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import BarraLateral from '../components/BarraLateral'
import { useAuth } from '../context/AuthContext'
import { descargarInforme, agregarAnalisisIA, obtenerAnalisisIA } from '../services/informesService'
import '../styles/confirmacionDescarga.css'

export default function ConfirmacionDescarga() {
  const { state } = useLocation()
  const navigate = useNavigate()
  const { usuario } = useAuth()

  const informe = state?.informe
  const resumen = state?.resumen

  const [agregandoIA, setAgregandoIA] = useState(false)
  const [tieneIA, setTieneIA] = useState(informe?.tiene_ia ?? false)
  const [textoIA, setTextoIA] = useState('')
  const [errorIA, setErrorIA] = useState('')

  if (!informe?.id) return <Navigate to="/informes" replace />

  async function descargar() {
  try {
    await descargarInforme(informe.id, usuario?.nombre)
  } catch {
    alert('No se pudo descargar el informe. Intenta nuevamente.')
  }
}

  async function handleAgregarIA() {
    setAgregandoIA(true)
    setErrorIA('')
    try {
      // Si el análisis ya existe (generado junto al PDF), solo lo traemos
      const data = tieneIA
        ? await obtenerAnalisisIA(informe.id)
        : await agregarAnalisisIA(informe.id)
      setTextoIA(data.contenido_ia)
      setTieneIA(true)
    } catch (e) {
      const mensaje = e?.response?.data?.detail || 'No se pudo obtener el análisis de IA. Intenta nuevamente.'
      setErrorIA(mensaje)
    } finally {
      setAgregandoIA(false)
    }
  }

  return (
    <div className="confirmacion-layout">
      <BarraLateral />

      <main className="confirmacion-main">

        {/* ── Tarjeta de éxito ── */}
        <div className="confirmacion-card">
          <div className="confirmacion-check">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none"
              stroke="#38a169" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" fill="#f0fff4" stroke="#38a169"/>
              <polyline points="9 12 11 14 15 10"/>
            </svg>
          </div>

          <div className="confirmacion-encabezado">
            <h1 className="confirmacion-titulo">Informe generado exitosamente</h1>
            {informe.generado_en && (
              <p className="confirmacion-fecha">
                Generado el{' '}
                {new Date(informe.generado_en).toLocaleDateString('es-CL', {
                  day: '2-digit', month: '2-digit', year: 'numeric',
                })}
              </p>
            )}
          </div>

          {resumen && (
            <div className="confirmacion-resumen">
              <div className="resumen-card resumen-total">
                <span className="resumen-numero">{resumen.total}</span>
                <span className="resumen-label">Total</span>
              </div>
              <div className="resumen-card resumen-alto">
                <span className="resumen-numero">{resumen.alto}</span>
                <span className="resumen-label">Alto</span>
              </div>
              <div className="resumen-card resumen-medio">
                <span className="resumen-numero">{resumen.medio}</span>
                <span className="resumen-label">Medio</span>
              </div>
              <div className="resumen-card resumen-bajo">
                <span className="resumen-numero">{resumen.bajo}</span>
                <span className="resumen-label">Bajo</span>
              </div>
            </div>
          )}

          <button className="btn-descargar-pdf" onClick={descargar}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Descargar PDF
          </button>
        </div>

        {/* ── Sección IA ── */}
        <div className="confirmacion-ia-seccion">
          {!textoIA && !agregandoIA && (
            <>
              <div className="ia-pregunta-header">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                  stroke="#7c5cbf" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z"/>
                  <path d="M12 16v-4M12 8h.01"/>
                </svg>
                <h2 className="ia-pregunta-titulo">¿Quieres que nuestra IA analice tu RAT?</h2>
              </div>
              <p className="ia-pregunta-desc">
                Obtén recomendaciones específicas sobre riesgos y nivel de cumplimiento
                según la Ley 21.719 de Chile. El análisis se genera en segundos y
                queda guardado en tu informe.
              </p>
              <button className="btn-agregar-ia" onClick={handleAgregarIA}>
                Analizar con IA
              </button>
            </>
          )}

          {agregandoIA && (
            <div className="ia-cargando">
              <span className="spinner-ia" />
              <p>Analizando tu RAT con IA, esto puede tomar unos segundos...</p>
            </div>
          )}

          {tieneIA && textoIA && (
            <div className="ia-resultado">
              <h2 className="ia-resultado-titulo">Análisis de inteligencia artificial</h2>
              <div className="ia-resultado-texto">
                <ReactMarkdown>{textoIA}</ReactMarkdown>
              </div>
            </div>
          )}

          {errorIA && <p className="ia-error">{errorIA}</p>}
        </div>

        <button className="btn-volver" onClick={() => navigate('/mis-tratamientos')}>
          Volver a mis tratamientos
        </button>

      </main>
    </div>
  )
}
