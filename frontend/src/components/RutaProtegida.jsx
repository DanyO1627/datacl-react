import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function RutaProtegida({ children }) {
  const { usuario, cargando } = useAuth()
  if (cargando) return null
  if (!usuario) return <Navigate to="/login" replace />
  if (usuario.rol === 'ADMIN') return <Navigate to="/dashboardAdmin" replace />
  // R10.7 — cuentas creadas por un ADMIN_ORG (R10.2) o con la contraseña
  // reseteada por él (R10.6) no pueden navegar a ninguna ruta protegida
  // hasta cambiarla. Las cuentas migradas (R10.4) traen este flag en false,
  // así que nunca caen acá.
  if (usuario.debe_cambiar_password) return <Navigate to="/cambiar-password" replace />
  return children
}


// esto es solo para proteger las rutas de usuarios sin admin, pero no es suficiente para 
// proteger, obviamente, el backend tiene la verdadera seguridad en obtener_usuario_actual 