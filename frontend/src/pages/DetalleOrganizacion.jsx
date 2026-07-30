import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import BarraLateralAdmin from '../components/BarraLateralAdmin'
import { formatearFechaHora } from '../utils/formatoFechaHora'
import '../styles/detalleOrganizacion.css'

const API = '/api'

export default function DetalleOrganizacion() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { token } = useAuth()

  const [org, setOrg] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [editando, setEditando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [cambiandoPassword, setCambiandoPassword] = useState(false)
  const [form, setForm] = useState({ nombre: '', correo: '', activo: true })
  const [passwordForm, setPasswordForm] = useState({ password_nueva: '', confirmar_password: '' })

  useEffect(() => {
    if (token) cargar()
  }, [id, token])

  async function cargar() {
    setCargando(true)
    setError('')
    try {
      const res = await fetch(`${API}/admin/organizaciones/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Organización no encontrada')
      const data = await res.json()
      setOrg(data)
      setForm({
        nombre: data.nombre || '',
        correo: data.correo || '',
        activo: Boolean(data.activo),
      })
    } catch (e) {
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }

  const resumenSesion = useMemo(() => {
    if (!org) return []
    return [
      { label: 'Archivo', value: org.sesiones_por_fuente?.archivo ?? 0 },
      { label: 'BD', value: org.sesiones_por_fuente?.bd ?? 0 },
      { label: 'Manual', value: org.sesiones_por_fuente?.manual ?? 0 },
    ]
  }, [org])

  async function guardarCambios(e) {
    e.preventDefault()
    setGuardando(true)
    setMensaje('')
    setError('')
    try {
      const res = await fetch(`${API}/admin/organizaciones/${id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nombre: form.nombre,
          correo: form.correo,
          activo: form.activo,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'No se pudo guardar')

      setOrg(prev => ({ ...prev, ...data }))
      setMensaje('Cambios guardados correctamente.')
      setEditando(false)
    } catch (e) {
      setError(e.message)
    } finally {
      setGuardando(false)
    }
  }

  async function alternarAcceso() {
    if (!org) return
    setGuardando(true)
    setMensaje('')
    setError('')
    try {
      const res = await fetch(`${API}/admin/organizaciones/${id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ activo: !org.activo }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'No se pudo actualizar el acceso')
      setOrg(prev => ({ ...prev, ...data }))
      setForm(prev => ({ ...prev, activo: data.activo }))
      setMensaje(data.activo ? 'La organización fue reactivada.' : 'La organización fue suspendida.')
    } catch (e) {
      setError(e.message)
    } finally {
      setGuardando(false)
    }
  }

  async function resetearPassword(e) {
    e.preventDefault()
    setCambiandoPassword(true)
    setMensaje('')
    setError('')
    try {
      const res = await fetch(`${API}/admin/organizaciones/${id}/password`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(passwordForm),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'No se pudo resetear la contraseña')
      setPasswordForm({ password_nueva: '', confirmar_password: '' })
      setMensaje('Contraseña restablecida correctamente.')
    } catch (e) {
      setError(e.message)
    } finally {
      setCambiandoPassword(false)
    }
  }

  if (cargando) {
    return (
      <div className="dorg-layout">
        <BarraLateralAdmin />
        <main className="dorg-main"><p className="dorg-estado">Cargando...</p></main>
      </div>
    )
  }

  if (error && !org) {
    return (
      <div className="dorg-layout">
        <BarraLateralAdmin />
        <main className="dorg-main">
          <p className="dorg-estado dorg-error">{error || 'Organización no encontrada'}</p>
          <button className="dorg-btn-volver" onClick={() => navigate('/admin')}>
            ← Volver a organizaciones
          </button>
        </main>
      </div>
    )
  }

  if (!org) return null

  return (
    <div className="dorg-layout">
      <BarraLateralAdmin />

      <main className="dorg-main">
        <nav className="dorg-breadcrumb">
          <button className="dorg-breadcrumb-link" onClick={() => navigate('/admin')}>
            Organizaciones
          </button>
          <span className="dorg-breadcrumb-sep">›</span>
          <span className="dorg-breadcrumb-actual">{org.nombre}</span>
        </nav>

        <div className="dorg-header">
          <div>
            <h1 className="dorg-titulo">{org.nombre}</h1>
            <p className="dorg-subtitulo">
              {org.activo ? 'Acceso habilitado' : 'Acceso suspendido'}
            </p>
          </div>
          <div className="dorg-header-actions">
            <button className="dorg-btn-secundario" onClick={() => navigate('/admin')}>
              ← Volver
            </button>
            <button
              className={`dorg-btn-estado ${org.activo ? 'dorg-btn-estado--off' : 'dorg-btn-estado--on'}`}
              onClick={alternarAcceso}
              disabled={guardando}
            >
              {org.activo ? 'Suspender acceso' : 'Reactivar acceso'}
            </button>
          </div>
        </div>

        {mensaje && <div className="dorg-mensaje dorg-mensaje--ok">{mensaje}</div>}
        {error && <div className="dorg-mensaje dorg-mensaje--error">{error}</div>}

        <div className="dorg-grid">
          <div className="dorg-card">
            <div className="dorg-card-header">
              <h2 className="dorg-card-titulo">Datos de la organización</h2>
              <button className="dorg-btn-link" onClick={() => setEditando(v => !v)}>
                {editando ? 'Cerrar edición' : 'Editar metadatos'}
              </button>
            </div>

            {editando ? (
              <form className="dorg-form" onSubmit={guardarCambios}>
                <label className="dorg-field">
                  <span>Nombre</span>
                  <input
                    type="text"
                    value={form.nombre}
                    onChange={e => setForm(prev => ({ ...prev, nombre: e.target.value }))}
                  />
                </label>
                <label className="dorg-field">
                  <span>Correo</span>
                  <input
                    type="email"
                    value={form.correo}
                    onChange={e => setForm(prev => ({ ...prev, correo: e.target.value }))}
                  />
                </label>
                <label className="dorg-switch">
                  <input
                    type="checkbox"
                    checked={form.activo}
                    onChange={e => setForm(prev => ({ ...prev, activo: e.target.checked }))}
                  />
                  <span>Acceso habilitado</span>
                </label>
                <button className="dorg-btn-primario" type="submit" disabled={guardando}>
                  {guardando ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </form>
            ) : (
              <div className="dorg-campos">
                <div className="dorg-campo">
                  <span className="dorg-campo-label">Nombre</span>
                  <span className="dorg-campo-valor">{org.nombre}</span>
                </div>
                <div className="dorg-campo">
                  <span className="dorg-campo-label">RUT</span>
                  <span className="dorg-campo-valor">{org.rut}</span>
                </div>
                <div className="dorg-campo">
                  <span className="dorg-campo-label">Correo</span>
                  <span className="dorg-campo-valor">{org.correo}</span>
                </div>
                <div className="dorg-campo">
                  <span className="dorg-campo-label">Registro</span>
                  <span className="dorg-campo-valor">{formatearFechaHora(org.creado_en)}</span>
                </div>
              </div>
            )}
          </div>

          <div className="dorg-card">
            <h2 className="dorg-card-titulo">Actividad</h2>
            <div className="dorg-stats">
              <div className="dorg-stat">
                <span className="dorg-stat-numero">{org.total_tratamientos}</span>
                <span className="dorg-stat-label">Tratamientos</span>
              </div>
              <div className="dorg-stat">
                <span className="dorg-stat-numero">{org.total_informes}</span>
                <span className="dorg-stat-label">Informes</span>
              </div>
              <div className="dorg-stat">
                <span className="dorg-stat-numero">{org.total_versiones}</span>
                <span className="dorg-stat-label">Versiones</span>
              </div>
              <div className="dorg-stat">
                <span className="dorg-stat-numero">{org.total_sesiones}</span>
                <span className="dorg-stat-label">Sesiones</span>
              </div>
            </div>

            <div className="dorg-campo">
              <span className="dorg-campo-label">Tratamientos por estado</span>
              <div className="dorg-badges">
                <span className="dorg-badge">Borrador {org.tratamientos_por_estado?.BORRADOR ?? 0}</span>
                <span className="dorg-badge">Pendiente {org.tratamientos_por_estado?.PENDIENTE ?? 0}</span>
                <span className="dorg-badge">Completo {org.tratamientos_por_estado?.COMPLETO ?? 0}</span>
              </div>
            </div>

            <div className="dorg-campo">
              <span className="dorg-campo-label">Última actividad</span>
              <span className="dorg-campo-valor">{formatearFechaHora(org.ultima_actividad)}</span>
            </div>

            <div className="dorg-campo">
              <span className="dorg-campo-label">Último tratamiento</span>
              <span className="dorg-campo-valor">{formatearFechaHora(org.ultimo_tratamiento)}</span>
            </div>

            <div className="dorg-campo">
              <span className="dorg-campo-label">Riesgo predominante</span>
              <span className="dorg-campo-valor">{org.nivel_riesgo_predominante || 'Sin clasificar'}</span>
            </div>
          </div>
        </div>

        <div className="dorg-grid">
          <div className="dorg-card">
            <h2 className="dorg-card-titulo">Origen de análisis</h2>
            <div className="dorg-stats">
              {resumenSesion.map(item => (
                <div key={item.label} className="dorg-stat">
                  <span className="dorg-stat-numero">{item.value}</span>
                  <span className="dorg-stat-label">{item.label}</span>
                </div>
              ))}
            </div>
            <p className="dorg-nota-menor">
              Estas sesiones representan el origen del análisis, no el contenido de los datos.
            </p>
          </div>

          <div className="dorg-card">
            <h2 className="dorg-card-titulo">Reset de contraseña</h2>
            <form className="dorg-form" onSubmit={resetearPassword}>
              <label className="dorg-field">
                <span>Nueva contraseña</span>
                <input
                  type="password"
                  value={passwordForm.password_nueva}
                  onChange={e => setPasswordForm(prev => ({ ...prev, password_nueva: e.target.value }))}
                />
              </label>
              <label className="dorg-field">
                <span>Confirmar contraseña</span>
                <input
                  type="password"
                  value={passwordForm.confirmar_password}
                  onChange={e => setPasswordForm(prev => ({ ...prev, confirmar_password: e.target.value }))}
                />
              </label>
              <button className="dorg-btn-primario" type="submit" disabled={cambiandoPassword}>
                {cambiandoPassword ? 'Actualizando...' : 'Restablecer contraseña'}
              </button>
            </form>
          </div>
        </div>

        <div className="dorg-nota">
          <div className="dorg-nota-icono">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <p className="dorg-nota-texto">
            El administrador no ve contenido sensible de los tratamientos. Solo resumen, estado y trazabilidad.
          </p>
        </div>
      </main>
    </div>
  )
}
