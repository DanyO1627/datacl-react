import "../../styles/home.css";

const CAJAS = [
    {
        icono: "📋",
        titulo: "Registro Obligatorio",
        descripcion: "La ley exige documentar todos los tratamientos de datos personales que tu organización realiza.",
    },
    {
        icono: "🔍",
        titulo: "Análisis Inteligente",
        descripcion: "Identificamos automáticamente qué campos de tu base de datos contienen datos personales.",
    },
    {
        icono: "📄",
        titulo: "Genera tu Informe",
        descripcion: "Descarga el PDF formal que tu organización necesita para cumplir con la ley.",
    },
];

export default function RatSection() {
    return (
        <section className="rat">
            <h2 className="rat__titulo">¿Qué es el RAT?</h2>
            <p className="rat__subtitulo">
                El Registro de Actividades de Tratamiento es el documento obligatorio
                que toda organización debe tener bajo la Ley 21.719.
            </p>

            {/* grid auto-fit: 3 columnas en pantalla grande, 1 en móvil — sin media queries */}
            <div className="rat__grid">
                {/* .map() convierte el array en elementos JSX.
            key es obligatorio en listas — React lo usa para optimizar re-renders. */}
                {CAJAS.map((caja) => (
                    <div key={caja.titulo} className="rat__caja">
                        <span className="rat__caja-icono">{caja.icono}</span>
                        <h3 className="rat__caja-titulo">{caja.titulo}</h3>
                        <p className="rat__caja-descripcion">{caja.descripcion}</p>
                    </div>
                ))}
            </div>
        </section>
    );
}


