import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import BarraLateralAdmin from '../components/BarraLateralAdmin'
import { formatearFechaHora } from '../utils/formatoFechaHora'
import '../styles/dashboardAdmin.css'

const API = '/api'

export default function DashboardAdmin() {
  const { token } = useAuth()
  const navigate = useNavigate()

  const [stats, setStats] = useState({
    total_organizaciones: 0,
    total_tratamientos: 0,
    completos: 0,
    pendientes: 0,
    borradores: 0,
    total_informes: 0,
    riesgo_distribucion: {
      ALTO: 0,
      MEDIO: 0,
      BAJO: 0,
      SIN_CLASIFICAR: 0,
    },
    tratamientos_por_mes: [],
    organizaciones_mas_activas: [],
    organizaciones_menos_activas: [],
    ultima_actividad: null,
  })
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    if (token) cargar()
  }, [token])

  async function cargar() {
    setCargando(true)
    try {
      const res = await fetch(`${API}/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) setStats(await res.json())
    } catch (error) {
      console.error('Error al cargar dashboard admin:', error)
    } finally {
      setCargando(false)
    }
  }

  const maxMes = useMemo(() => {
    return Math.max(1, ...stats.tratamientos_por_mes.map(item => item.total))
  }, [stats.tratamientos_por_mes])

  const maxRiesgo = useMemo(() => {
    const valores = Object.values(stats.riesgo_distribucion || {})
    return Math.max(1, ...valores)
  }, [stats.riesgo_distribucion])

  return (
    <div className="dadmin-layout">
      <BarraLateralAdmin />

      <main className="dadmin-main">
        <div className="dadmin-header">
          <div>
            <h1 className="dadmin-titulo">Panel de administración</h1>
            <p className="dadmin-subtitulo">
              Actividad general, adopción del sistema y riesgo/compliance
            </p>
          </div>
          <div className="dadmin-fecha">
            Última actividad: {formatearFechaHora(stats.ultima_actividad, false)}
          </div>
        </div>

        <section className="dadmin-metricas">
          <article className="dadmin-card">
            <span className="dadmin-card-numero">{stats.total_organizaciones}</span>
            <span className="dadmin-card-label">Organizaciones</span>
          </article>
          <article className="dadmin-card">
            <span className="dadmin-card-numero">{stats.total_tratamientos}</span>
            <span className="dadmin-card-label">Tratamientos</span>
          </article>
          <article className="dadmin-card dadmin-card--completo">
            <span className="dadmin-card-numero">{stats.completos}</span>
            <span className="dadmin-card-label">Completos</span>
          </article>
          <article className="dadmin-card dadmin-card--pendiente">
            <span className="dadmin-card-numero">{stats.pendientes}</span>
            <span className="dadmin-card-label">Pendientes</span>
          </article>
          <article className="dadmin-card dadmin-card--borrador">
            <span className="dadmin-card-numero">{stats.borradores}</span>
            <span className="dadmin-card-label">Borradores</span>
          </article>
          <article className="dadmin-card">
            <span className="dadmin-card-numero">{stats.total_informes}</span>
            <span className="dadmin-card-label">Informes</span>
          </article>
        </section>

        <section className="dadmin-grid">
          <article className="dadmin-panel">
            <div className="dadmin-panel-header">
              <h2>Tratamientos por mes</h2>
              <p>Lectura rápida de crecimiento y actividad reciente.</p>
            </div>
            <div className="dadmin-chart">
              {cargando ? (
                <p className="dadmin-cargando">Cargando...</p>
              ) : (
                stats.tratamientos_por_mes.map(item => (
                  <div key={item.mes} className="dadmin-chart-row">
                    <div className="dadmin-chart-label">{item.label}</div>
                    <div className="dadmin-chart-track">
                      <div
                        className="dadmin-chart-fill"
                        style={{ width: `${(item.total / maxMes) * 100}%` }}
                      />
                    </div>
                    <div className="dadmin-chart-value">{item.total}</div>
                  </div>
                ))
              )}
            </div>
          </article>

          <article className="dadmin-panel">
            <div className="dadmin-panel-header">
              <h2>Distribución de riesgo</h2>
              <p>Sirve para leer si la plataforma se está usando en casos exigentes.</p>
            </div>
            <div className="dadmin-chart">
              {Object.entries(stats.riesgo_distribucion || {}).map(([riesgo, total]) => (
                <div key={riesgo} className="dadmin-chart-row">
                  <div className="dadmin-chart-label">{riesgo}</div>
                  <div className="dadmin-chart-track">
                    <div
                      className={`dadmin-chart-fill dadmin-chart-fill--${riesgo.toLowerCase()}`}
                      style={{ width: `${(total / maxRiesgo) * 100}%` }}
                    />
                  </div>
                  <div className="dadmin-chart-value">{total}</div>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="dadmin-grid">
          <article className="dadmin-panel">
            <div className="dadmin-panel-header">
              <h2>Adopción del sistema</h2>
              <p>Qué tan activas están las organizaciones con funciones clave.</p>
            </div>
            <ul className="dadmin-lista-metricas">
              <li>
                <span>Organizaciones con informes</span>
                <strong>{stats.organizaciones_con_informes ?? 0}</strong>
              </li>
              <li>
                <span>Con logo cargado</span>
                <strong>{stats.organizaciones_con_logo ?? 0}</strong>
              </li>
              <li>
                <span>Con color institucional</span>
                <strong>{stats.organizaciones_con_color ?? 0}</strong>
              </li>
            </ul>
          </article>

          <article className="dadmin-panel">
            <div className="dadmin-panel-header">
              <h2>Actividad por organización</h2>
              <p>Más y menos activas según tratamientos, informes, sesiones y versiones.</p>
            </div>
            <div className="dadmin-doble-lista">
              <div>
                <h3>Más activas</h3>
                <ul className="dadmin-ranking">
                  {stats.organizaciones_mas_activas.map(org => (
                    <li key={org.id}>
                      <div>
                        <strong>{org.nombre}</strong>
                        <span>{org.rut}</span>
                      </div>
                      <span>{org.indice_actividad}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3>Menos activas</h3>
                <ul className="dadmin-ranking">
                  {stats.organizaciones_menos_activas.map(org => (
                    <li key={org.id}>
                      <div>
                        <strong>{org.nombre}</strong>
                        <span>{org.rut}</span>
                      </div>
                      <span>{org.indice_actividad}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </article>
        </section>

        <section className="dadmin-panel">
          <div className="dadmin-panel-header">
            <h2>Atajos</h2>
            <p>Acceso directo a la revisión operativa.</p>
          </div>
          <div className="dadmin-atajos">
            <button className="dadmin-atajo" onClick={() => navigate('/admin')}>
              Ver organizaciones
            </button>
            <button className="dadmin-atajo" onClick={() => navigate('/perfil')}>
              Configurar perfil
            </button>
          </div>
        </section>
      </main>
    </div>
  )
}
