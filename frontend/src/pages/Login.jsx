import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import '../styles/Login.css'

const API = 'http://127.0.0.1:8002'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ correo: '', password: '' })
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
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.detail || 'Error al iniciar sesión')
        return
      }

      login(data)
      navigate(data.rol === 'ADMIN' ? '/admin' : '/dashboard')
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
        <p className="login-subtitulo">Inicia sesión en tu cuenta</p>

        <form onSubmit={handleSubmit} className="login-form">
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
            {cargando ? 'Ingresando...' : 'Iniciar sesión'}
          </button>
        </form>

        <p className="login-registro">
          ¿No tienes cuenta? <Link to="/registro">Regístrate</Link>
        </p>
        <p className="login-registro">
          <Link to="/recuperar">¿Olvidaste tu contraseña?</Link>
        </p>
      </div>
    </div>
  )
}
