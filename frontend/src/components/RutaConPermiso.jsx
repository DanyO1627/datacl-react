import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import RutaProtegida from './RutaProtegida'

// R10.8 — variante de RutaProtegida que además exige un permiso granular
// puntual. No duplica la lógica de sesión (sin usuario -> login, rol ADMIN ->
// panel de plataforma, debe_cambiar_password -> pantalla obligatoria): la
// delega envolviendo el propio RutaProtegida, y solo agrega el check de
// permiso como una capa encima, una vez que ya se sabe que hay una sesión
// válida y utilizable.
//
// Uso normal (un solo permiso exigido):
//   <RutaConPermiso modulo="tratamientos" accion="ver"><MisTratamientos /></RutaConPermiso>
//
// Uso con alternativas (basta con UNO de la lista — "o" en vez de "y"):
//   <RutaConPermiso permisos={[{modulo:"tratamientos",accion:"crear"},{modulo:"tratamientos",accion:"editar"}]}>
// Necesario para el wizard compartido /nuevo-tratamiento (Paso1-4): lo usa
// tanto quien está CREANDO (necesita "crear") como quien está EDITANDO
// (EditarTratamiento.jsx redirige ahí para reutilizar el mismo formulario,
// y esa persona solo tiene "editar" — no necesariamente "crear").
//
// Esto es solo la capa visual/de navegación — R10.3 ya protege el dato real
// en el backend (requiere_permiso), así que esto no reemplaza esa barrera,
// solo evita que alguien sin el permiso llegue a ver la pantalla vacía o con
// errores 403 en cascada.
export default function RutaConPermiso({ modulo, accion, permisos, children }) {
  return (
    <RutaProtegida>
      <ConGuardPermiso modulo={modulo} accion={accion} permisos={permisos}>
        {children}
      </ConGuardPermiso>
    </RutaProtegida>
  )
}

function ConGuardPermiso({ modulo, accion, permisos, children }) {
  const { tienePermiso } = useAuth()
  const lista = permisos || [{ modulo, accion }]
  const autorizado = lista.some((p) => tienePermiso(p.modulo, p.accion))
  if (!autorizado) return <Navigate to="/dashboard" replace />
  return children
}
