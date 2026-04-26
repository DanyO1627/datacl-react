// frontend/src/pages/EditarTratamiento.jsx
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import BarraLateral from '../components/BarraLateral'
import '../styles/editarTratamiento.css'

const API = 'http://localhost:8000'

const PASOS = ['Información básica', 'Datos tratados', 'Nivel de riesgo']

const BASES_LEGALES = [
  'Consentimiento del titular',
  'Obligación legal',
  'Interés legítimo',
  'Ejecución de contrato',
  'Interés vital',
  'Misión de interés público',
]

// ── Colores y etiquetas por nivel de riesgo ────────────────────
const RIESGO_CONFIG = {
  BAJO: { color: '#16a34a', bg: '#f0fdf4', borde: '#86efac', etiqueta: 'Bajo' },
  MEDIO: { color: '#d97706', bg: '#fffbeb', borde: '#fde68a', etiqueta: 'Medio' },
  ALTO: { color: '#dc2626', bg: '#fff5f5', borde: '#fecaca', etiqueta: 'Alto' },
}

// ── Badge de nivel de riesgo ───────────────────────────────────
function BadgeRiesgo({ nivel }) {
  if (!nivel) return null
  const cfg = RIESGO_CONFIG[nivel] || RIESGO_CONFIG.BAJO
  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 12px',
      borderRadius: '20px',
      fontSize: '13px',
      fontWeight: 700,
      color: cfg.color,
      background: cfg.bg,
      border: `1px solid ${cfg.borde}`,
    }}>
      {cfg.etiqueta}
    </span>
  )
}

