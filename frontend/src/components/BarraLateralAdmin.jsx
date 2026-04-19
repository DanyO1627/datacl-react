import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import "../styles/sidebar.css";

export default function BarraLateralAdmin() {
  const navigate = useNavigate()
  const { cerrarSesion } = useAuth()

  function handleCerrarSesion() {
    cerrarSesion()
    navigate('/login')
  }

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        <NavLink to="/dashboardAdmin" end className={({ isActive }) => 'sidebar-link' + (isActive ? ' activo' : '')}>
          <span className="sidebar-icon">🏠</span>
          <span>Inicio</span>
        </NavLink>
        <NavLink to="/admin" className={({ isActive }) => 'sidebar-link' + (isActive ? ' activo' : '')}>
          <span className="sidebar-icon">📋</span>
          <span>tratamientos</span>
        </NavLink>
        <NavLink to="/admin/archivo" className={({ isActive }) => 'sidebar-link' + (isActive ? ' activo' : '')}>
          <span className="sidebar-icon">📁</span>
          <span>archivo</span>
        </NavLink>
        <NavLink to="/admin/informes" className={({ isActive }) => 'sidebar-link' + (isActive ? ' activo' : '')}>
          <span className="sidebar-icon">📄</span>
          <span>Informes</span>
        </NavLink>
        <NavLink to="/admin/config" className={({ isActive }) => 'sidebar-link' + (isActive ? ' activo' : '')}>
          <span className="sidebar-icon">⚙️</span>
          <span>admin</span>
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <span className="sidebar-usuario">admin</span>
        <button className="btn-cerrar-sesion" onClick={handleCerrarSesion}>
          cerrar sesión
        </button>
      </div>
    </aside>
  )
}
