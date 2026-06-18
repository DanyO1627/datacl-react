import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import BarraLateral from '../components/BarraLateral'
import '../styles/detalleTratamiento.css'
import BarraRiesgo from '../components/BarraRiesgo'

const API = 'http://localhost:8000'

// ── Mapas de valores internos a texto legible ──────────────────────────────

const BASE_LEGAL = {
  consentimiento:           "Consentimiento del titular (Art. 12)",
  datos_economicos:         "Obligaciones económicas, financieras, bancarias o comerciales (Art. 13 letra a.)",
  obligacion_legal:         "Cumplimiento de obligación legal (Art. 13 letra b.)",
  contrato:                 "Ejecución o cumplimiento de un contrato (Art. 13 letra c.)",
  interes_legitimo:         "Interés legítimo del responsable o de un tercero (Art. 13 letra d.)",
  defensa_derechos:         "Formulación, ejercicio o defensa de un derecho ante tribunales (Art. 13 letra e.)",
  consentimiento_sensibles: "Consentimiento expreso del titular — datos sensibles (Art. 16 inc. 1)",
  datos_biometricos:        "Tratamiento de datos biométricos (Art. 16 ter)",
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

function Valor({ v, mapa, vacio = "Por completar" }) {
  const texto = mapa ? (mapa[v] || v) : v
  if (!texto) return <span className="detalle-campo-pendiente">{vacio}</span>
  return <span className="detalle-campo-valor">{texto}</span>
}

function ValorMultilinea({ v, vacio = "—" }) {
  if (!v) return <span className="detalle-campo-pendiente">{vacio}</span>
  return <span className="detalle-campo-valor detalle-campo-multilinea">{v}</span>
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
  const d      = tratamiento.detalle     // puede ser null en tratamientos anteriores
  const ext    = tratamiento.detalle_extendido   // null si la tabla aún no tiene fila para este tratamiento

  // Oculta una sección extendida si todos sus campos son null/vacío/undefined
  function seccionExtendidaTieneData(...campos) {
    return campos.some(v => v !== null && v !== undefined && v !== '')
  }
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
              <Badges items={tratamiento.base_legal?.split(",").filter(Boolean).map(v => BASE_LEGAL[v] || v)} />
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

        {/* ── Sección 2: Identificación del responsable ── */}
        <div className="detalle-seccion">
          <div className="detalle-seccion-header">
            <h2 className="detalle-columna-titulo">Identificación del responsable</h2>
            {tratamiento.sesion_origen && (
              <span className="detalle-sesion-origen">
                Campos provenientes de: <strong>{tratamiento.sesion_origen}</strong>
              </span>
            )}
          </div>
          <div className="detalle-seccion-campos">
            <Campo label="Responsable">
              <Valor v={d?.responsable_tratamiento} vacio="—" />
            </Campo>
            <Campo label="Departamento o área">
              <Valor v={d?.departamento} vacio="—" />
            </Campo>
            <Campo label="Rol">
              {d ? (
                <span className={`detalle-badge ${d.es_responsable ? 'detalle-badge-azul' : 'detalle-badge-morado'}`}>
                  {d.es_responsable ? 'Responsable' : 'Encargado'}
                </span>
              ) : (
                <span className="detalle-campo-pendiente">—</span>
              )}
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
              <Valor v={d?.universo_titulares} vacio="—" />
            </Campo>
            <Campo label="Origen de los datos">
              <Badges items={d?.origen_datos?.split(",").filter(Boolean).map(v => ORIGEN[v] || v)} />
            </Campo>
            <Campo label="Categoría de datos (detalle RAT)">
              {d?.categoria_datos
                ? <span className="detalle-campo-valor">{d.categoria_datos}</span>
                : <span className="detalle-campo-pendiente">No se generó una descripción detallada — puedes agregarla desde "Editar"</span>
              }
            </Campo>
          </div>
          <div className="detalle-campo detalle-campo-ancho">
            <span className="detalle-campo-label">Categoría de datos</span>
            <ValorMultilinea v={d?.categoria_datos} />
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

        {/* ── Secciones extendidas B2 (visibles solo si hay datos) ── */}

        {ext && seccionExtendidaTieneData(ext.descripcion_detallada, ext.subarea_responsable, ext.procesos_relacionados) && (
          <div className="detalle-seccion">
            <h2 className="detalle-columna-titulo">Identificación detallada</h2>
            <div className="detalle-seccion-campos">
              <Campo label="Descripción detallada">
                <ValorMultilinea v={ext.descripcion_detallada} />
              </Campo>
              <Campo label="Subárea responsable">
                <Valor v={ext.subarea_responsable} vacio="—" />
              </Campo>
              <Campo label="Procesos relacionados">
                <ValorMultilinea v={ext.procesos_relacionados} />
              </Campo>
            </div>
          </div>
        )}

        {ext && seccionExtendidaTieneData(ext.finalidades_secundarias, ext.informa_titulares, ext.documento_respaldo_permiso) && (
          <div className="detalle-seccion">
            <h2 className="detalle-columna-titulo">Finalidad y transparencia</h2>
            <div className="detalle-seccion-campos">
              <Campo label="Finalidades secundarias">
                <ValorMultilinea v={ext.finalidades_secundarias} />
              </Campo>
              <Campo label="¿Se informa a los titulares?">
                {ext.informa_titulares === null || ext.informa_titulares === undefined
                  ? <span className="detalle-campo-pendiente">—</span>
                  : <span className="detalle-campo-valor">{ext.informa_titulares ? 'Sí' : 'No'}</span>
                }
              </Campo>
              <Campo label="Documento de respaldo / permiso">
                <ValorMultilinea v={ext.documento_respaldo_permiso} />
              </Campo>
            </div>
          </div>
        )}

        {ext && seccionExtendidaTieneData(
          ext.destinatarios_internos, ext.destinatarios_nacionales, ext.destinatarios_internacionales,
          ext.terceros_son_encargados, ext.contratos_proteccion_datos,
          ext.datos_transferidos_detalle, ext.metodo_transferencia
        ) && (
          <div className="detalle-seccion">
            <h2 className="detalle-columna-titulo">Transferencias y terceros</h2>
            <div className="detalle-seccion-campos">
              <Campo label="Destinatarios internos">
                <ValorMultilinea v={ext.destinatarios_internos} />
              </Campo>
              <Campo label="Destinatarios nacionales">
                <ValorMultilinea v={ext.destinatarios_nacionales} />
              </Campo>
              <Campo label="Destinatarios internacionales">
                <ValorMultilinea v={ext.destinatarios_internacionales} />
              </Campo>
              <Campo label="¿Los terceros son encargados?">
                {ext.terceros_son_encargados === null || ext.terceros_son_encargados === undefined
                  ? <span className="detalle-campo-pendiente">—</span>
                  : <span className="detalle-campo-valor">{ext.terceros_son_encargados ? 'Sí' : 'No'}</span>
                }
              </Campo>
              <Campo label="¿Contratos de protección de datos?">
                {ext.contratos_proteccion_datos === null || ext.contratos_proteccion_datos === undefined
                  ? <span className="detalle-campo-pendiente">—</span>
                  : <span className="detalle-campo-valor">{ext.contratos_proteccion_datos ? 'Sí' : 'No'}</span>
                }
              </Campo>
              <Campo label="Detalle datos transferidos">
                <ValorMultilinea v={ext.datos_transferidos_detalle} />
              </Campo>
              <Campo label="Método de transferencia">
                <Valor v={ext.metodo_transferencia} vacio="—" />
              </Campo>
            </div>
          </div>
        )}

        {ext && seccionExtendidaTieneData(
          ext.sistemas_origen, ext.sistemas_destino, ext.sistemas_tratamiento,
          ext.tipos_tratamiento_sistema, ext.base_datos_nombre, ext.proveedor_tecnologico
        ) && (
          <div className="detalle-seccion">
            <h2 className="detalle-columna-titulo">Sistemas y tecnología</h2>
            <div className="detalle-seccion-campos">
              <Campo label="Sistemas de origen">
                <ValorMultilinea v={ext.sistemas_origen} />
              </Campo>
              <Campo label="Sistemas de destino">
                <ValorMultilinea v={ext.sistemas_destino} />
              </Campo>
              <Campo label="Sistemas de tratamiento">
                <ValorMultilinea v={ext.sistemas_tratamiento} />
              </Campo>
              <Campo label="Tipos de tratamiento en el sistema">
                <ValorMultilinea v={ext.tipos_tratamiento_sistema} />
              </Campo>
              <Campo label="Nombre base de datos">
                <Valor v={ext.base_datos_nombre} vacio="—" />
              </Campo>
              <Campo label="Proveedor tecnológico">
                <Valor v={ext.proveedor_tecnologico} vacio="—" />
              </Campo>
            </div>
          </div>
        )}

        {ext && seccionExtendidaTieneData(
          ext.criterio_plazo, ext.metodo_eliminacion, ext.documenta_destruccion,
          ext.minimizacion_justificacion, ext.mecanismos_exactitud,
          ext.evaluacion_periodica, ext.cumplimiento_demostrable,
          ext.incidentes_historicos, ext.cambios_futuros
        ) && (
          <div className="detalle-seccion">
            <h2 className="detalle-columna-titulo">Principios legales</h2>
            <div className="detalle-seccion-campos">
              <Campo label="Criterio de plazo">
                <Valor v={ext.criterio_plazo} vacio="—" />
              </Campo>
              <Campo label="Método de eliminación">
                <Valor v={ext.metodo_eliminacion} vacio="—" />
              </Campo>
              <Campo label="¿Se documenta la destrucción?">
                {ext.documenta_destruccion === null || ext.documenta_destruccion === undefined
                  ? <span className="detalle-campo-pendiente">—</span>
                  : <span className="detalle-campo-valor">{ext.documenta_destruccion ? 'Sí' : 'No'}</span>
                }
              </Campo>
              <Campo label="Justificación de minimización">
                <ValorMultilinea v={ext.minimizacion_justificacion} />
              </Campo>
              <Campo label="Mecanismos de exactitud">
                <ValorMultilinea v={ext.mecanismos_exactitud} />
              </Campo>
              <Campo label="¿Evaluación periódica?">
                {ext.evaluacion_periodica === null || ext.evaluacion_periodica === undefined
                  ? <span className="detalle-campo-pendiente">—</span>
                  : <span className="detalle-campo-valor">{ext.evaluacion_periodica ? 'Sí' : 'No'}</span>
                }
              </Campo>
              <Campo label="¿Cumplimiento demostrable?">
                {ext.cumplimiento_demostrable === null || ext.cumplimiento_demostrable === undefined
                  ? <span className="detalle-campo-pendiente">—</span>
                  : <span className="detalle-campo-valor">{ext.cumplimiento_demostrable ? 'Sí' : 'No'}</span>
                }
              </Campo>
              <Campo label="Incidentes históricos">
                <ValorMultilinea v={ext.incidentes_historicos} />
              </Campo>
              <Campo label="Cambios futuros previstos">
                <ValorMultilinea v={ext.cambios_futuros} />
              </Campo>
            </div>
          </div>
        )}

        {ext && seccionExtendidaTieneData(ext.requiere_dpia, ext.dpia_realizada, ext.dpia_detalle) && (
          <div className="detalle-seccion">
            <h2 className="detalle-columna-titulo">Evaluación de impacto (DPIA)</h2>
            <div className="detalle-seccion-campos">
              <Campo label="¿Requiere DPIA?">
                {ext.requiere_dpia === null || ext.requiere_dpia === undefined
                  ? <span className="detalle-campo-pendiente">—</span>
                  : <span className="detalle-campo-valor">{ext.requiere_dpia ? 'Sí' : 'No'}</span>
                }
              </Campo>
              <Campo label="¿DPIA realizada?">
                {ext.dpia_realizada === null || ext.dpia_realizada === undefined
                  ? <span className="detalle-campo-pendiente">—</span>
                  : <span className="detalle-campo-valor">{ext.dpia_realizada ? 'Sí' : 'No'}</span>
                }
              </Campo>
              <Campo label="Detalle DPIA">
                <ValorMultilinea v={ext.dpia_detalle} />
              </Campo>
            </div>
          </div>
        )}

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
