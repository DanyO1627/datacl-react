import { useLocation, useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import BarraLateral from '../components/BarraLateral'
import '../styles/confirmacionDescarga.css'

const API = 'http://localhost:8000'

export default function ConfirmacionDescarga() {
  const { state } = useLocation()
  const { token } = useAuth()
  const navigate = useNavigate()

  const informe = state?.informe

  if (!informe?.id) return <Navigate to="/informes" replace />

  function descargar() {
    const link = document.createElement('a')
    link.href = `${API}/informes/${informe.id}/descargar`
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="confirmacion-layout">
      <BarraLateral />

      <main className="confirmacion-main">
        <div className="confirmacion-card">
          <div className="confirmacion-check">
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#38a169" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" fill="#f0fff4" stroke="#38a169"/>
              <polyline points="9 12 11 14 15 10"/>
            </svg>
          </div>

          <h1 className="confirmacion-titulo">Informe generado exitosamente</h1>
          <p className="confirmacion-subtitulo">Tu informe RAT está listo para descargar</p>

          {informe.generado_en && (
            <p className="confirmacion-fecha">
              Generado el{' '}
              {new Date(informe.generado_en).toLocaleDateString('es-CL', {
                day: '2-digit', month: '2-digit', year: 'numeric',
              })}
            </p>
          )}

          <div className="confirmacion-acciones">
            <button className="btn-descargar-pdf" onClick={descargar}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Descargar PDF
            </button>

            <button className="btn-volver" onClick={() => navigate('/mis-tratamientos')}>
              Volver a mis tratamientos
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
