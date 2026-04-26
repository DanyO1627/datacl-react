// frontend/src/components/GraficoRiesgo.jsx
// Gráfico de torta que muestra la distribución de niveles de riesgo.
// Recibe el array de tratamientos y calcula la distribución internamente.
// Uso: <GraficoRiesgo tratamientos={tratamientos} />

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const NIVELES = [
  { key: 'BAJO',  label: 'Bajo',  color: '#16a34a' },
  { key: 'MEDIO', label: 'Medio', color: '#d97706' },
  { key: 'ALTO',  label: 'Alto',  color: '#dc2626' },
]

// ── Tooltip personalizado ──────────────────────────────────────
function TooltipPersonalizado({ active, payload, total }) {
  if (!active || !payload?.length) return null
  const { name, value } = payload[0]
  const porcentaje = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e2e8f0',
      borderRadius: 10,
      padding: '8px 14px',
      fontSize: 13,
      fontFamily: 'Georgia, serif',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    }}>
      <strong style={{ color: '#021024' }}>{name}</strong>
      <br />
      {value} tratamiento{value !== 1 ? 's' : ''} — {porcentaje}%
    </div>
  )
}

// ── Leyenda personalizada ──────────────────────────────────────
function LeyendaPersonalizada({ payload }) {
  return (
    <ul style={{
      listStyle: 'none',
      margin: '12px 0 0',
      padding: 0,
      display: 'flex',
      gap: '1.2rem',
      justifyContent: 'center',
      flexWrap: 'wrap',
    }}>
      {payload.map((entry) => (
        <li key={entry.value} style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 13,
          fontFamily: 'Georgia, serif',
          color: '#052659',
        }}>
          <span style={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: entry.color,
            display: 'inline-block',
            flexShrink: 0,
          }} />
          {entry.value}: <strong>{entry.payload.value}</strong>
        </li>
      ))}
    </ul>
  )
}

// ── Componente principal ───────────────────────────────────────
export default function GraficoRiesgo({ tratamientos = [] }) {
  // Calcular conteos por nivel
  const conteos = NIVELES.map(({ key, label, color }) => ({
    name: label,
    value: tratamientos.filter(t => t.nivel_riesgo === key).length,
    color,
  })).filter(d => d.value > 0) // excluir niveles sin tratamientos

  const total = tratamientos.length

  // Sin tratamientos — mensaje vacío
  if (total === 0) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: 200,
        color: '#9ab5cc',
        fontFamily: 'Georgia, serif',
        fontSize: 14,
        gap: 8,
      }}>
        <span style={{ fontSize: 32 }}>📊</span>
        <span>Aún no hay tratamientos registrados</span>
      </div>
    )
  }

  // Sin ninguno con nivel_riesgo asignado
  if (conteos.length === 0) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: 200,
        color: '#9ab5cc',
        fontFamily: 'Georgia, serif',
        fontSize: 14,
      }}>
        Sin datos de riesgo aún
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={conteos}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={90}
          paddingAngle={3}
          dataKey="value"
        >
          {conteos.map((entry, i) => (
            <Cell key={i} fill={entry.color} stroke="none" />
          ))}
        </Pie>
        <Tooltip content={<TooltipPersonalizado total={total} />} />
        <Legend content={<LeyendaPersonalizada />} />
      </PieChart>
    </ResponsiveContainer>
  )
}