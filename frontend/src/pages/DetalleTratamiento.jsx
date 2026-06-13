import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import BarraLateral from '../components/BarraLateral'
import '../styles/detalleTratamiento.css'
import BarraRiesgo from '../components/BarraRiesgo'

const API = 'http://localhost:8000'

// ── Mapas de valores internos a texto legible ──────────────────────────────

const BASE_LEGAL = {
  consentimiento:   "Consentimiento (Art. 12 letra a)",
  contrato:         "Ejecución de contrato (Art. 12 letra b)",
  obligacion_legal: "Obligación legal (Art. 12 letra c)",
  interes_vital:    "Interés vital (Art. 12 letra d)",
  interes_publico:  "Interés público (Art. 12 letra e)",
  interes_legitimo: "Interés legítimo (Art. 12 letra f)",
}

const PLAZO = {
  "1_anio":          "1 año",
  "2_anios":         "2 años",
  "5_anios":         "5 años",
  "10_anios":        "10 años",
  indefinido:        "Indefinido",
  duracion_relacion: "Mientras dure la relación contractual",
  otro:              "Otro",
}


const ORIGEN = {
  titular:          "Del propio titular",
  terceros:         "De terceros",
  fuentes_publicas: "De fuentes públicas",
}

const TITULARES = {
  empleados:   "Empleados y funcionarios",
  clientes:    "Clientes y consumidores",
  proveedores: "Proveedores y contratistas",
  usuarios:    "Usuarios de plataformas digitales",
  ciudadanos:  "Ciudadanos",
  estudiantes: "Estudiantes",
  pacientes:   "Pacientes",
}

const MEDIDAS = {
  cifrado:     "Cifrado de datos",
  acceso_rol:  "Control de acceso por rol",
  backups:     "Backups periódicos",
  contraseñas: "Política de contraseñas",
  auditoria:   "Auditoría de accesos",
}

const COLOR_RIESGO = {
  BAJO:  { clase: 'riesgo-bajo',  etiqueta: 'Riesgo bajo' },
  MEDIO: { clase: 'riesgo-medio', etiqueta: 'Riesgo medio' },
  ALTO:  { clase: 'riesgo-alto',  etiqueta: 'Riesgo alto' },
}

const COLOR_ESTADO = {
  PENDIENTE: { clase: 'estado-pendiente', etiqueta: 'Pendiente' },
  COMPLETO:  { clase: 'estado-completo',  etiqueta: 'Completo' },
}

// ── Helpers ────────────────────────────────────────────────────────────────

function parsearMedidas(str) {
  if (!str) return []
  // "otras:" marca el inicio del texto libre y puede contener comas o saltos
  // de línea propios — todo lo que sigue hasta el final pertenece a ese texto.
  const idxOtras = str.indexOf("otras:")
  if (idxOtras !== -1) {
    const antes = str.slice(0, idxOtras).replace(/,$/, "")
    const libre = str.slice(idxOtras + "otras:".length)
    const items = antes ? antes.split(",").filter(Boolean).map(m => MEDIDAS[m] || m) : []
    items.push(`Otras: ${libre}`)
    return items
  }
  return str.split(",").filter(Boolean).map(m => m === "otras" ? "Otras" : (MEDIDAS[m] || m))
}

function parsearTitulares(str) {
  if (!str) return []
  return str.split(",").filter(Boolean).map(id => TITULARES[id] || id)
}

// ── Sub-componentes ────────────────────────────────────────────────────────

function Campo({ label, children }) {
  return (
    <div className="detalle-campo">
      <span className="detalle-campo-label">{label}</span>
      {children}
    </div>
  )
}

function Valor({ v, mapa }) {
  const texto = mapa ? (mapa[v] || v) : v
  if (!texto) return <span className="detalle-campo-pendiente">Por completar</span>
  return <span className="detalle-campo-valor">{texto}</span>
}

function Badges({ items }) {
  if (!items || items.length === 0)
    return <span className="detalle-campo-pendiente">Por completar</span>
  return (
    <div className="detalle-badges">
      {items.map((item, i) => (
        <span key={i} className="detalle-badge detalle-badge-azul">{item}</span>
      ))}
    </div>
  )
}

