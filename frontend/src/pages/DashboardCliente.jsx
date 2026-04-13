import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { obtenerPerfil } from "../services/authService";
import BarraLateral from "../components/BarraLateral";
import "../styles/dashboardCliente.css";


// En el sprint 5 los datos van a ser del backend
const METRICAS = [
  {
    id: "registrados",
    etiqueta: "Tratamientos registrados",
    valor: 0,
    icono: "📋",
    color: "azul",
  },
  {
    id: "pendientes",
    etiqueta: "Tratamientos pendientes",
    valor: 0,
    icono: "⏳",
    color: "naranja",
  },
  {
    id: "informes",
    etiqueta: "Informes generados",
    valor: 0,
    icono: "📄",
    color: "verde",
  },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { usuario, token } = useAuth();

  // estado del nombre se actualiza con backend
  const [nombreOrg, setNombreOrg] = useState(usuario?.nombre || "");
  const [cargando, setCargando] = useState(true);


  const fechaHoy = new Date().toLocaleDateString("es-CL", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // al cargar se verifica la sesión con GET /auth/me
  // para confirmar que el token siga siendo válido
  useEffect(() => {
    async function cargarPerfil() {
      try {
        const perfil = await obtenerPerfil(token);
        setNombreOrg(perfil.nombre);
      } catch (error) {
        // si no, se redirige al login
        console.error("Error al cargar perfil:", error);
        navigate("/login");
      } finally {
        setCargando(false);
      }
    }

    if (token) {
      cargarPerfil();
    } else {
      navigate("/login");
    }
  }, [token, navigate]);

  if (cargando) {
    return (
      <div className="dashboard__cargando">
        <div className="dashboard__spinner" />
      </div>
    );
  }

  return (
    <div className="dashboard">

      {/* Barra lateral reutilizable */}
      <BarraLateral />

      {/* lo principal (tiene margen izquierdo el ancho de la barra lateral) */}
      <main className="dashboard__contenido">

        {/* Header */}
        <header className="dashboard__header">
          <div>
            <h1 className="dashboard__saludo">
              Hola, <span className="dashboard__nombre">{nombreOrg}</span>
            </h1>
            <p className="dashboard__fecha">{fechaHoy}</p>
          </div>
        </header>

        {/* Tarjetas métricas */}
        <section className="dashboard__metricas">
          {METRICAS.map((metrica) => (
            <div
              key={metrica.id}
              className={`dashboard__tarjeta dashboard__tarjeta--${metrica.color}`}
            >
              <div className="dashboard__tarjeta-icono">{metrica.icono}</div>
              <div className="dashboard__tarjeta-info">
                <span className="dashboard__tarjeta-etiqueta">
                  {metrica.etiqueta}
                </span>
                <span className="dashboard__tarjeta-valor">{metrica.valor}</span>
              </div>
            </div>
          ))}
        </section>

      </main>

      {/* Botón de nuevo tratamiento (es para el sprint 3) */}
      <button
        className="dashboard__fab"
        onClick={() => navigate("/nuevo-tratamiento")}
        title="Nuevo tratamiento"
      >
        + Nuevo tratamiento
      </button>

    </div>
  );
}