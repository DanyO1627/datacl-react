import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import "../styles/sidebar.css";

const links = [
  { to: '/dashboard', label: 'Inicio', icon: '🏠' },
  { to: '/tratamientos', label: 'Tratamientos', icon: '📄' },
  { to: '/archivo', label: 'Archivo', icon: '🗂️' },
  { to: '/informes', label: 'Informes', icon: '📊' },
  { to: '/perfil',       label: 'Mi perfil',    icon: '👤' },
  { to: '/admin', label: 'Admin', icon: '👤' },
]

export default function Sidebar({ nombreUsuario = 'admin' }) {
  const navigate = useNavigate()
  const { logout } = useAuth()

  function cerrarSesion() {
    logout()
    navigate('/login')
  }

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              'sidebar-link' + (isActive ? ' activo' : '')
            }
          >
            <span className="sidebar-icon">{link.icon}</span>
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <span className="sidebar-usuario">{nombreUsuario}</span>
        <button className="btn-cerrar-sesion" onClick={cerrarSesion}>
          cerrar sesión
        </button>
      </div>
    </aside>
  )
}
