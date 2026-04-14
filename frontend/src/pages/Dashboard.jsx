import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import Sidebar from '../components/Sidebar'
import OnboardingModal from '../components/OnboardingModal'
import '../styles/dashboard.css'

const API = 'http://127.0.0.1:8002'

export default function Dashboard() {
  const { usuario, getToken } = useAuth()
  const [datosMe, setDatosMe] = useState(null)
  const [mostrarOnboarding, setMostrarOnboarding] = useState(
    !localStorage.getItem('datacl_onboarding_visto')
  )

  useEffect(() => {
    cargarMe()
  }, [])

  async function cargarMe() {
    try {
      const res = await fetch(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      })
      if (res.ok) {
        const data = await res.json()
        setDatosMe(data)
      }
    } catch (e) {
      console.error('Error al cargar perfil:', e)
    }
  }

  const nombre = datosMe?.nombre || usuario?.nombre || '...'

  return (
    <div className="dashboard-layout">
      {mostrarOnboarding && (
        <OnboardingModal onCerrar={() => setMostrarOnboarding(false)} />
      )}
      <Sidebar nombreUsuario={nombre} />

      <main className="dashboard-main">
        <div className="dashboard-bienvenida">
          <h1>Hola, {nombre} 👋</h1>
          <p>Bienvenida al panel de {datosMe?.rol === 'ADMIN' ? 'administración' : 'tu organización'}.</p>
        </div>
      </main>
    </div>
  )
}
