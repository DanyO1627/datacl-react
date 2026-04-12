// contiene el logo y los botones de iniciar sesión y registrarse
// no está en el gome porque la vamo a usar en login, registro y recuperar contraseña

import { useNavigate } from 'react-router-dom';
import "../styles/navbar.css"

export default function Navbar() {
    const navigate = useNavigate();

    return (

        <nav className="navbar">
            {/* Logo — por ahora es solo texto, después puede ser una imagen */}
            <span className="navbar__logo">DataCL</span>

            {/* botones de acción */}
            <div className="navbar__acciones">
                <button
                    className="navbar__btn navbar__btn--outline"
                    onClick={() => navigate("/login")}
                >
                    Iniciar sesión
                </button>
                <button
                    className="navbar__btn navbar__btn--solido"
                    onClick={() => navigate("/registro")}
                >
                    Registrarse
                </button>
            </div>
        </nav>
    );
}