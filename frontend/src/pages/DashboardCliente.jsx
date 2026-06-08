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
      const res = await fetch(`http://localhost:8000/sesiones/${sesion.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return
      const data = await res.json()
      actualizarForm({ sesionActual: sesion.id })
      navigate("/resultados-analisis", {
        state: { detectados: data.columnas_json || [], pendientes: [] },
      })
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