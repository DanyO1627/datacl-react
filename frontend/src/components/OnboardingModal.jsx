import "../styles/onboardingModal.css";

const pasos = [
  {
    icono: '📁',
    texto: 'Sube un archivo de tu base de datos para que detectemos tus datos automáticamente'
  },
  {
    icono: '✏️',
    texto: 'Revisa y completa los campos que no pudimos detectar'
  },
  {
    icono: '📊',
    texto: 'Genera tu informe PDF con análisis de inteligencia artificial'
  }
]

export default function OnboardingModal({ onCerrar }) {
  function cerrar() {
    localStorage.setItem('datacl_onboarding_visto', 'true')
    onCerrar()
  }

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-modal">
        <h2 className="onboarding-titulo">Bienvenida a DataCL</h2>
        <p className="onboarding-subtitulo">
          Antes de comenzar, te explicamos cómo funciona
        </p>

        <div className="onboarding-pasos">
          {pasos.map((paso, i) => (
            <div key={i} className="onboarding-paso">
              <div className="onboarding-paso-icono">{paso.icono}</div>
              <div className="onboarding-paso-contenido">
                <span className="onboarding-paso-numero">Paso {i + 1}</span>
                <p className="onboarding-paso-texto">{paso.texto}</p>
              </div>
            </div>
          ))}
        </div>

        <button className="btn-onboarding-comenzar" onClick={cerrar}>
          Entendido, comenzar
        </button>

        <button className="btn-onboarding-saltar" onClick={cerrar}>
          Saltar
        </button>
      </div>
    </div>
  )
}
