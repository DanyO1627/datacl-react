import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const ESTADOS = [
  { key: 'PENDIENTE', label: 'Pendiente', color: '#d97706' },
  { key: 'COMPLETO',  label: 'Completo',  color: '#16a34a' },
]

function TooltipEstado({ active, payload }) {
  if (!active || !payload?.length) return null
  const { name, value } = payload[0]
  return (
    <div style={{
      background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10,
      padding: '8px 14px', fontSize: 13, fontFamily: 'Georgia, serif',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    }}>
      <strong style={{ color: '#021024' }}>{name}</strong>
      <br />{value} tratamiento{value !== 1 ? 's' : ''}
    </div>
  )
}

export default function GraficoEstados({ tratamientos = [] }) {
  const activos = tratamientos.filter(t => t.estado !== 'BORRADOR')

  if (activos.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, color: '#9ab5cc', fontFamily: 'Georgia, serif', fontSize: 13, gap: 8 }}>
        <span style={{ fontSize: 28 }}>📋</span>
        <span>Sin tratamientos registrados</span>
      </div>
    )
  }

  const datos = ESTADOS.map(e => ({
    name: e.label,
    value: activos.filter(t => t.estado === e.key).length,
    color: e.color,
  }))

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={datos} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barSize={48}>
        <XAxis
          dataKey="name"
          tick={{ fontFamily: 'Georgia, serif', fontSize: 13, fill: '#052659' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontFamily: 'Georgia, serif', fontSize: 12, fill: '#9ab5cc' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<TooltipEstado />} cursor={{ fill: 'rgba(84,131,179,0.06)' }} />
        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
          {datos.map((e, i) => <Cell key={i} fill={e.color} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
