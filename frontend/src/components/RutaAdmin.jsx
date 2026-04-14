import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function RutaAdmin({ children }) {
  const { usuario } = useAuth()
  if (!usuario) return <Navigate to="/login" replace />
  if (usuario.rol !== 'ADMIN') return <Navigate to="/dashboard" replace />
  return children
}
