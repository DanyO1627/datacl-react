import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import BarraLateralAdmin from '../components/BarraLateralAdmin'
import { formatearFechaHora } from '../utils/formatoFechaHora'
import '../styles/Admin.css'

const API = '/api'

const estadoEtiqueta = {
  BORRADOR: 'Borrador',
  PENDIENTE: 'Pendiente',
  COMPLETO: 'Completo',
}

export default function Admin() {
  const { token } = useAuth()
  const navigate = useNavigate()

  const [stats, setStats] = useState({
    total_organizaciones: 0,
    total_tratamientos: 0,
    completos: 0,
    pendientes: 0,
    borradores: 0,
    total_informes: 0,
    organizaciones_con_informes: 0,
    organizaciones_con_logo: 0,
    organizaciones_con_color: 0,
    tratamientos_por_estado: [],
    organizaciones_mas_activas: [],
    organizaciones_menos_activas: [],
  })
  const [organizaciones, setOrganizaciones] = useState([])
  const [buscar, setBuscar] = useState('')
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    if (token) cargar()
  }, [token])

  async function cargar() {
    setCargando(true)
    try {
      const [resStats, resOrgs] = await Promise.all([
        fetch(`${API}/admin/stats`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/admin/organizaciones`, { headers: { Authorization: `Bearer ${token}` } }),
      ])

      if (resStats.ok) setStats(await resStats.json())
      if (resOrgs.ok) setOrganizaciones(await resOrgs.json())
    } catch (error) {
      console.error('Error al cargar admin:', error)
    } finally {
      setCargando(false)
    }
  }

  const organizacionesFiltradas = useMemo(() => {
    const termino = buscar.trim().toLowerCase()
    if (!termino) return organizaciones

    return organizaciones.filter(org =>
      org.nombre.toLowerCase().includes(termino) ||
      org.rut.toLowerCase().includes(termino) ||
      org.correo.toLowerCase().includes(termino)
    )
  }, [buscar, organizaciones])

  return (
    <div className="admin-layout">
      <BarraLateralAdmin />

      <main className="admin-main">
        <div className="admin-header">
          <div>
            <h1 className="admin-titulo">Organizaciones</h1>
            <p className="admin-subtitulo">Resumen operativo de la plataforma</p>
          </div>
          <input
            type="text"
            className="admin-buscador"
            placeholder="Buscar por nombre, RUT o correo..."
            value={buscar}
            onChange={e => setBuscar(e.target.value)}
          />
        </div>

        <section className="admin-kpis">
          <article className="admin-kpi">
            <span className="admin-kpi-numero">{stats.total_organizaciones}</span>
            <span className="admin-kpi-etiqueta">Organizaciones</span>
          </article>
          <article className="admin-kpi">
            <span className="admin-kpi-numero">{stats.total_tratamientos}</span>
            <span className="admin-kpi-etiqueta">Tratamientos</span>
          </article>
          <article className="admin-kpi admin-kpi--ok">
            <span className="admin-kpi-numero">{stats.completos}</span>
            <span className="admin-kpi-etiqueta">Completos</span>
          </article>
          <article className="admin-kpi admin-kpi--warn">
            <span className="admin-kpi-numero">{stats.pendientes}</span>
            <span className="admin-kpi-etiqueta">Pendientes</span>
          </article>
          <article className="admin-kpi admin-kpi--draft">
            <span className="admin-kpi-numero">{stats.borradores}</span>
            <span className="admin-kpi-etiqueta">Borradores</span>
          </article>
          <article className="admin-kpi">
            <span className="admin-kpi-numero">{stats.total_informes}</span>
            <span className="admin-kpi-etiqueta">Informes</span>
          </article>
        </section>

        <section className="admin-bloque">
          <div className="admin-bloque-header">
            <h2>Adopción del sistema</h2>
            <p>Uso de informes, identidad visual y actividad general.</p>
          </div>
          <div className="admin-resumen-grid">
            <div className="admin-resumen-card">
              <span className="admin-resumen-numero">{stats.organizaciones_con_informes}</span>
              <span className="admin-resumen-texto">Organizaciones con informes</span>
            </div>
            <div className="admin-resumen-card">
              <span className="admin-resumen-numero">{stats.organizaciones_con_logo}</span>
              <span className="admin-resumen-texto">Con logo cargado</span>
            </div>
            <div className="admin-resumen-card">
              <span className="admin-resumen-numero">{stats.organizaciones_con_color}</span>
              <span className="admin-resumen-texto">Con color institucional</span>
            </div>
          </div>
        </section>

        <section className="admin-bloque">
          <div className="admin-bloque-header">
            <h2>Tratamientos por estado</h2>
            <p>Distribución entre borradores, pendientes y completos.</p>
          </div>
          <div className="admin-barras">
            {stats.tratamientos_por_estado.map(item => (
              <div key={item.estado} className="admin-barra-item">
                <div className="admin-barra-meta">
                  <span>{estadoEtiqueta[item.estado] || item.estado}</span>
                  <strong>{item.total}</strong>
                </div>
                <div className="admin-barra-track">
                  <div
                    className={`admin-barra-fill admin-barra-fill--${item.estado.toLowerCase()}`}
                    style={{ width: `${Math.min(100, item.total ? (item.total / Math.max(stats.total_tratamientos, 1)) * 100 : 0)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="admin-grid-dos">
          <article className="admin-bloque">
            <div className="admin-bloque-header">
              <h2>Organizaciones más activas</h2>
              <p>Se ordenan por tratamientos, informes, sesiones y versiones.</p>
            </div>
            <ul className="admin-ranking">
              {stats.organizaciones_mas_activas.map(org => (
                <li key={org.id} className="admin-ranking-item">
                  <div>
                    <strong>{org.nombre}</strong>
                    <span>{org.rut}</span>
                  </div>
                  <div className="admin-ranking-numero">{org.indice_actividad}</div>
                </li>
              ))}
            </ul>
          </article>

          <article className="admin-bloque">
            <div className="admin-bloque-header">
              <h2>Organizaciones menos activas</h2>
              <p>Útil para detectar cuentas que necesitan seguimiento.</p>
            </div>
            <ul className="admin-ranking">
              {stats.organizaciones_menos_activas.map(org => (
                <li key={org.id} className="admin-ranking-item">
                  <div>
                    <strong>{org.nombre}</strong>
                    <span>{org.rut}</span>
                  </div>
                  <div className="admin-ranking-numero">{org.indice_actividad}</div>
                </li>
              ))}
            </ul>
          </article>
        </section>

        <section className="admin-bloque">
          <div className="admin-bloque-header">
            <h2>Organizaciones</h2>
            <p>Vista resumida por organización con fecha y hora completas.</p>
          </div>

          <div className="tabla-contenedor">
            {cargando ? (
              <p className="tabla-cargando">Cargando...</p>
            ) : (
              <table className="tabla-admin">
                <thead>
                  <tr>
                    <th>NOMBRE DE LA ORGANIZACIÓN</th>
                    <th>RUT</th>
                    <th>CORREO</th>
                    <th>ESTADO</th>
                    <th>TRATAMIENTOS</th>
                    <th>COMPLETOS</th>
                    <th>PENDIENTES</th>
                    <th>BORRADORES</th>
                    <th>ÚLTIMA ACTIVIDAD</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {organizacionesFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="tabla-vacia">
                        {buscar ? 'Sin resultados para esa búsqueda' : 'No hay organizaciones registradas'}
                      </td>
                    </tr>
                  ) : (
                    organizacionesFiltradas.map(org => (
                      <tr key={org.id}>
                        <td>
                          <div className="admin-org-nombre">{org.nombre}</div>
                          <div className="admin-org-meta">
                            {org.tiene_logo ? 'Logo' : 'Sin logo'} · {org.tiene_color ? 'Color' : 'Sin color'}
                          </div>
                        </td>
                        <td>{org.rut}</td>
                        <td>{org.correo}</td>
                        <td>
                          <span className={`admin-badge admin-badge--${org.activo ? 'activo' : 'inactivo'}`}>
                            {org.activo ? 'Activo' : 'Suspendido'}
                          </span>
                        </td>
                        <td>{org.total_tratamientos}</td>
                        <td>{org.tratamientos_por_estado?.COMPLETO ?? 0}</td>
                        <td>{org.tratamientos_por_estado?.PENDIENTE ?? 0}</td>
                        <td>{org.tratamientos_por_estado?.BORRADOR ?? 0}</td>
                        <td>{formatearFechaHora(org.ultima_actividad)}</td>
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
        </section>
      </main>
    </div>
  )
}
