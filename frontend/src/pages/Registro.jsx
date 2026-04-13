import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import '../styles/Login.css'
//terminal //
const API = 'http://127.0.0.1:8002'

export default function Registro() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ nombre: '', rut: '', correo: '', password: '' })
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setCargando(true)

    try {
      const res = await fetch(`${API}/auth/registro`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.detail || 'Error al registrarse')
        return
      }

      navigate('/login')
    } catch {
      setError('No se pudo conectar con el servidor')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="login-layout">
      <div className="login-card">
        <h1 className="login-titulo">DataCL</h1>
        <p className="login-subtitulo">Crear cuenta de organización</p>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="campo">
            <label>Nombre de la organización</label>
            <input
              type="text"
              name="nombre"
              value={form.nombre}
              onChange={handleChange}
              placeholder="Colegio Los Andes"
              required
            />
          </div>

          <div className="campo">
            <label>RUT</label>
            <input
              type="text"
              name="rut"
              value={form.rut}
              onChange={handleChange}
              placeholder="12.345.678-9"
              required
            />
          </div>

          <div className="campo">
            <label>Correo</label>
            <input
              type="email"
              name="correo"
              value={form.correo}
              onChange={handleChange}
              placeholder="correo@ejemplo.cl"
              required
            />
          </div>

          <div className="campo">
            <label>Contraseña</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="••••••••"
              required
            />
          </div>

          {error && <p className="login-error">{error}</p>}

          <button type="submit" className="btn-login" disabled={cargando}>
            {cargando ? 'Registrando...' : 'Crear cuenta'}
          </button>
        </form>

        <p className="login-registro">
          ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
        </p>
      </div>
    </div>
  )
}
