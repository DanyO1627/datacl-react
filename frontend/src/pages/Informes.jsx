import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import BarraLateral from '../components/BarraLateral'
import { obtenerInformes, descargarInforme } from '../services/informesService'
import '../styles/informes.css'

export default function Informes() {
  const { token } = useAuth()
  const navigate = useNavigate()
  const [informes, setInformes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    cargar()
  }, [])

  async function cargar() {
    try {
      const data = await obtenerInformes(token)
      setInformes(data)
    } catch (e) {
      setError('No se pudieron cargar los informes')
    } finally {
      setCargando(false)
    }
  }

  function formatearFecha(fecha) {
    if (!fecha) return '-'
    return new Date(fecha).toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  return (
    <div className="informes-layout">
      <BarraLateral />

      <main className="informes-main">
        <div className="informes-header">
          <h1 className="informes-titulo">Informes</h1>
        </div>

        {cargando ? (
          <p className="tabla-cargando">Cargando...</p>
        ) : error ? (
          <p className="tabla-vacia">{error}</p>
        ) : informes.length === 0 ? (
          <div className="informes-vacio">
            <svg className="informes-vacio-ilustracion" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
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
            <button
              className="btn-generar"
              onClick={() => navigate('/generar-informe')}
            >
              Generar mi primer informe
            </button>
          </div>
        ) : (
          <div className="tabla-contenedor">
            <table className="tabla-informes">
              <thead>
                <tr>
                  <th>Fecha de generación</th>
                  <th>Nº de tratamientos incluidos</th>
                  <th>Descargar informe</th>
                </tr>
              </thead>
              <tbody>
                {informes.map((inf) => (
                  <tr key={inf.id}>
                    <td>{formatearFecha(inf.generado_en)}</td>
                    <td>{inf.num_tratamientos}</td>
                    <td>
                      <button
                        className="btn-descargar"
                        onClick={() => descargarInforme(inf.id, token)}
                      >
                        Descargar
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
  )
}
