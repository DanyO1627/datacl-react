import { useNavigate } from "react-router-dom"
import "../styles/footer.css";

export default function Footer() {
    const navigate = useNavigate();

    return (
        <footer className="footer">
            <span className="footer__logo">DataCL</span>

            <p className="footer__texto">
                Proyecto académico - Duoc UC 2026
            </p>

            <div className="footer__links">
                <button
                    className="footer__link"
                    onClick={() => navigate("/login")}
                >
                    Iniciar sesión
                </button>
                <button
                    className="footer__link"
                    onClick={() => navigate("/registro")}
                >
                    Registrarse
                </button>
            </div>
        </footer>
    );
}