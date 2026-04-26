// frontend/src/pages/DashboardCliente.jsx
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { obtenerPerfil } from "../services/authService"
import { obtenerTratamientos } from "../services/tratamientosService"
import BarraLateral from "../components/BarraLateral"
import GraficoRiesgo from "../components/GraficoRiesgo"
import "../styles/dashboardCliente.css"

export default function Dashboard() {
  const navigate = useNavigate()
  const { usuario, token } = useAuth()

  const [nombreOrg, setNombreOrg] = useState(usuario?.nombre || "")
  const [cargando, setCargando] = useState(true)
  const [metricas, setMetricas] = useState({ total: 0, pendientes: 0, alto: 0 })
  const [ultimos, setUltimos] = useState([])
  const [todosLosTratamientos, setTodosLosTratamientos] = useState([])

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

        setMetricas({
          total:      tratamientos.length,
          pendientes: tratamientos.filter(t => t.estado === "PENDIENTE").length,
          alto:       tratamientos.filter(t => t.nivel_riesgo === "ALTO").length,
        })

        const ordenados = [...tratamientos].sort(
          (a, b) => new Date(b.creado_en) - new Date(a.creado_en)
        )
        setUltimos(ordenados.slice(0, 3))
      } catch {
        navigate("/login")
      } finally {
        setCargando(false)
      }
    }

    cargar()
  }, [token, navigate])

  if (cargando) {
    return (
      <div className="dashboard__cargando">
        <div className="dashboard__spinner" />
      </div>
    )
  }

  const TARJETAS = [
    { id: "registrados", etiqueta: "Tratamientos registrados", valor: metricas.total,      icono: "📋", color: "azul"    },
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
            <div key={t.id} className={`dashboard__tarjeta dashboard__tarjeta--${t.color}`}>
              <div className="dashboard__tarjeta-icono">{t.icono}</div>
              <div className="dashboard__tarjeta-info">
                <span className="dashboard__tarjeta-etiqueta">{t.etiqueta}</span>
                <span className="dashboard__tarjeta-valor">{t.valor}</span>
              </div>
            </div>
          ))}
        </section>

        {/* Fila inferior: gráfico + últimos tratamientos */}
        <div className="dashboard__fila-inferior">

          {/* Gráfico de distribución de riesgo */}
          <section className="dashboard__grafico-card">
            <h2 className="dashboard__seccion-titulo">Distribución de riesgo</h2>
            <GraficoRiesgo tratamientos={todosLosTratamientos} />
          </section>

          {/* Últimos tratamientos */}
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