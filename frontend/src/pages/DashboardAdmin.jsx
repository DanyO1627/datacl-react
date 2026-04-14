import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import BarraLateralAdmin from '../components/BarraLateralAdmin'
import '../styles/dashboard.css'
//enlace //
const API = 'http://127.0.0.1:8002'

export default function DashboardAdmin() {
  const { getToken } = useAuth()
  const [totalOrgs, setTotalOrgs] = useState('—')

  useEffect(() => {
    cargarStats()
  }, [])

  async function cargarStats() {
    try {
      const res = await fetch(`${API}/admin/stats`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      })
      if (res.ok) {
        const data = await res.json()
        setTotalOrgs(data.total)
      }
    } catch (e) {
      console.error('Error al cargar stats:', e)
    }
  }

  return (
    <div className="dashboard-layout">
      <BarraLateralAdmin />

      <main className="dashboard-main">
        <div className="dashboard-bienvenida">
          <h1>Panel de administración</h1>
          <p>Bienvenida, administrador</p>
        </div>

        <div className="admin-stat-card">
          <span className="admin-stat-label">Organizaciones registradas</span>
          <span className="admin-stat-valor">{totalOrgs}</span>
        </div>
      </main>
    </div>
  )
}