export default function EditarTratamiento() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { token } = useAuth()

  const [paso, setPaso] = useState(1)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [recalculando, setRecalculando] = useState(false)
  const [error, setError] = useState('')

  // ── Resultado visual del recálculo (solo visual, no guardado aún) ──
  const [resultadoRiesgo, setResultadoRiesgo] = useState(null)
  // { nivel_riesgo, probabilidad, impacto, fecha_evaluacion }

  const [form, setForm] = useState({
    nombre: '',
    finalidad: '',
    base_legal: '',
    datos_sensibles: false,
    destinatarios: '',
    plazo_conservacion: '',
    medidas_seguridad: '',
    sale_extranjero: false,
    decisiones_automatizadas: false,
    estado: 'PENDIENTE',
    nivel_riesgo: 'BAJO',
  })

  // ── Cargar tratamiento existente ───────────────────────────────
  useEffect(() => {
    async function cargar() {
      try {
        const res = await fetch(`${API}/tratamientos/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error('No encontrado')
        const data = await res.json()
        setForm({
          nombre: data.nombre || '',
          finalidad: data.finalidad || '',
          base_legal: data.base_legal || '',
          datos_sensibles: data.datos_sensibles || false,
          destinatarios: data.destinatarios || '',
          plazo_conservacion: data.plazo_conservacion || '',
          medidas_seguridad: data.medidas_seguridad || '',
          sale_extranjero: data.sale_extranjero || false,
          decisiones_automatizadas: data.decisiones_automatizadas || false,
          estado: data.estado || 'PENDIENTE',
          nivel_riesgo: data.nivel_riesgo || 'BAJO',
        })
        // Mostrar el riesgo actual como resultado inicial
        if (data.nivel_riesgo) {
          setResultadoRiesgo({
            nivel_riesgo: data.nivel_riesgo,
            probabilidad: data.probabilidad || null,
            impacto: data.impacto || null,
            fecha_evaluacion: data.fecha_evaluacion || null,
          })
        }
      } catch {
        setError('No se pudo cargar el tratamiento.')
      } finally {
        setCargando(false)
      }
    }
    cargar()
  }, [id, token])

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value })
    // Si cambian datos que afectan el riesgo, limpiar resultado previo
    if (['datos_sensibles', 'sale_extranjero', 'decisiones_automatizadas',
      'medidas_seguridad', 'plazo_conservacion'].includes(name)) {
      setResultadoRiesgo(null)
    }
  }

  // ── Recalcular riesgo (solo visual, no guarda) ─────────────────
  async function recalcular() {
    setRecalculando(true)
    setError('')
    try {
      const res = await fetch(`${API}/tratamientos/${id}/evaluar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error()
      const data = await res.json()

      // Guardar resultado para mostrarlo — NO actualiza el form aún
      setResultadoRiesgo({
        nivel_riesgo: data.nivel_riesgo,
        probabilidad: data.probabilidad,
        impacto: data.impacto,
        fecha_evaluacion: data.fecha_evaluacion,
      })

      // Sí actualizamos nivel_riesgo en el form para que se guarde correctamente
      setForm(f => ({ ...f, nivel_riesgo: data.nivel_riesgo }))

    } catch {
      setError('No se pudo recalcular el riesgo. Intenta nuevamente.')
    } finally {
      setRecalculando(false)
    }
  }

  // ── Guardar ────────────────────────────────────────────────────
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
              <div
                key={i}
                className={`editar-paso ${paso === i + 1 ? 'activo' : ''} ${paso > i + 1 ? 'completado' : ''}`}
              >
                <div className="editar-paso-numero">{paso > i + 1 ? '✓' : i + 1}</div>
                <span className="editar-paso-nombre">{nombre}</span>
              </div>
            ))}
          </div>

          {/* ── Paso 1 — Información básica ─────────────────────── */}
          {paso === 1 && (
            <div className="editar-seccion">
              <h2 className="editar-subtitulo">Información básica</h2>
              <p className="editar-descripcion">Datos principales del tratamiento RAT.</p>

              <div className="campo">
                <label>Nombre del tratamiento</label>
                <input name="nombre" value={form.nombre} onChange={handleChange} placeholder="Ej: Gestión de clientes" />
              </div>

              <div className="campo">
                <label>Finalidad</label>
                <input name="finalidad" value={form.finalidad} onChange={handleChange} placeholder="¿Para qué se usan los datos?" />
              </div>

              <div className="campo">
                <label>Base legal</label>
                <select name="base_legal" value={form.base_legal} onChange={handleChange}>
                  <option value="">Selecciona una opción</option>
                  {BASES_LEGALES.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>

              <div className="campo">
                <label>Destinatarios</label>
                <input name="destinatarios" value={form.destinatarios} onChange={handleChange} placeholder="¿Quién recibe los datos?" />
              </div>
            </div>
          )}

          {/* ── Paso 2 — Datos tratados ──────────────────────────── */}
          {paso === 2 && (
            <div className="editar-seccion">
              <h2 className="editar-subtitulo">Datos tratados</h2>
              <p className="editar-descripcion">Características de los datos personales involucrados.</p>

              <div className="campo">
                <label>Plazo de conservación</label>
                <input name="plazo_conservacion" value={form.plazo_conservacion} onChange={handleChange} placeholder="Ej: 5 años" />
              </div>

              <div className="campo">
                <label>Medidas de seguridad</label>
                <input name="medidas_seguridad" value={form.medidas_seguridad} onChange={handleChange} placeholder="Ej: Cifrado, control de acceso" />
              </div>

              <div className="campo">
                <label style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" name="datos_sensibles" checked={form.datos_sensibles} onChange={handleChange} />
                  Incluye datos sensibles
                </label>
              </div>

              <div className="campo">
                <label style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" name="sale_extranjero" checked={form.sale_extranjero} onChange={handleChange} />
                  Sale al extranjero
                </label>
              </div>

              <div className="campo">
                <label style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" name="decisiones_automatizadas" checked={form.decisiones_automatizadas} onChange={handleChange} />
                  Incluye decisiones automatizadas
                </label>
              </div>

              <div className="campo">
                <label>Estado</label>
                <select name="estado" value={form.estado} onChange={handleChange}>
                  <option value="PENDIENTE">Pendiente</option>
                  <option value="COMPLETO">Completo</option>
                </select>
              </div>
            </div>
          )}

          {/* ── Paso 3 — Nivel de riesgo ─────────────────────────── */}
          {paso === 3 && (
            <div className="editar-seccion">
              <h2 className="editar-subtitulo">Nivel de riesgo</h2>
              <p className="editar-descripcion">
                Usa el botón para calcular el riesgo basado en los datos ingresados.
                El resultado es solo visual — se guarda cuando apretes "Guardar cambios".
              </p>

              {/* Selector manual (respaldo) */}
              <div className="campo">
                <label>Nivel de riesgo actual</label>
                <select name="nivel_riesgo" value={form.nivel_riesgo} onChange={handleChange}>
                  <option value="BAJO">Bajo</option>
                  <option value="MEDIO">Medio</option>
                  <option value="ALTO">Alto</option>
                </select>
              </div>

              {/* Botón recalcular */}
              <button
                className="btn-recalcular"
                type="button"
                onClick={recalcular}
                disabled={recalculando}
                style={{ marginBottom: '1.2rem' }}
              >
                {recalculando ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="editar-spinner" />
                    Calculando…
                  </span>
                ) : '⟳ Recalcular nivel de riesgo'}
              </button>

              {/* ── Resultado del recálculo ───────────────────────── */}
              {resultadoRiesgo && (
                <div className="editar-resultado-riesgo">
                  <p className="editar-resultado-titulo">Resultado del análisis</p>

                  <div className="editar-resultado-fila">
                    <span className="editar-resultado-label">Nivel de riesgo</span>
                    <BadgeRiesgo nivel={resultadoRiesgo.nivel_riesgo} />
                  </div>

                  {resultadoRiesgo.probabilidad && (
                    <div className="editar-resultado-fila">
                      <span className="editar-resultado-label">Probabilidad</span>
                      <BadgeRiesgo nivel={resultadoRiesgo.probabilidad} />
                    </div>
                  )}

                  {resultadoRiesgo.impacto && (
                    <div className="editar-resultado-fila">
                      <span className="editar-resultado-label">Impacto</span>
                      <BadgeRiesgo nivel={resultadoRiesgo.impacto} />
                    </div>
                  )}

                  {resultadoRiesgo.fecha_evaluacion && (
                    <div className="editar-resultado-fila">
                      <span className="editar-resultado-label">Evaluado</span>
                      <span className="editar-resultado-fecha">
                        {new Date(resultadoRiesgo.fecha_evaluacion).toLocaleString('es-CL')}
                      </span>
                    </div>
                  )}

                  <p className="editar-resultado-nota">
                    ℹ️ Este resultado se guardará al apretar "Guardar cambios".
                  </p>
                </div>
              )}
            </div>
          )}

          {error && <p className="editar-error">{error}</p>}

          {/* Navegación */}
          <div className="editar-navegacion">
            {paso > 1 && (
              <button className="btn-anterior" onClick={() => setPaso(paso - 1)}>
                ← Anterior
              </button>
            )}
            {paso < 3 ? (
              <button
                className="btn-siguiente"
                onClick={() => setPaso(paso + 1)}
                disabled={paso === 1 && !form.nombre}
              >
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