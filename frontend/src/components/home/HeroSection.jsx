import { useNavigate } from "react-router-dom";
import "../../styles/home.css";

export default function HeroSection() {
    const navigate = useNavigate();

    return (
        <section className="hero">
            {/* decoración de fondo */}
            <div className="hero__decorativo" />
            <div className="hero__decorativo-2" />

            {/* etiqueta de contexto: de qué trata el sitio */}
            <span className="hero__etiqueta">Ley 21.719 - Protección de Datos</span>

            {/* titulo principal (clamp () hace qeu el tamaño sea responsive)*/}
            <h1 className="hero__titulo">
                Cumple con la Ley 21.719<br />
                <span className="hero__titulo--acento">sin complicaciones</span>
            </h1>

            {/* Subtítulo — explica el valor concreto del producto */}
            <p className="hero__subtitulo">
                Gestiona tu Registro de Actividades de Tratamiento (RAT) de forma
                automática. Sube tu base de datos y nosotros detectamos qué datos
                personales necesitas declarar.
            </p>

            {/* Botones — los dos puntos de entrada al sistema */}
            <div className="hero__botones">
                <button
                    className="hero__btn hero__btn--primario"
                    onClick={() => navigate("/registro")}
                >
                    Comenzar gratis
                </button>
                <button
                    className="hero__btn hero__btn--secundario"
                    onClick={() => navigate("/login")}
                >
                    Iniciar sesión
                </button>
            </div>

            {/* Badge de credibilidad */}
            <p className="hero__badge">Proyecto académico · Duoc UC 2026 · Sin costo</p>
        </section>
    );
}