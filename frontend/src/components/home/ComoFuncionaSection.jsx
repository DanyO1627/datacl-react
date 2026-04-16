import { useNavigate } from "react-router-dom";
import "../../styles/home.css";
 
// Array con los 4 pasos — separado del JSX para fácil edición
const PASOS = [
  {
    numero: "01",
    titulo: "Sube tu base de datos",
    descripcion: "CSV o Excel con tus datos actuales",
  },
  {
    numero: "02",
    titulo: "Python detecta tus datos",
    descripcion: "Análisis automático de columnas sensibles",
  },
  {
    numero: "03",
    titulo: "Tú completas lo pendiente",
    descripcion: "Revisas y confirmas lo que no se detectó",
  },
  {
    numero: "04",
    titulo: "Descarga tu informe PDF",
    descripcion: "Documento formal listo para presentar",
  },
];
 
export default function ComoFuncionaSection() {
  const navigate = useNavigate();
 
  return (
    <section className="como">
      <h2 className="como__titulo">¿Cómo funciona DataCL?</h2>
      <p className="como__subtitulo">
        Cuatro pasos para tener tu RAT completo y listo para presentar.
      </p>
 
      <div className="como__grid">
        {PASOS.map((paso) => (
          <div key={paso.numero} className="como__paso">
            {/* Número en pill azul */}
            <span className="como__paso-numero">Paso {paso.numero}</span>
            <h3 className="como__paso-titulo">{paso.titulo}</h3>
            <p className="como__paso-descripcion">{paso.descripcion}</p>
          </div>
        ))}
      </div>
 
      {/* CTA final — última oportunidad para convertir al visitante */}
      <div className="como__cta">
        <h3 className="como__cta-titulo">¿Tu organización está preparada?</h3>
        <p className="como__cta-subtitulo">
          Comienza gratis hoy y ten tu RAT listo antes de diciembre de 2026.
        </p>
        <button
          className="como__cta-btn"
          onClick={() => navigate("/registro")}
        >
          Crear cuenta gratis
        </button>
      </div>
    </section>
  );
}