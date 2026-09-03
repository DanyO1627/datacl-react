import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { obtenerResumenRiesgos } from '../services/riesgosService'
import BarraLateral from '../components/BarraLateral'
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import '../styles/riesgos.css'

const COLORES_RIESGO = { ALTO: '#e53e3e', MEDIO: '#dd6b20', BAJO: '#38a169' }

export default function Riesgos() {
  const navigate = useNavigate()
  const { tienePermiso } = useAuth()
  // R10.10 — el Top 3 solo navega a la ficha del tratamiento si además tiene
  // tratamientos_ver; si no, se muestra igual (nombre + nivel) pero sin link,
  // para no repetir el rebote silencioso a /dashboard que tenían
  // MisTratamientos.jsx/Informes.jsx antes de R10.12.
  const puedeVerFicha = tienePermiso('tratamientos', 'ver')

  const [resumen, setResumen] = useState({ distribucion: {}, datos_sensibles: { con: 0, sin: 0 }, top3: [] })
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    async function cargar() {
      try {
        const data = await obtenerResumenRiesgos()
        setResumen(data)
      } catch {
        setResumen({ distribucion: {}, datos_sensibles: { con: 0, sin: 0 }, top3: [] })
      } finally {
        setCargando(false)
      }
    }
    cargar()
  }, [])

  const distribucionRiesgo = ['ALTO', 'MEDIO', 'BAJO']
    .map(nivel => ({ name: nivel, value: resumen.distribucion?.[nivel] || 0 }))
    .filter(d => d.value > 0)

  const datosSensibles = [
    { name: 'Con datos sensibles', value: resumen.datos_sensibles?.con || 0 },
    { name: 'Sin datos sensibles', value: resumen.datos_sensibles?.sin || 0 },
  ]

  const top3 = resumen.top3 || []

  if (cargando) return <div className="riesgos-cargando">Cargando...</div>

  return (
    <div className="riesgos-layout">
      <BarraLateral />

      <main className="riesgos-main">
        <h1 className="riesgos-titulo">Análisis de riesgo</h1>

        <div className="riesgos-graficos">

          {/* Gráfico 1 — PieChart distribución */}
          <div className="riesgos-card">
            <h2 className="riesgos-card-titulo">Distribución por nivel de riesgo</h2>
            {distribucionRiesgo.length === 0 ? (
              <p className="riesgos-vacio">Sin datos</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={distribucionRiesgo}
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {distribucionRiesgo.map(entry => (
                      <Cell key={entry.name} fill={COLORES_RIESGO[entry.name]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Gráfico 2 — BarChart sensibles vs normales */}
          <div className="riesgos-card">
            <h2 className="riesgos-card-titulo">Datos sensibles vs normales</h2>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={datosSensibles} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" name="Tratamientos" radius={[6, 6, 0, 0]}>
                  <Cell fill="#e53e3e" />
                  <Cell fill="#4299e1" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top 3 mayor riesgo */}
        <div className="riesgos-card riesgos-top">
          <h2 className="riesgos-card-titulo">Top 3 tratamientos de mayor riesgo</h2>
          {top3.length === 0 ? (
            <p className="riesgos-vacio">Sin tratamientos registrados</p>
          ) : (
            <ul className="riesgos-lista">
              {top3.map((t, i) => (
                <li
                  key={t.id}
                  className={puedeVerFicha ? 'riesgos-item' : 'riesgos-item riesgos-item--sin-link'}
                  onClick={puedeVerFicha ? () => navigate(`/tratamientos/${t.id}`) : undefined}
                >
                  <span className="riesgos-item-pos">#{i + 1}</span>
                  <span className="riesgos-item-nombre">{t.nombre}</span>
                  <span
                    className="riesgos-item-badge"
                    style={{ background: COLORES_RIESGO[t.nivel_riesgo] + '22', color: COLORES_RIESGO[t.nivel_riesgo] }}
                  >
                    {t.nivel_riesgo}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  )
}
