import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import '../styles/Admin.css'

const API = 'http://127.0.0.1:8002'
//admin@datacl.cl//
//admin123//
export default function Admin() {
  const navigate = useNavigate()
  const [stats, setStats] = useState({ total: 0, completos: 0, pendientes: 0 })
  const [organizaciones, setOrganizaciones] = useState([])
  const [buscar, setBuscar] = useState('')
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    cargarStats()
    cargarOrganizaciones()
  }, [])

  async function cargarStats() {
    try {
      const res = await fetch(`${API}/admin/stats`)
      const data = await res.json()
      setStats(data)
    } catch (e) {
      console.error('Error al cargar stats:', e)
    }
  }

  async function cargarOrganizaciones(termino = '') {
    setCargando(true)
    try {
      const url = termino
        ? `${API}/admin/organizaciones?buscar=${encodeURIComponent(termino)}`
        : `${API}/admin/organizaciones`
      const res = await fetch(url)
      const data = await res.json()
      setOrganizaciones(data)
    } catch (e) {
      console.error('Error al cargar organizaciones:', e)
    } finally {
      setCargando(false)
    }
  }

  function handleBuscar(e) {
    const valor = e.target.value
    setBuscar(valor)
    cargarOrganizaciones(valor)
  }

  function formatearFecha(fecha) {
    if (!fecha) return '-'
    return new Date(fecha).toLocaleDateString('es-CL')
  }

  return (
    <div className="admin-layout">
      <Sidebar nombreUsuario="admin" />

      <main className="admin-main">
        <div className="admin-header">
          <h1 className="admin-titulo">ADMIN</h1>
          <div className="admin-header-right">
            <input
              type="text"
              className="admin-buscador"
              placeholder="🔍 Buscar organización..."
              value={buscar}
              onChange={handleBuscar}
            />
            <div className="admin-logo">logo</div>
          </div>
        </div>

        <div className="stats-cards">
          <div className="stat-card">
            <span className="stat-label">TOTAL</span>
            <span className="stat-valor">{stats.total}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">COMPLETOS</span>
            <span className="stat-valor">{stats.completos}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">PENDIENTES</span>
            <span className="stat-valor">{stats.pendientes}</span>
          </div>
        </div>

        <div className="tabla-contenedor">
          {cargando ? (
            <p className="tabla-cargando">Cargando...</p>
          ) : (
            <table className="tabla-admin">
              <thead>
                <tr>
                  <th>USUARIO</th>
                  <th>RUT</th>
                  <th>ORGANIZACIÓN</th>
                  <th>CORREO</th>
                  <th>TRATAMIENTO</th>
                  <th>FECHA DE TRATAMIENTO</th>
                </tr>
              </thead>
              <tbody>
                {organizaciones.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="tabla-vacia">
                      No hay organizaciones registradas
                    </td>
                  </tr>
                ) : (
                  organizaciones.map((org, i) => (
                    <tr
                      key={i}
                      className="fila-clickeable"
                      onClick={() => navigate(`/admin/detalle/${org.id}`)}
                    >
                      <td>{org.usuario}</td>
                      <td>{org.rut}</td>
                      <td>{org.organizacion}</td>
                      <td>{org.correo}</td>
                      <td>{org.tratamiento || '-'}</td>
                      <td>{formatearFecha(org.fecha_tratamiento)}</td>
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
