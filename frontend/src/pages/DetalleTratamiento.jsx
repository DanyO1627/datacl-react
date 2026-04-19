import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import BarraLateral from '../components/BarraLateral'
import '../styles/detalleTratamiento.css'

const API = 'http://localhost:8000'

const COLOR_RIESGO = {
  BAJO:  { clase: 'riesgo-bajo',  etiqueta: 'Riesgo bajo' },
  MEDIO: { clase: 'riesgo-medio', etiqueta: 'Riesgo medio' },
  ALTO:  { clase: 'riesgo-alto',  etiqueta: 'Riesgo alto' },
}

const COLOR_ESTADO = {
  PENDIENTE: { clase: 'estado-pendiente', etiqueta: 'Pendiente' },
  COMPLETO:  { clase: 'estado-completo',  etiqueta: 'Completo' },
}

export default function DetalleTratamiento() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { token } = useAuth()

  const [tratamiento, setTratamiento] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [modalEliminar, setModalEliminar] = useState(false)
  const [eliminando, setEliminando] = useState(false)

  useEffect(() => {
    async function cargar() {
      try {
        const res = await fetch(`${API}/tratamientos/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error('No encontrado')
        setTratamiento(await res.json())
      } catch {
        setError('No se pudo cargar el tratamiento.')
      } finally {
        setCargando(false)
      }
    }
    cargar()
  }, [id, token])

  async function confirmarEliminar() {
    setEliminando(true)
    try {
      const res = await fetch(`${API}/tratamientos/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Error al eliminar')
      navigate('/mis-tratamientos')
    } catch {
      setError('No se pudo eliminar el tratamiento.')
      setModalEliminar(false)
    } finally {
      setEliminando(false)
    }
  }

  if (cargando) {
    return (
      <div className="detalle-layout">
        <BarraLateral />
        <main className="detalle-main">
          <div className="detalle-cargando">Cargando tratamiento...</div>
        </main>
      </div>
    )
  }

  if (error && !tratamiento) {
    return (
      <div className="detalle-layout">
        <BarraLateral />
        <main className="detalle-main">
          <p className="detalle-error">{error}</p>
          <Link to="/mis-tratamientos" className="detalle-volver">← Volver a mis tratamientos</Link>
        </main>
      </div>
    )
  }

  const riesgo = COLOR_RIESGO[tratamiento.nivel_riesgo] || COLOR_RIESGO.BAJO
  const estado = COLOR_ESTADO[tratamiento.estado] || COLOR_ESTADO.PENDIENTE
  const fechaFormato = new Date(tratamiento.fecha).toLocaleDateString('es-CL', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  return (
    <div className="detalle-layout">
      <BarraLateral />

      <main className="detalle-main">

        {/* Breadcrumb */}
        <nav className="detalle-breadcrumb">
          <Link to="/mis-tratamientos">Mis tratamientos</Link>
          <span>/</span>
          <span>{tratamiento.tipo}</span>
        </nav>

        {/* Header con badge de riesgo */}
        <div className="detalle-header">
          <div>
            <h1 className="detalle-titulo">{tratamiento.tipo}</h1>
            <span className={`detalle-estado-badge ${estado.clase}`}>{estado.etiqueta}</span>
          </div>
          <div className="detalle-acciones">
            <button className="btn-editar" onClick={() => navigate(`/tratamientos/${id}/editar`)}>
              Editar
            </button>
            <button className="btn-eliminar" onClick={() => setModalEliminar(true)}>
              Eliminar
            </button>
          </div>
        </div>

        {/* Badge de riesgo grande */}
        <div className={`detalle-riesgo-badge ${riesgo.clase}`}>
          {riesgo.etiqueta}
        </div>

        {/* Dos columnas de información */}
        <div className="detalle-columnas">

          {/* Columna izquierda */}
          <div className="detalle-columna">
            <h2 className="detalle-columna-titulo">Información del tratamiento</h2>

            <div className="detalle-campo">
              <span className="detalle-campo-label">Tipo</span>
              <span className="detalle-campo-valor">{tratamiento.tipo}</span>
            </div>

            <div className="detalle-campo">
              <span className="detalle-campo-label">Fecha de registro</span>
              <span className="detalle-campo-valor">{fechaFormato}</span>
            </div>

            <div className="detalle-campo">
              <span className="detalle-campo-label">Finalidad</span>
              <span className="detalle-campo-valor detalle-campo-pendiente">Por completar</span>
            </div>

            <div className="detalle-campo">
              <span className="detalle-campo-label">Base legal</span>
              <span className="detalle-campo-valor detalle-campo-pendiente">Por completar</span>
            </div>

            <div className="detalle-campo">
              <span className="detalle-campo-label">Destinatarios</span>
              <span className="detalle-campo-valor detalle-campo-pendiente">Por completar</span>
            </div>

            <div className="detalle-campo">
              <span className="detalle-campo-label">Sale al extranjero</span>
              <span className="detalle-campo-valor detalle-campo-pendiente">Por completar</span>
            </div>
          </div>

          {/* Columna derecha */}
          <div className="detalle-columna">
            <h2 className="detalle-columna-titulo">Datos personales involucrados</h2>

            <div className="detalle-campo">
              <span className="detalle-campo-label">Categorías de datos</span>
              <div className="detalle-badges">
                <span className="detalle-badge detalle-badge-gris">Por completar</span>
              </div>
            </div>

            <div className="detalle-campo">
              <span className="detalle-campo-label">Datos sensibles</span>
              <span className="detalle-campo-valor detalle-campo-pendiente">Por completar</span>
            </div>

            <div className="detalle-campo">
              <span className="detalle-campo-label">Plazo de conservación</span>
              <span className="detalle-campo-valor detalle-campo-pendiente">Por completar</span>
            </div>

            <div className="detalle-campo">
              <span className="detalle-campo-label">Medidas de seguridad</span>
              <span className="detalle-campo-valor detalle-campo-pendiente">Por completar</span>
            </div>
          </div>
        </div>

        {/* Sección evaluación de riesgo (estático hasta Sprint 4) */}
        <div className="detalle-evaluacion">
          <h2 className="detalle-columna-titulo">Evaluación de riesgo</h2>
          <div className="detalle-evaluacion-grid">
            <div className="detalle-eval-item">
              <span className="detalle-eval-label">Probabilidad</span>
              <div className="detalle-eval-barra">
                <div className="detalle-eval-relleno detalle-eval-pendiente" style={{ width: '0%' }} />
              </div>
              <span className="detalle-eval-valor detalle-campo-pendiente">Pendiente evaluación</span>
            </div>
            <div className="detalle-eval-item">
              <span className="detalle-eval-label">Impacto</span>
              <div className="detalle-eval-barra">
                <div className="detalle-eval-relleno detalle-eval-pendiente" style={{ width: '0%' }} />
              </div>
              <span className="detalle-eval-valor detalle-campo-pendiente">Pendiente evaluación</span>
            </div>
          </div>
          <p className="detalle-eval-nota">
            La evaluación automática estará disponible en la próxima versión.
          </p>
        </div>

        {error && <p className="detalle-error">{error}</p>}
      </main>

      {/* Modal confirmar eliminar */}
      {modalEliminar && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3 className="modal-titulo">¿Eliminar tratamiento?</h3>
            <p className="modal-texto">
              Esta acción no se puede deshacer. Se eliminará el tratamiento
              <strong> "{tratamiento.tipo}"</strong> y todos sus datos asociados.
            </p>
            <div className="modal-acciones">
              <button className="btn-modal-cancelar" onClick={() => setModalEliminar(false)} disabled={eliminando}>
                Cancelar
              </button>
              <button className="btn-modal-eliminar" onClick={confirmarEliminar} disabled={eliminando}>
                {eliminando ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
