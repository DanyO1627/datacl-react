import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import BarraLateralAdmin from '../components/BarraLateralAdmin'
import '../styles/dashboardAdmin.css'

const API = 'http://localhost:8000'

export default function DashboardAdmin() {
  const { token } = useAuth()
  const navigate = useNavigate()

  const [stats, setStats] = useState({ total: '—', completos: '—', pendientes: '—' })
  const [orgs, setOrgs] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    if (token) cargar()
  }, [token])

  async function cargar() {
    try {
      const [resStats, resOrgs] = await Promise.all([
        fetch(`${API}/admin/stats`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/admin/organizaciones`, { headers: { Authorization: `Bearer ${token}` } }),
      ])
      if (resStats.ok) setStats(await resStats.json())
      if (resOrgs.ok) {
        const filas = await resOrgs.json()
        setOrgs(agruparPorOrg(filas))
      }
    } catch (e) {
      console.error('Error al cargar dashboard admin:', e)
    } finally {
      setCargando(false)
    }
  }

  // El endpoint devuelve una fila por tratamiento → agrupar por org id
  function agruparPorOrg(filas) {
    const mapa = {}
    for (const f of filas) {
      if (!mapa[f.id]) {
        mapa[f.id] = {
          id: f.id,
          nombre: f.nombre,
          rut: f.rut,
          correo: f.correo,
          creado_en: f.creado_en,
          total_tratamientos: 0,
        }
      }
      if (f.tratamiento !== null) mapa[f.id].total_tratamientos++
    }
    return Object.values(mapa)
  }

  const orgsFiltradas = orgs.filter(o =>
    o.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    o.rut.toLowerCase().includes(busqueda.toLowerCase()) ||
    o.correo.toLowerCase().includes(busqueda.toLowerCase())
  )

  function formatFecha(fecha) {
    if (!fecha) return '—'
    return new Date(fecha).toLocaleDateString('es-CL', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    })
  }

  return (
    <div className="dadmin-layout">
      <BarraLateralAdmin />

      <main className="dadmin-main">
        <div className="dadmin-header">
          <div>
            <h1 className="dadmin-titulo">Panel de administración</h1>
            <p className="dadmin-subtitulo">Resumen de la plataforma</p>
          </div>
        </div>

        {/* Tarjetas métricas */}
        <div className="dadmin-metricas">
          <div className="dadmin-card">
            <span className="dadmin-card-numero">{stats.total}</span>
            <span className="dadmin-card-label">Organizaciones registradas</span>
          </div>
          <div className="dadmin-card dadmin-card--completo">
            <span className="dadmin-card-numero">{stats.completos}</span>
            <span className="dadmin-card-label">Tratamientos completos</span>
          </div>
          <div className="dadmin-card dadmin-card--pendiente">
            <span className="dadmin-card-numero">{stats.pendientes}</span>
            <span className="dadmin-card-label">Tratamientos pendientes</span>
          </div>
        </div>

        {/* Barra de búsqueda */}
        <div className="dadmin-busqueda-wrap">
          <svg className="dadmin-busqueda-icono" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            className="dadmin-busqueda"
            type="text"
            placeholder="Buscar por nombre, RUT o correo..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
        </div>

        {/* Tabla */}
        <div className="dadmin-tabla-wrap">
          {cargando ? (
            <p className="dadmin-cargando">Cargando...</p>
          ) : (
            <table className="dadmin-tabla">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>RUT</th>
                  <th>Correo</th>
                  <th>Fecha registro</th>
                  <th>Tratamientos</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {orgsFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="dadmin-vacio">
                      {busqueda ? 'Sin resultados para esa búsqueda' : 'No hay organizaciones registradas'}
                    </td>
                  </tr>
                ) : (
                  orgsFiltradas.map(org => (
                    <tr key={org.id}>
                      <td className="dadmin-td-nombre">{org.nombre}</td>
                      <td>{org.rut}</td>
                      <td>{org.correo}</td>
                      <td>{formatFecha(org.creado_en)}</td>
                      <td>
                        <span className="dadmin-badge-trat">{org.total_tratamientos}</span>
                      </td>
                      <td>
                        <button
                          className="btn-ver-detalle"
                          onClick={() => navigate(`/admin/organizaciones/${org.id}`)}
                        >
                          Ver detalle
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  )
}
