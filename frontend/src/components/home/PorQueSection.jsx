import "../../styles/home.css";

export default function PorQueSection() {
    return (
        <section className="porque">
            <h2 className="porque__titulo">¿Por qué importa?</h2>
            <p className="porque__subtitulo">
                La ley entra en vigencia en diciembre de 2026. Las organizaciones que
                no cumplan se exponen a sanciones significativas.
            </p>

            {/* Dos cajas con datos concretos y verificables */}
            <div className="porque__grid">
                <div className="porque__caja">
                    <div className="porque__numero">Dic 2026</div>
                    <div className="porque__label">Fecha de vigencia</div>
                    <p className="porque__texto">
                        La Ley 21.719 entra en vigor. Todas las organizaciones deben
                        tener su RAT listo desde ese momento.
                    </p>
                </div>
                <div className="porque__caja">
                    <div className="porque__numero">10.000 UTM</div>
                    <div className="porque__label">Multa máxima</div>
                    <p className="porque__texto">
                        El incumplimiento puede resultar en multas de hasta 10.000 UTM
                        por infracción a la normativa de datos.
                    </p>
                </div>
            </div>

            {/* Nota adicional — aclara que no es solo para grandes empresas */}
            <div className="porque__alerta">
                <span className="porque__alerta-icono">⚖️</span>
                <p className="porque__alerta-texto">
                    <strong>Pymes, colegios, clínicas y municipios</strong> también están
                    obligados a cumplir, no solo las grandes empresas.
                </p>
            </div>
        </section>
    );
}