import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Logo from "../components/Logo";
import "../styles/barraLateral.css";
 
// LINKS DE NAVEGACIÓN
const LINKS = [
  {
    ruta: "/dashboard",
    etiqueta: "Inicio",
    icono: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    ruta: "/mis-tratamientos",
    etiqueta: "Mis tratamientos",
    icono: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10 9 9 9 8 9"/>
      </svg>
    ),
  },
  {
    ruta: "/subir-archivo",
    etiqueta: "Subir archivo",
    icono: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 16 12 12 8 16"/>
        <line x1="12" y1="12" x2="12" y2="21"/>
        <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
      </svg>
    ),
  },
  {
    ruta: "/informes",
    etiqueta: "Informes",
    icono: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
        <line x1="3" y1="9" x2="21" y2="9"/>
        <line x1="3" y1="15" x2="21" y2="15"/>
        <line x1="9" y1="3" x2="9" y2="21"/>
      </svg>
    ),
  },
  {
    ruta: "/riesgos",
    etiqueta: "Riesgos",
    icono: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    ),
  },
  {
    ruta: "/perfil",
    etiqueta: "Mi perfil",
    icono: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    ),
  },
];
 
export default function BarraLateral() {
  const navigate = useNavigate();
  // useLocation nos dice en qué ruta estamos y así podemos marcar el link activo
  const location = useLocation();
  const { usuario, cerrarSesion } = useAuth();
 
  function handleCerrarSesion() {
    cerrarSesion(); // elimina token y datos del contexto y localStorage y dsp te redirige
    navigate("/login"); 
  }
 
  return (
    <aside className="barra-lateral">
 
      {/* LOGO */}
      <div className="barra-lateral__logo">
        <Logo size="lg" onClick={() => navigate("/dashboard")} />
      </div>
 
      {/* los links */}
      <nav className="barra-lateral__nav">
        {LINKS.map((link) => {
          // si la ruta coincide con el link, se marca activo
          const activo = location.pathname === link.ruta;
          return (
            <button
              key={link.ruta}
              className={`barra-lateral__link ${activo ? "barra-lateral__link--activo" : ""}`}
              onClick={() => navigate(link.ruta)}
            >
              <span className="barra-lateral__icono">{link.icono}</span>
              <span className="barra-lateral__etiqueta">{link.etiqueta}</span>
            </button>
          );
        })}
      </nav>
 
      {/* NOMBRE DE LA ORG Y CERRAR SESION */}
      <div className="barra-lateral__pie">
        <p className="barra-lateral__org">
            {/* usuario puede ser null */}
          {usuario?.nombre || "Organización"} 
        </p>
        <button
          className="barra-lateral__cerrar"
          onClick={handleCerrarSesion}
        >
          Cerrar sesión
        </button>
      </div>
 
    </aside>
  );
}