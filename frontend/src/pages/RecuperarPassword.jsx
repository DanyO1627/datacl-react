import { useState } from 'react'
import { Link } from 'react-router-dom'
import '../styles/RecuperarPassword.css'

export default function RecuperarPassword() {
  const [correo, setCorreo] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setMensaje('')

    if (!correo.includes('@')) {
      setError('Ingresa un correo válido')
      return
    }

    setMensaje('Funcionalidad próximamente disponible')
  }

  return (
    <div className="recuperar-layout">
      <div className="recuperar-logo">DataCL</div>

      <div className="recuperar-card">
        <div className="recuperar-icono">🔒</div>
        <h1 className="recuperar-titulo">Recuperar contraseña</h1>
        <p className="recuperar-subtitulo">
          Ingresa tu correo y te enviaremos un enlace
        </p>

        <form onSubmit={handleSubmit} className="recuperar-form">
          <div className="campo">
            <label>Correo electrónico</label>
            <input
              type="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              placeholder="correo@ejemplo.cl"
              required
            />
          </div>

          {error && <p className="recuperar-error">{error}</p>}
          {mensaje && <p className="recuperar-mensaje">{mensaje}</p>}

          <button type="submit" className="btn-recuperar">
            Enviar enlace
          </button>
        </form>

        <Link to="/login" className="recuperar-volver">
          ← Volver al inicio de sesión
        </Link>
      </div>
    </div>
  )
}
