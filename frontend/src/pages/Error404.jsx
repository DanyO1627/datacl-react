import { useNavigate } from "react-router-dom";
import "../styles/error404.css";
 
export default function Error404() {
  const navigate = useNavigate();
 
  return (
    <div className="e404">
 
      {/* ── Header con logo ── */}
      <header className="e404__header">
        <span className="e404__logo" onClick={() => navigate("/")}>
          DataCL
        </span>
      </header>
 
      {/* ── Contenido central ── */}
      <main className="e404__main">
 
        {/* Número grande — el "404" es lo primero que el usuario ve */}
        <div className="e404__numero">404</div>
 
        <h1 className="e404__titulo">Página no encontrada</h1>
 
        <p className="e404__descripcion">
          La página que buscas no existe o fue movida.
        </p>
 
        {/* Botón que vuelve al inicio */}
        <button
          className="e404__btn"
          onClick={() => navigate("/dashboard")}
        >
          Volver a la página de inicio
        </button>
 
      </main>
 
    </div>
  );
}