// ── Componente principal ───────────────────────────────────────────────────

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
  const estado = COLOR_ESTADO[tratamiento.estado]   || COLOR_ESTADO.PENDIENTE
  const d      = tratamiento.detalle  // puede ser null en tratamientos anteriores
  const fechaFormato = new Date(tratamiento.creado_en).toLocaleDateString('es-CL', {
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
          <span>{tratamiento.nombre}</span>
        </nav>

        {/* Header con acciones */}
        <div className="detalle-header">
          <div>
            <h1 className="detalle-titulo">{tratamiento.nombre}</h1>
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

        {/* Badge de riesgo */}
        <div className={`detalle-riesgo-badge ${riesgo.clase}`}>
          {riesgo.etiqueta}
        </div>

        {/* ── Sección 1: Información general ── */}
        <div className="detalle-columnas">
          <div className="detalle-columna">
            <h2 className="detalle-columna-titulo">Información general</h2>

            <Campo label="Nombre">
              <span className="detalle-campo-valor">{tratamiento.nombre}</span>
            </Campo>
            <Campo label="Fecha de registro">
              <span className="detalle-campo-valor">{fechaFormato}</span>
            </Campo>
            <Campo label="Finalidad">
              <Valor v={tratamiento.finalidad} />
            </Campo>
            <Campo label="Base legal">
              <Valor v={tratamiento.base_legal} mapa={BASE_LEGAL} />
            </Campo>
          </div>

          <div className="detalle-columna">
            <h2 className="detalle-columna-titulo">Datos y conservación</h2>

            <Campo label="Datos sensibles">
              <span className="detalle-campo-valor">{tratamiento.datos_sensibles ? 'Sí' : 'No'}</span>
            </Campo>
            <Campo label="Decisiones automatizadas">
              <span className="detalle-campo-valor">{tratamiento.decisiones_automatizadas ? 'Sí' : 'No'}</span>
            </Campo>
            <Campo label="Plazo de conservación">
              <Valor
                v={
                  tratamiento.plazo_conservacion === "otro" && tratamiento.plazo_otro
                    ? tratamiento.plazo_otro
                    : tratamiento.plazo_conservacion
                }
                mapa={PLAZO}
              />
            </Campo>
            <Campo label="Destinatarios">
              <Valor v={tratamiento.destinatarios} />
            </Campo>
            <Campo label="Sale al extranjero">
              <span className="detalle-campo-valor">{tratamiento.sale_extranjero ? 'Sí' : 'No'}</span>
            </Campo>
            <Campo label="Medidas de seguridad">
              <Badges items={parsearMedidas(tratamiento.medidas_seguridad)} />
            </Campo>
          </div>
        </div>

        {/* ── Sección 2: Responsable del tratamiento ── */}
        <div className="detalle-seccion">
          <h2 className="detalle-columna-titulo">Responsable del tratamiento</h2>
          <div className="detalle-seccion-campos">
            <Campo label="Responsable">
              <Valor v={d?.responsable_tratamiento} />
            </Campo>
            <Campo label="Departamento o área">
              <Valor v={d?.departamento} />
            </Campo>
            <Campo label="Rol">
              <span className="detalle-campo-valor">
                {d ? (d.es_responsable ? 'Responsable' : 'Encargado') : '—'}
              </span>
            </Campo>
          </div>
        </div>

        {/* ── Sección 3: Sobre los titulares ── */}
        <div className="detalle-seccion">
          <h2 className="detalle-columna-titulo">Sobre los titulares</h2>
          <div className="detalle-seccion-campos">
            <Campo label="Categorías de titulares">
              <Badges items={parsearTitulares(d?.categorias_titulares)} />
            </Campo>
            <Campo label="Universo de titulares">
              <Valor v={d?.universo_titulares} />
            </Campo>
            <Campo label="Origen de los datos">
              <Valor v={d?.origen_datos} mapa={ORIGEN} />
            </Campo>
          </div>
        </div>

        {/* ── Sección 4: Evaluación de riesgo ── */}
        <div className="detalle-evaluacion">
          <h2 className="detalle-columna-titulo">Evaluación de riesgo</h2>
          <div className="detalle-evaluacion-grid">
            <BarraRiesgo label="Probabilidad" valor={tratamiento.probabilidad} />
            <BarraRiesgo label="Impacto"      valor={tratamiento.impacto} />
          </div>
          <p className="detalle-eval-nota">
            {tratamiento.fecha_evaluacion
              ? `Evaluado el ${new Date(tratamiento.fecha_evaluacion).toLocaleDateString('es-CL', {
                  year: 'numeric', month: 'long', day: 'numeric',
                })} · Metodología AEPD adaptada a Ley 21.719`
              : 'Sin evaluación registrada aún.'
            }
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
              <strong> "{tratamiento.nombre}"</strong> y todos sus datos asociados.
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
