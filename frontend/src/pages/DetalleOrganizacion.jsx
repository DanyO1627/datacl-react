import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import BarraLateralAdmin from '../components/BarraLateralAdmin'
import '../styles/detalleOrganizacion.css'

const API = 'http://localhost:8000'

export default function DetalleOrganizacion() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { token } = useAuth()
  const [org, setOrg] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (token) cargar()
  }, [id, token])

  async function cargar() {
    try {
      const res = await fetch(`${API}/admin/organizaciones/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Organización no encontrada')
      setOrg(await res.json())
    } catch (e) {
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }

  function fmt(fecha) {
    if (!fecha) return '—'
    return new Date(fecha).toLocaleDateString('es-CL', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    })
  }

  if (cargando) return (
    <div className="dorg-layout">
      <BarraLateralAdmin />
      <main className="dorg-main"><p className="dorg-estado">Cargando...</p></main>
    </div>
  )

  if (error || !org) return (
    <div className="dorg-layout">
      <BarraLateralAdmin />
      <main className="dorg-main">
        <p className="dorg-estado dorg-error">{error || 'Organización no encontrada'}</p>
        <button className="dorg-btn-volver" onClick={() => navigate('/dashboardAdmin')}>
          ← Volver a organizaciones
        </button>
      </main>
    </div>
  )

  return (
    <div className="dorg-layout">
      <BarraLateralAdmin />

      <main className="dorg-main">
        {/* Breadcrumb */}
        <nav className="dorg-breadcrumb">
          <button className="dorg-breadcrumb-link" onClick={() => navigate('/dashboardAdmin')}>
            Organizaciones
          </button>
          <span className="dorg-breadcrumb-sep">›</span>
          <span className="dorg-breadcrumb-actual">{org.nombre}</span>
        </nav>

        {/* Header */}
        <div className="dorg-header">
          <h1 className="dorg-titulo">{org.nombre}</h1>
          <button className="dorg-btn-volver" onClick={() => navigate('/dashboardAdmin')}>
            ← Volver a organizaciones
          </button>
        </div>

        <div className="dorg-grid">
          {/* Datos de la organización */}
          <div className="dorg-card">
            <h2 className="dorg-card-titulo">Datos de la organización</h2>
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
                <span className="dorg-campo-label">Fecha de registro</span>
                <span className="dorg-campo-valor">{fmt(org.creado_en)}</span>
              </div>
            </div>
          </div>

          {/* Actividad */}
          <div className="dorg-card">
            <h2 className="dorg-card-titulo">Actividad</h2>
            <div className="dorg-stats">
              <div className="dorg-stat">
                <span className="dorg-stat-numero">{org.total_tratamientos}</span>
                <span className="dorg-stat-label">Tratamientos registrados</span>
              </div>
              <div className="dorg-stat">
                <span className="dorg-stat-numero">{org.total_informes}</span>
                <span className="dorg-stat-label">Informes generados</span>
              </div>
            </div>
            <div className="dorg-campo dorg-campo--ultimo">
              <span className="dorg-campo-label">Último tratamiento</span>
              <span className="dorg-campo-valor">{fmt(org.ultimo_tratamiento)}</span>
            </div>
          </div>
        </div>

        {/* Nota de privacidad */}
        <div className="dorg-nota">
          <div className="dorg-nota-icono">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <p className="dorg-nota-texto">
            El administrador <strong>NO puede ver el contenido de los tratamientos</strong> de esta organización.
            Solo se muestran estadísticas agregadas para respetar la privacidad de sus datos.
          </p>
        </div>
      </main>
    </div>
  )
}
