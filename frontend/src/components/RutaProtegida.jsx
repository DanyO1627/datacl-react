import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function RutaProtegida({ children }) {
  const { usuario, cargando } = useAuth()
  if (cargando) return null
  if (!usuario) return <Navigate to="/login" replace />
  if (usuario.rol === 'ADMIN') return <Navigate to="/dashboardAdmin" replace />
  return children
}


// esto es solo para proteger las rutas de usuarios sin admin, pero no es suficiente para 
// proteger, obviamente, el backend tiene la verdadera seguridad en obtener_usuario_actual 