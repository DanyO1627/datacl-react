import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import BarraLateral from '../components/BarraLateral'
import '../styles/misTratamientos.css'

const API = 'http://localhost:8000'

const BADGE_RIESGO = {
  ALTO:  'badge-riesgo-alto',
  MEDIO: 'badge-riesgo-medio',
  BAJO:  'badge-riesgo-bajo',
}

const BADGE_ESTADO = {
  PENDIENTE: 'badge-estado-pendiente',
  COMPLETO:  'badge-estado-completo',
}

export default function MisTratamientos() {
  const navigate = useNavigate()
  const { token } = useAuth()

  const [tratamientos, setTratamientos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroRiesgo, setFiltroRiesgo] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')

  useEffect(() => {
    async function cargar() {
      try {
        const params = new URLSearchParams()
        if (filtroRiesgo) params.append('nivel_riesgo', filtroRiesgo)
        if (filtroEstado) params.append('estado', filtroEstado)

        const res = await fetch(`${API}/tratamientos?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error()
        setTratamientos(await res.json())
      } catch {
        setTratamientos([])
      } finally {
        setCargando(false)
      }
    }
    cargar()
  }, [token, filtroRiesgo, filtroEstado])

  const visibles = tratamientos.filter(t =>
    (t.nombre || '').toLowerCase().includes(busqueda.toLowerCase())
  )

  function formatearFecha(fechaStr) {
    return new Date(fechaStr).toLocaleDateString('es-CL', {
      year: 'numeric', month: 'short', day: 'numeric',
    })
  }

  return (
    <div className="mt-layout">
      <BarraLateral />

      <main className="mt-main">

        {/* Header */}
        <div className="mt-header">
          <div>
            <h1 className="mt-titulo">Mis tratamientos</h1>
            <p className="mt-subtitulo">
              {tratamientos.length} tratamiento{tratamientos.length !== 1 ? 's' : ''} registrado{tratamientos.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="mt-acciones">
          <button className="btn-2" onClick={() => navigate('/subir-archivo')}>
            Carga tu archivo (nuevo tratamiento)
          </button>
          <button className="btn-nuevo" onClick={() => navigate('/nuevo-tratamiento')}>
            + Nuevo tratamiento
          </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="mt-filtros">
          <input
            className="mt-busqueda"
            type="text"
            placeholder="Buscar por nombre..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />

          <select
            className="mt-select"
            value={filtroRiesgo}
            onChange={e => setFiltroRiesgo(e.target.value)}
          >
            <option value="">Todos los riesgos</option>
            <option value="BAJO">Riesgo bajo</option>
            <option value="MEDIO">Riesgo medio</option>
            <option value="ALTO">Riesgo alto</option>
          </select>

          <select
            className="mt-select"
            value={filtroEstado}
            onChange={e => setFiltroEstado(e.target.value)}
          >
            <option value="">Todos los estados</option>
            <option value="PENDIENTE">Pendiente</option>
            <option value="COMPLETO">Completo</option>
          </select>
        </div>

        {/* Contenido */}
        {cargando ? (
          <div className="mt-cargando">Cargando tratamientos...</div>
        ) : visibles.length === 0 ? (
          <div className="mt-vacio">
            <div className="mt-vacio-icono">📋</div>
            <h2 className="mt-vacio-titulo">
              {tratamientos.length === 0
                ? 'Aún no tienes tratamientos registrados'
                : 'No hay resultados para tu búsqueda'}
            </h2>
            <p className="mt-vacio-texto">
              {tratamientos.length === 0
                ? 'Registra el primer tratamiento de datos de tu organización.'
                : 'Prueba con otros filtros o términos de búsqueda.'}
            </p>
            {tratamientos.length === 0 && (
              <button className="btn-nuevo" onClick={() => navigate('/nuevo-tratamiento')}>
                + Crear primer tratamiento
              </button>
            )}
          </div>
        ) : (
          <div className="mt-tabla-contenedor">
            <table className="mt-tabla">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Nivel de riesgo</th>
                  <th>Estado</th>
                  <th>Fecha</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {visibles.map(t => (
                  <tr
                    key={t.id}
                    className="mt-fila"
                    onClick={() => navigate(`/tratamientos/${t.id}`)}
                  >
                    <td className="mt-celda-nombre">{t.nombre}</td>
                    <td>
                      <span className={`mt-badge ${BADGE_RIESGO[t.nivel_riesgo] || 'badge-riesgo-bajo'}`}>
                        {t.nivel_riesgo}
                      </span>
                    </td>
                    <td>
                      <span className={`mt-badge ${BADGE_ESTADO[t.estado] || 'badge-estado-pendiente'}`}>
                        {t.estado === 'COMPLETO' ? 'Completo' : 'Pendiente'}
                      </span>
                    </td>
                    <td className="mt-celda-fecha">{formatearFecha(t.creado_en)}</td>
                    <td className="mt-celda-accion">
                      <span className="mt-ver-detalle">Ver →</span>
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
