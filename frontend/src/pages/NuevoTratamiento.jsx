import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import BarraLateral from '../components/BarraLateral'
import { useLocation } from "react-router-dom";
import '../styles/editarTratamiento.css'

// dentro del componente, antes del useState:
const { state: datosAnalisis } = useLocation();

// y en el useState del form, agrega:
const [form, setForm] = useState({
  tipo: '',
  nivel_riesgo: 'BAJO',
  campos_detectados: datosAnalisis?.campos_detectados ?? [],
});
const API = 'http://localhost:8000'

const PASOS = ['Información básica', 'Nivel de riesgo']

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

export default function NuevoTratamiento() {
  const navigate = useNavigate()
  const { token } = useAuth()

  const [paso, setPaso] = useState(1)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    tipo: '',
    nivel_riesgo: 'BAJO',
  })

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function guardar() {
    setGuardando(true)
    setError('')
    try {
      const res = await fetch(`${API}/tratamientos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.detail || 'Error al crear')
      }
      const nuevo = await res.json()
      navigate(`/tratamientos/${nuevo.id}`)
    } catch (e) {
      setError(e.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="editar-layout">
      <BarraLateral />

      <main className="editar-main">
        <div className="editar-card">
          <h1 className="editar-titulo">Nuevo tratamiento</h1>

          <div className="editar-progreso">
            {PASOS.map((nombre, i) => (
              <div key={i} className={`editar-paso ${paso === i + 1 ? 'activo' : ''} ${paso > i + 1 ? 'completado' : ''}`}>
                <div className="editar-paso-numero">{paso > i + 1 ? '✓' : i + 1}</div>
                <span className="editar-paso-nombre">{nombre}</span>
              </div>
            ))}
          </div>

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
                  {TIPOS_TRATAMIENTO.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {paso === 2 && (
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
            </div>
          )}

          {error && <p className="editar-error">{error}</p>}

          <div className="editar-navegacion">
            {paso > 1 && (
              <button className="btn-anterior" onClick={() => setPaso(paso - 1)}>
                ← Anterior
              </button>
            )}
            {paso < 2 ? (
              <button className="btn-siguiente" onClick={() => setPaso(2)} disabled={!form.tipo}>
                Siguiente →
              </button>
            ) : (
              <button className="btn-guardar" onClick={guardar} disabled={guardando}>
                {guardando ? 'Creando...' : 'Crear tratamiento'}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
