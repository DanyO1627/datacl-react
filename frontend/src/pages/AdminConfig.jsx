import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import BarraLateralAdmin from '../components/BarraLateralAdmin'
import { formatearFechaHora } from '../utils/formatoFechaHora'
import '../styles/adminConfig.css'

const API = '/api'

export default function AdminConfig() {
  const { token } = useAuth()

  const [perfil, setPerfil] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const [guardandoPerfil, setGuardandoPerfil] = useState(false)
  const [guardandoColor, setGuardandoColor] = useState(false)
  const [guardandoPassword, setGuardandoPassword] = useState(false)
  const [subiendoLogo, setSubiendoLogo] = useState(false)
  const [formPerfil, setFormPerfil] = useState({ nombre: '', correo: '' })
  const [formColor, setFormColor] = useState('#7C5CBF')
  const [formPassword, setFormPassword] = useState({
    password_actual: '',
    password_nueva: '',
    confirmar_password: '',
  })

  useEffect(() => {
    if (token) cargarPerfil()
  }, [token])

  async function cargarPerfil() {
    setCargando(true)
    setError('')
    try {
      const res = await fetch(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('No fue posible cargar la configuración')
      const data = await res.json()
      setPerfil(data)
      setFormPerfil({ nombre: data.nombre || '', correo: data.correo || '' })
      setFormColor(data.color_institucional || '#7C5CBF')
    } catch (e) {
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }

  async function guardarPerfil(e) {
    e.preventDefault()
    setGuardandoPerfil(true)
    setMensaje('')
    setError('')
    try {
      const res = await fetch(`${API}/organizaciones/perfil`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formPerfil),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'No se pudo guardar el perfil')
      setPerfil(prev => ({ ...prev, ...data }))
      setMensaje('Datos del perfil actualizados.')
    } catch (e) {
      setError(e.message)
    } finally {
      setGuardandoPerfil(false)
    }
  }

  async function guardarColor(e) {
    e.preventDefault()
    setGuardandoColor(true)
    setMensaje('')
    setError('')
    try {
      const res = await fetch(`${API}/organizaciones/color`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ color: formColor }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'No se pudo guardar el color')
      setPerfil(prev => ({ ...prev, color_institucional: data.color }))
      setMensaje('Color institucional actualizado.')
    } catch (e) {
      setError(e.message)
    } finally {
      setGuardandoColor(false)
    }
  }

  async function subirLogo(e) {
    const archivo = e.target.files?.[0]
    if (!archivo) return

    setSubiendoLogo(true)
    setMensaje('')
    setError('')
    try {
      const formData = new FormData()
      formData.append('archivo', archivo)
      const res = await fetch(`${API}/organizaciones/logo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'No se pudo subir el logo')
      setPerfil(prev => ({ ...prev, logo_ruta: data.logo_ruta }))
      setMensaje('Logo subido correctamente.')
    } catch (e) {
      setError(e.message)
    } finally {
      setSubiendoLogo(false)
      e.target.value = ''
    }
  }

  async function eliminarLogo() {
    setSubiendoLogo(true)
    setMensaje('')
    setError('')
    try {
      const res = await fetch(`${API}/organizaciones/logo`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'No se pudo eliminar el logo')
      setPerfil(prev => ({ ...prev, logo_ruta: null }))
      setMensaje('Logo eliminado.')
    } catch (e) {
      setError(e.message)
    } finally {
      setSubiendoLogo(false)
    }
  }

  async function cambiarPassword(e) {
    e.preventDefault()
    setGuardandoPassword(true)
    setMensaje('')
    setError('')
    try {
      const res = await fetch(`${API}/organizaciones/password`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formPassword),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'No se pudo cambiar la contraseña')
      setFormPassword({ password_actual: '', password_nueva: '', confirmar_password: '' })
      setMensaje('Contraseña actualizada correctamente.')
    } catch (e) {
      setError(e.message)
    } finally {
      setGuardandoPassword(false)
    }
  }

  if (cargando) {
    return (
      <div className="admincfg-layout">
        <BarraLateralAdmin />
        <main className="admincfg-main">
          <p className="admincfg-estado">Cargando configuración...</p>
        </main>
      </div>
    )
  }

  return (
    <div className="admincfg-layout">
      <BarraLateralAdmin />

      <main className="admincfg-main">
        <div className="admincfg-header">
          <div>
            <h1 className="admincfg-titulo">Configuración</h1>
            <p className="admincfg-subtitulo">Cuenta, seguridad e identidad visual del administrador</p>
          </div>
          <div className="admincfg-fecha">
            Cuenta creada: {formatearFechaHora(perfil?.creado_en)}
          </div>
        </div>

        {mensaje && <div className="admincfg-msg admincfg-msg--ok">{mensaje}</div>}
        {error && <div className="admincfg-msg admincfg-msg--error">{error}</div>}

        <section className="admincfg-grid">
          <article className="admincfg-card">
            <h2>Datos de la cuenta</h2>
            <form className="admincfg-form" onSubmit={guardarPerfil}>
              <label>
                <span>Nombre</span>
                <input
                  type="text"
                  value={formPerfil.nombre}
                  onChange={e => setFormPerfil(prev => ({ ...prev, nombre: e.target.value }))}
                />
              </label>
              <label>
                <span>Correo</span>
                <input
                  type="email"
                  value={formPerfil.correo}
                  onChange={e => setFormPerfil(prev => ({ ...prev, correo: e.target.value }))}
                />
              </label>
              <div className="admincfg-lectura">
                <span>RUT</span>
                <strong>{perfil?.rut || '—'}</strong>
              </div>
              <button type="submit" disabled={guardandoPerfil}>
                {guardandoPerfil ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </form>
          </article>

          <article className="admincfg-card">
            <h2>Seguridad</h2>
            <form className="admincfg-form" onSubmit={cambiarPassword}>
              <label>
                <span>Contraseña actual</span>
                <input
                  type="password"
                  value={formPassword.password_actual}
                  onChange={e => setFormPassword(prev => ({ ...prev, password_actual: e.target.value }))}
                />
              </label>
              <label>
                <span>Contraseña nueva</span>
                <input
                  type="password"
                  value={formPassword.password_nueva}
                  onChange={e => setFormPassword(prev => ({ ...prev, password_nueva: e.target.value }))}
                />
              </label>
              <label>
                <span>Confirmar contraseña</span>
                <input
                  type="password"
                  value={formPassword.confirmar_password}
                  onChange={e => setFormPassword(prev => ({ ...prev, confirmar_password: e.target.value }))}
                />
              </label>
              <button type="submit" disabled={guardandoPassword}>
                {guardandoPassword ? 'Actualizando...' : 'Cambiar contraseña'}
              </button>
            </form>
          </article>
        </section>

        <section className="admincfg-grid">
          <article className="admincfg-card">
            <h2>Identidad visual</h2>
            <div className="admincfg-logo-row">
              <div className="admincfg-logo-box">
                <span>Logo</span>
                <strong>{perfil?.logo_ruta ? 'Activo' : 'No configurado'}</strong>
              </div>
              <input type="file" accept=".png,.jpg,.jpeg" onChange={subirLogo} />
            </div>
            <div className="admincfg-actions">
              <button type="button" onClick={eliminarLogo} disabled={subiendoLogo || !perfil?.logo_ruta}>
                {subiendoLogo ? 'Procesando...' : 'Eliminar logo'}
              </button>
            </div>
            <form className="admincfg-form" onSubmit={guardarColor}>
              <label>
                <span>Color institucional</span>
                <input
                  type="color"
                  value={formColor}
                  onChange={e => setFormColor(e.target.value)}
                />
              </label>
              <button type="submit" disabled={guardandoColor}>
                {guardandoColor ? 'Guardando...' : 'Guardar color'}
              </button>
            </form>
          </article>

          <article className="admincfg-card">
            <h2>Referencia</h2>
            <p className="admincfg-texto">
              Esta pantalla reutiliza las funciones de perfil ya existentes, pero queda separada
              para el acceso del admin desde el panel de administración.
            </p>
            <div className="admincfg-resumen">
              <div>
                <span>Último acceso conocido</span>
                <strong>Sin registro dedicado</strong>
              </div>
              <div>
                <span>Activo</span>
                <strong>{perfil?.activo ? 'Sí' : 'No'}</strong>
              </div>
            </div>
          </article>
        </section>
      </main>
    </div>
  )
}
