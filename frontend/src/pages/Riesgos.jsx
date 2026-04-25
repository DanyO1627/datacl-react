import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { obtenerTratamientos } from '../services/tratamientosService'
import BarraLateral from '../components/BarraLateral'
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import '../styles/riesgos.css'

const COLORES_RIESGO = { ALTO: '#e53e3e', MEDIO: '#dd6b20', BAJO: '#38a169' }

export default function Riesgos() {
  const navigate = useNavigate()
  const { token } = useAuth()
  const [tratamientos, setTratamientos] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    async function cargar() {
      try {
        const data = await obtenerTratamientos(token)
        setTratamientos(data)
      } catch {
        setTratamientos([])
      } finally {
        setCargando(false)
      }
    }
    cargar()
  }, [token])

  const distribucionRiesgo = ['ALTO', 'MEDIO', 'BAJO'].map(nivel => ({
    name: nivel,
    value: tratamientos.filter(t => t.nivel_riesgo === nivel).length,
  })).filter(d => d.value > 0)

  const datosSensibles = [
    { name: 'Con datos sensibles', value: tratamientos.filter(t => t.datos_sensibles).length },
    { name: 'Sin datos sensibles', value: tratamientos.filter(t => !t.datos_sensibles).length },
  ]

  const top3 = [...tratamientos]
    .sort((a, b) => {
      const orden = { ALTO: 3, MEDIO: 2, BAJO: 1 }
      return (orden[b.nivel_riesgo] || 0) - (orden[a.nivel_riesgo] || 0)
    })
    .slice(0, 3)

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
                  className="riesgos-item"
                  onClick={() => navigate(`/tratamientos/${t.id}`)}
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
