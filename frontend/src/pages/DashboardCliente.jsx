import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { obtenerPerfil } from "../services/authService"
import { obtenerTratamientos } from "../services/tratamientosService"
import BarraLateral from "../components/BarraLateral"
import GraficoRiesgo from "../components/GraficoRiesgo"
import { useFormulario } from "../context/FormularioContext"
import "../styles/dashboardCliente.css"

const COLORES_RIESGO = { BAJO: "#38a169", MEDIO: "#d97706", ALTO: "#e53e3e" }

export default function Dashboard() {
  const navigate = useNavigate()
  const { usuario, token } = useAuth()
  const { actualizarForm } = useFormulario()

  const [nombreOrg, setNombreOrg] = useState(usuario?.nombre || "")
  const [cargando, setCargando] = useState(true)
  const [metricas, setMetricas] = useState({ total: 0, pendientes: 0, alto: 0 })
  const [ultimos, setUltimos] = useState([])
  const [todosLosTratamientos, setTodosLosTratamientos] = useState([])
  const [sesionesborrador, setSesionesBorrador] = useState([])

  const fechaHoy = new Date().toLocaleDateString("es-CL", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  })

  useEffect(() => {
    if (!token) { navigate("/login"); return }

    async function cargar() {
      try {
        const [perfil, tratamientos] = await Promise.all([
          obtenerPerfil(token),
          obtenerTratamientos(token),
        ])
        setNombreOrg(perfil.nombre)
        setTodosLosTratamientos(tratamientos)

        const activos = tratamientos.filter(t => t.estado !== "BORRADOR")
        setMetricas({
          total:      activos.length,
          pendientes: activos.filter(t => t.estado === "PENDIENTE").length,
          alto:       activos.filter(t => t.nivel_riesgo === "ALTO").length,
        })

        const ordenados = [...activos].sort(
          (a, b) => new Date(b.creado_en) - new Date(a.creado_en)
        )
        setUltimos(ordenados.slice(0, 3))
      } catch {
        navigate("/login")
      } finally {
        setCargando(false)
      }

      // Carga borradores separado — si falla no rompe el dashboard
      try {
        const res = await fetch("http://localhost:8000/sesiones", {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const todas = await res.json()
          setSesionesBorrador(todas.filter(s => s.estado === "borrador"))
        }
      } catch { /* silencioso */ }
    }

    cargar()
  }, [token, navigate])

  async function continuarBorrador(sesion) {
    try {
      // 1. Cargar detalle de la sesión (incluye actividades con tratamiento_id)
      const res = await fetch(`http://localhost:8000/sesiones/${sesion.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return
      const sesionDetalle = await res.json()
      const actividades = sesionDetalle.actividades || []

      // 2. Si no hay tratamientos guardados, retomar desde asignación de campos
      if (actividades.length === 0) {
        actualizarForm({ sesionActual: sesion.id })
        navigate("/resultados-analisis", {
          state: { detectados: sesionDetalle.columnas_json || [], pendientes: [] },
        })
        return
      }

      // 3. Cargar cada tratamiento borrador
      const tratamientos = await Promise.all(
        actividades.map(async (act) => {
          const r = await fetch(`http://localhost:8000/tratamientos/${act.tratamiento_id}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          return r.ok ? r.json() : null
        })
      )
      const tratsValidos = tratamientos.filter(Boolean)
      if (tratsValidos.length === 0) return

      // 4. Reconstruir tratamientosGuardados y actividadesPendientes
      const tratamientosGuardados = {}
      actividades.forEach((act, idx) => { tratamientosGuardados[idx] = act.tratamiento_id })

      const actividadesPendientes = tratsValidos.map((t) => ({
        nombre: t.nombre,
        campos: sesionDetalle.columnas_json || [],
      }))

      // 5. Reconstruir estado del formulario desde el primer tratamiento
      const t = tratsValidos[0]
      const medidasStr = t.medidas_seguridad || ""
      const medidasArr = medidasStr.split(",").filter(Boolean).map(m =>
        m.startsWith("otras:") ? "otras" : m
      )
      const otrasMedidas = (() => {
        const o = medidasStr.split(",").find(m => m.startsWith("otras:"))
        return o ? o.substring(6) : ""
      })()

      actualizarForm({
        sesionActual:          sesion.id,
        tratamientosGuardados,
        actividadesPendientes,
        actividadActual:       0,
        campos_detectados:     sesionDetalle.columnas_json || [],
        campos_pendientes:     [],
        // Paso 1
        nombre:        t.nombre || "",
        responsable:   t.detalle?.responsable_tratamiento || "",
        es_responsable: t.detalle?.es_responsable ?? true,
        departamento:  t.detalle?.departamento || "",
        finalidad:     t.finalidad || "",
        base_legal:    t.base_legal || "",
        // Paso 2
        categorias_titulares: t.detalle?.categorias_titulares
          ? t.detalle.categorias_titulares.split(",").filter(Boolean)
          : [],
        universo_titulares:   t.detalle?.universo_titulares || "",
        origen_datos:         t.detalle?.origen_datos || "",
        datos_sensibles:      t.datos_sensibles ?? false,
        categorias_sensibles: [],
        destinatarios:        t.destinatarios || "",
        sale_extranjero:      t.sale_extranjero ?? false,
        // Paso 3
        plazo_conservacion:       t.plazo_conservacion || "",
        plazo_otro:               otrasMedidas ? "" : "",
        medidas_seguridad:        medidasArr,
        otras_medidas:            otrasMedidas,
        decisiones_automatizadas: t.decisiones_automatizadas ?? false,
      })

      // 6. Navegar al paso correcto según lo que tenía relleno
      const paso = (() => {
        if (t.plazo_conservacion || t.medidas_seguridad) return 3
        if (t.detalle?.categorias_titulares || t.detalle?.universo_titulares || t.destinatarios) return 2
        return 1
      })()
      const rutas = { 1: "/nuevo-tratamiento", 2: "/nuevo-tratamiento/paso2", 3: "/nuevo-tratamiento/paso3" }
      navigate(rutas[paso])
    } catch { /* silencioso */ }
  }

  if (cargando) {
    return (
      <div className="dashboard__cargando">
        <div className="dashboard__spinner" />
      </div>
    )
  }

  const TARJETAS = [
    { id: "registrados", etiqueta: "Tratamientos registrados", valor: metricas.total,      icono: "📋", color: "azul",    ruta: "/mis-tratamientos" },
    { id: "pendientes",  etiqueta: "Tratamientos pendientes",  valor: metricas.pendientes, icono: "⏳", color: "naranja" },
    { id: "alto",        etiqueta: "Riesgo alto",              valor: metricas.alto,        icono: "⚠️", color: "verde"   },
  ]

  return (
    <div className="dashboard">
      <BarraLateral />

      <main className="dashboard__contenido">
        <header className="dashboard__header">
          <div>
            <h1 className="dashboard__saludo">
              Hola, <span className="dashboard__nombre">{nombreOrg}</span>
            </h1>
            <p className="dashboard__fecha">{fechaHoy}</p>
          </div>
        </header>

        {/* Métricas */}
        <section className="dashboard__metricas">
          {TARJETAS.map(t => (
            <div
              key={t.id}
              className={`dashboard__tarjeta dashboard__tarjeta--${t.color}${t.ruta ? " dashboard__tarjeta--clickable" : ""}`}
              onClick={t.ruta ? () => navigate(t.ruta) : undefined}
              onKeyDown={t.ruta ? (e) => (e.key === "Enter" || e.key === " ") && navigate(t.ruta) : undefined}
              role={t.ruta ? "button" : undefined}
              tabIndex={t.ruta ? 0 : undefined}
            >
              <div className="dashboard__tarjeta-icono">{t.icono}</div>
              <div className="dashboard__tarjeta-info">
                <span className="dashboard__tarjeta-etiqueta">{t.etiqueta}</span>
                <span className="dashboard__tarjeta-valor">{t.valor}</span>
              </div>
            </div>
          ))}
        </section>

        {/* Banner borradores */}
        {sesionesborrador.length > 0 && (
          <section style={{ background: "#fffbeb", border: "1px solid #f59e0b", borderRadius: 8, padding: "16px 20px", marginBottom: 24 }}>
            <h3 style={{ margin: "0 0 12px", fontSize: 15, color: "#92400e", fontWeight: 600 }}>
              {sesionesborrador.length === 1
                ? "Tienes 1 sesión de análisis guardada como borrador"
                : `Tienes ${sesionesborrador.length} sesiones de análisis guardadas como borrador`}
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {sesionesborrador.slice(0, 3).map(s => (
                <div key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff", border: "1px solid #fde68a", borderRadius: 6, padding: "10px 14px" }}>
                  <span style={{ fontSize: 14, color: "#2b2b3b", fontWeight: 500 }}>
                    {s.nombre || "Sesión sin nombre"}
                    <span style={{ marginLeft: 8, fontSize: 12, color: "#888", fontWeight: 400 }}>
                      {s.fuente === "archivo" ? "· Archivo" : s.fuente === "manual" ? "· Ingreso manual" : "· Conexión BD"}
                    </span>
                  </span>
                  <button
                    style={{ background: "#f59e0b", color: "#fff", border: "none", borderRadius: 6, padding: "6px 14px", fontSize: 13, cursor: "pointer", fontWeight: 600 }}
                    onClick={() => continuarBorrador(s)}
                  >
                    Continuar →
                  </button>
                </div>
              ))}
              {sesionesborrador.length > 3 && (
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "#92400e" }}>
                  y {sesionesborrador.length - 3} más...
                </p>
              )}
            </div>
          </section>
        )}

        {/* Fila inferior: gráfico + últimos tratamientos */}
        <div className="dashboard__fila-inferior">

          <section className="dashboard__grafico-card">
            <h2 className="dashboard__seccion-titulo">Distribución de riesgo</h2>
            <GraficoRiesgo tratamientos={todosLosTratamientos} />
          </section>

          {ultimos.length > 0 && (
            <section className="dashboard__ultimos">
              <h2 className="dashboard__ultimos-titulo">Últimos tratamientos</h2>
              <ul className="dashboard__ultimos-lista">
                {ultimos.map(t => (
                  <li
                    key={t.id}
                    className="dashboard__ultimos-item"
                    onClick={() => navigate(`/tratamientos/${t.id}`)}
                  >
                    <span className="dashboard__ultimos-nombre">{t.nombre}</span>
                    <span className={`dashboard__ultimos-badge badge-${t.nivel_riesgo?.toLowerCase()}`}>
                      {t.nivel_riesgo || '—'}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

        </div>
      </main>

      <button
        className="dashboard__fab"
        onClick={() => navigate("/nuevo-tratamiento")}
        title="Nuevo tratamiento"
      >
        + Nuevo tratamiento
      </button>
    </div>
  )
}