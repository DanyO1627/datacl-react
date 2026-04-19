import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import BarraLateralAdmin from '../components/BarraLateralAdmin'
import logo from '../assets/DataCLlogo.png'
import '../styles/detalle.css'

const API = 'http://localhost:8000'

export default function Detalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { token } = useAuth()
  const [org, setOrg] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    if (token) cargarDetalle()
  }, [id, token])

  async function cargarDetalle() {
    try {
      const res = await fetch(`${API}/admin/organizaciones/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('No encontrada')
      const data = await res.json()
      setOrg(data)
    } catch (e) {
      console.error('Error al cargar detalle:', e)
    } finally {
      setCargando(false)
    }
  }

  function formatearFecha(fecha) {
    if (!fecha) return '-'
    return new Date(fecha).toLocaleDateString('es-CL')
  }

  if (cargando) return <div className="detalle-cargando">Cargando...</div>
  if (!org) return <div className="detalle-cargando">Organización no encontrada</div>

  return (
    <div className="detalle-layout">
      <BarraLateralAdmin />

      <main className="detalle-main">
        <div className="detalle-header">
          <button className="btn-volver" onClick={() => navigate('/admin')}>
            ← Volver
          </button>
          <h1 className="detalle-titulo">DETALLE</h1>
          <img src={logo} alt="DataCL" className="detalle-logo" />
        </div>

        <div className="detalle-contenido">
          <div className="detalle-seccion">
            <div className="detalle-seccion-titulo">INFORMACION DE LA ORGANIZACIÓN</div>
            <div className="detalle-seccion-cuerpo">
              <p><strong>Nombre:</strong> {org.nombre}</p>
              <p><strong>RUT:</strong> {org.rut}</p>
              <p><strong>Correo:</strong> {org.correo}</p>
              <p><strong>Fecha:</strong> {formatearFecha(org.creado_en)}</p>
            </div>
          </div>

          <div className="detalle-seccion">
            <div className="detalle-seccion-cuerpo">
              <p className="actividad-titulo">Actividad</p>
              <p>Tratamientos: {org.total_tratamientos}</p>
              <p>Último tratamiento: {formatearFecha(org.ultimo_tratamiento)}</p>
              <p>Informes generados: {org.total_informes}</p>
            </div>
          </div>

          <div className="detalle-seccion nota-seccion">
            <p className="nota-texto">
              ⚠️ &nbsp;<strong>Nota</strong>
            </p>
            <p className="nota-texto">
              El administrador NO puede ver el contenido de los tratamientos
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
