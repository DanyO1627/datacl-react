import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Sidebar.css'

export default function BarraLateralAdmin() {
  const navigate = useNavigate()
  const { logout } = useAuth()

  function cerrarSesion() {
    logout()
    navigate('/login')
  }

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        <NavLink
          to="/admin"
          end
          className={({ isActive }) => 'sidebar-link' + (isActive ? ' activo' : '')}
        >
          <span className="sidebar-icon">🛡️</span>
          <span>Panel de administración</span>
        </NavLink>
        <NavLink
          to="/admin/organizaciones"
          className={({ isActive }) => 'sidebar-link' + (isActive ? ' activo' : '')}
        >
          <span className="sidebar-icon">🏢</span>
          <span>Organizaciones</span>
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <span className="sidebar-usuario">admin</span>
        <button className="btn-cerrar-sesion" onClick={cerrarSesion}>
          cerrar sesión
        </button>
      </div>
    </aside>
  )
}
