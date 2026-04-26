import '../styles/barraRiesgo.css'

const MAPA_NIVEL = {
  BAJA:  { porcentaje: 33,  clase: 'barra-verde',   etiqueta: 'Baja' },
  MEDIA: { porcentaje: 66,  clase: 'barra-naranja',  etiqueta: 'Media' },
  ALTA:  { porcentaje: 100, clase: 'barra-roja',     etiqueta: 'Alta' },
  BAJO:  { porcentaje: 33,  clase: 'barra-verde',    etiqueta: 'Bajo' },
  MEDIO: { porcentaje: 66,  clase: 'barra-naranja',  etiqueta: 'Medio' },
  ALTO:  { porcentaje: 100, clase: 'barra-roja',     etiqueta: 'Alto' },
}

export default function BarraRiesgo({ label, valor }) {
  const config = MAPA_NIVEL[valor] || null

  return (
    <div className="detalle-eval-item">
      <span className="detalle-eval-label">{label}</span>

      <div className="detalle-eval-barra">
        {config ? (
          <div
            className={`detalle-eval-relleno ${config.clase}`}
            style={{ width: `${config.porcentaje}%` }}
          />
        ) : (
          <div className="detalle-eval-relleno detalle-eval-pendiente" style={{ width: '0%' }} />
        )}
      </div>

      <span className={`detalle-eval-valor ${config ? '' : 'detalle-campo-pendiente'}`}>
        {config ? config.etiqueta : 'Pendiente evaluación'}
      </span>
    </div>
  )
}
