import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const BASES = [
  { valor: "consentimiento",           etiqueta: "Art. 12 · Consentimiento",       color: "#3b82f6" },
  { valor: "datos_economicos",         etiqueta: "Art. 13a · Económicos",          color: "#8b5cf6" },
  { valor: "obligacion_legal",         etiqueta: "Art. 13b · Oblig. legal",        color: "#06b6d4" },
  { valor: "contrato",                 etiqueta: "Art. 13c · Contrato",            color: "#10b981" },
  { valor: "interes_legitimo",         etiqueta: "Art. 13d · Interés legítimo",    color: "#f59e0b" },
  { valor: "defensa_derechos",         etiqueta: "Art. 13e · Defensa derechos",    color: "#ef4444" },
  { valor: "consentimiento_sensibles", etiqueta: "Art. 16 · Datos sensibles",      color: "#ec4899" },
  { valor: "datos_biometricos",        etiqueta: "Art. 16ter · Biométricos",       color: "#f97316" },
]

function TooltipBase({ active, payload, total }) {
  if (!active || !payload?.length) return null
  const { name, value } = payload[0]
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div style={{
      background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10,
      padding: '8px 14px', fontSize: 12, fontFamily: 'Georgia, serif',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)', maxWidth: 200,
    }}>
      <strong style={{ color: '#021024' }}>{name}</strong>
      <br />{value} tratamiento{value !== 1 ? 's' : ''} — {pct}%
    </div>
  )
}

function Leyenda({ payload }) {
  return (
    <ul style={{
      listStyle: 'none', margin: '10px 0 0', padding: 0,
      display: 'flex', flexWrap: 'wrap', gap: '6px 14px', justifyContent: 'center',
    }}>
      {payload.map((e) => (
        <li key={e.value} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontFamily: 'Georgia, serif', color: '#052659' }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: e.color, display: 'inline-block', flexShrink: 0 }} />
          {e.value}: <strong>{e.payload.value}</strong>
        </li>
      ))}
    </ul>
  )
}

export default function GraficoBasesLicitud({ tratamientos = [] }) {
  const activos = tratamientos.filter(t => t.estado !== 'BORRADOR')
  const datos = BASES.map(b => ({
    name: b.etiqueta,
    value: activos.filter(t => t.base_legal === b.valor).length,
    color: b.color,
  })).filter(d => d.value > 0)

  if (activos.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, color: '#9ab5cc', fontFamily: 'Georgia, serif', fontSize: 13, gap: 8 }}>
        <span style={{ fontSize: 28 }}>⚖️</span>
        <span>Sin tratamientos registrados</span>
      </div>
    )
  }

  if (datos.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: '#9ab5cc', fontFamily: 'Georgia, serif', fontSize: 13 }}>
        Sin base legal registrada aún
      </div>
    )
  }

  const total = datos.reduce((s, d) => s + d.value, 0)

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie data={datos} cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={3} dataKey="value">
          {datos.map((e, i) => <Cell key={i} fill={e.color} stroke="none" />)}
        </Pie>
        <Tooltip content={<TooltipBase total={total} />} />
        <Legend content={<Leyenda />} />
      </PieChart>
    </ResponsiveContainer>
  )
}
