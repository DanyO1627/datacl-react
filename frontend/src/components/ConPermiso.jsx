import { useAuth } from '../context/AuthContext'

// R10.12 — hermano de RutaConPermiso.jsx pero para ocultar un elemento
// suelto (un botón, un link) en vez de una ruta completa. Sirve para las
// pantallas donde se puede entrar con un permiso más amplio (ej.
// tratamientos_ver) pero un botón puntual dispara una acción que el backend
// protege con un permiso más específico (ej. tratamientos_editar) — sin
// esto, el botón se ve igual para todos y solo falla en silencio con un 403
// al hacer clic.
//
// Uso:
//   <ConPermiso modulo="tratamientos" accion="editar"><button>Editar</button></ConPermiso>
export default function ConPermiso({ modulo, accion, children }) {
  const { tienePermiso } = useAuth()
  if (!tienePermiso(modulo, accion)) return null
  return children
}
