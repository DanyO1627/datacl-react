import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useFormulario } from '../context/FormularioContext'
import { mapearTratamientoAForm } from '../utils/mapearTratamiento'
import BarraLateral from '../components/BarraLateral'
import '../styles/editarTratamiento.css'

const API = '/api'

export default function EditarTratamiento() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { token } = useAuth()
  const { cargarFormCompleto } = useFormulario()
  const [error, setError] = useState('')

  useEffect(() => {
    async function cargar() {
      try {
        const res = await fetch(`${API}/tratamientos/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error('No encontrado')
        const data = await res.json()

        cargarFormCompleto({
          ...mapearTratamientoAForm(data),
          modoEdicion: true,
          tratamientoEditId: Number(id),
        })

        // Pasar un state no vacío evita que el efecto de "limpiar sesión
        // residual" de Paso1 (que solo debe correr cuando se llega ahí
        // SIN venir de un flujo real) borre los datos que se acaban de cargar.
        navigate('/nuevo-tratamiento', { replace: true, state: { modoEdicion: true } })
      } catch {
        setError('No se pudo cargar el tratamiento.')
      }
    }
    cargar()
  }, [id, token])

  if (error) {
    return (
      <div className="editar-layout">
        <BarraLateral />
        <main className="editar-main">
          <p className="editar-error">{error}</p>
          <button className="btn-anterior" onClick={() => navigate(-1)}>Volver</button>
        </main>
      </div>
    )
  }

  return (
    <div className="editar-layout">
      <BarraLateral />
      <main className="editar-main">
        <div className="editar-cargando">Cargando tratamiento...</div>
      </main>
    </div>
  )
}
