import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import BarraLateral from '../components/BarraLateral'
import '../styles/editarTratamiento.css'

const API = 'http://localhost:8000'

const PASOS = ['Información básica', 'Datos tratados', 'Nivel de riesgo']

const TIPOS_TRATAMIENTO = [
  'Gestión de clientes',
  'Recursos humanos',
  'Nómina y remuneraciones',
  'Marketing y comunicaciones',
  'Seguridad y vigilancia',
  'Salud y bienestar laboral',
  'Servicios financieros',
  'Otro',
]

export default function EditarTratamiento() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { token } = useAuth()

  const [paso, setPaso] = useState(1)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    tipo: '',
    estado: 'PENDIENTE',
    nivel_riesgo: 'BAJO',
  })

  useEffect(() => {
    async function cargar() {
      try {
        const res = await fetch(`${API}/tratamientos/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error('No encontrado')
        const data = await res.json()
        setForm({
          tipo: data.tipo,
          estado: data.estado,
          nivel_riesgo: data.nivel_riesgo,
        })
      } catch {
        setError('No se pudo cargar el tratamiento.')
      } finally {
        setCargando(false)
      }
    }
    cargar()
  }, [id, token])

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  function siguiente() {
    if (paso < 3) setPaso(paso + 1)
  }

  function anterior() {
    if (paso > 1) setPaso(paso - 1)
  }

  async function guardar() {
    setGuardando(true)
    setError('')
    try {
      const res = await fetch(`${API}/tratamientos/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.detail || 'Error al guardar')
      }
      navigate('/mis-tratamientos')
    } catch (e) {
      setError(e.message)
    } finally {
      setGuardando(false)
    }
  }

  if (cargando) {
    return (
      <div className="editar-layout">
        <BarraLateral />
        <main className="editar-main">
          <div className="editar-cargando">Cargando tratamiento...</div>
        </main>
      </div>
    )
  }

  return (
    <div className="editar-layout">
      <BarraLateral />

      <main className="editar-main">
        <div className="editar-card">
          <h1 className="editar-titulo">Editar tratamiento</h1>

          {/* Barra de progreso */}
          <div className="editar-progreso">
            {PASOS.map((nombre, i) => (
              <div key={i} className={`editar-paso ${paso === i + 1 ? 'activo' : ''} ${paso > i + 1 ? 'completado' : ''}`}>
                <div className="editar-paso-numero">{paso > i + 1 ? '✓' : i + 1}</div>
                <span className="editar-paso-nombre">{nombre}</span>
              </div>
            ))}
          </div>

          {/* Paso 1 */}
          {paso === 1 && (
            <div className="editar-seccion">
              <h2 className="editar-subtitulo">Información básica</h2>
              <p className="editar-descripcion">
                Indica el tipo de tratamiento de datos que realiza tu organización.
              </p>
              <div className="campo">
                <label>Tipo de tratamiento</label>
                <select name="tipo" value={form.tipo} onChange={handleChange}>
                  <option value="">Selecciona una opción</option>
                  {TIPOS_TRATAMIENTO.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Paso 2 */}
          {paso === 2 && (
            <div className="editar-seccion">
              <h2 className="editar-subtitulo">Datos tratados</h2>
              <p className="editar-descripcion">
                Indica el estado actual de este tratamiento.
              </p>
              <div className="campo">
                <label>Estado del tratamiento</label>
                <select name="estado" value={form.estado} onChange={handleChange}>
                  <option value="PENDIENTE">Pendiente</option>
                  <option value="COMPLETO">Completo</option>
                </select>
              </div>
            </div>
          )}

          {/* Paso 3 */}
          {paso === 3 && (
            <div className="editar-seccion">
              <h2 className="editar-subtitulo">Nivel de riesgo</h2>
              <p className="editar-descripcion">
                Clasifica el nivel de riesgo que representa este tratamiento.
              </p>
              <div className="campo">
                <label>Nivel de riesgo</label>
                <select name="nivel_riesgo" value={form.nivel_riesgo} onChange={handleChange}>
                  <option value="BAJO">Bajo</option>
                  <option value="MEDIO">Medio</option>
                  <option value="ALTO">Alto</option>
                </select>
              </div>

              <button
                className="btn-recalcular"
                type="button"
                onClick={() => alert('Disponible en próxima versión')}
              >
                Recalcular nivel de riesgo
              </button>
            </div>
          )}

          {error && <p className="editar-error">{error}</p>}

          {/* Navegación */}
          <div className="editar-navegacion">
            {paso > 1 && (
              <button className="btn-anterior" onClick={anterior}>
                ← Anterior
              </button>
            )}
            {paso < 3 ? (
              <button className="btn-siguiente" onClick={siguiente} disabled={paso === 1 && !form.tipo}>
                Siguiente →
              </button>
            ) : (
              <button className="btn-guardar" onClick={guardar} disabled={guardando}>
                {guardando ? 'Guardando...' : 'Guardar cambios'}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
