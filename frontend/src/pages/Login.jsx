import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/login.css";

// Ícono de ojo abierto
function IconoOjoAbierto() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

// Ícono de ojo cerrado
function IconoOjoCerrado() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const { iniciarSesion } = useAuth();

  const [form, setForm] = useState({ correo: "", password: "" });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [serverError, setServerError] = useState("");

  const validar = (campos) => {
    const e = {};
    if (!campos.correo.trim())
      e.correo = "El correo electrónico es requerido";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(campos.correo))
      e.correo = "Ingresa un correo electrónico válido";

    if (!campos.password)
      e.password = "La contraseña es requerida";

    return e;
  };

  const handleChange = (field) => (e) => {
    const nuevo = { ...form, [field]: e.target.value };
    setForm(nuevo);
    setServerError("");
    if (touched[field]) setErrors(validar(nuevo));
  };

  const handleBlur = (field) => () => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setErrors(validar(form));
  };

  const handleSubmit = async () => {
    const todosToched = { correo: true, password: true };
    setTouched(todosToched);
    const e = validar(form);
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    setCargando(true);
    setServerError("");

    try {
      const response = await fetch("http://localhost:8000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          correo: form.correo,
          password: form.password,
        }),
      });

      const data = await response.json();

      if (response.status === 200) {
        iniciarSesion(data); // esto guarda todo (token y usuario)
        navigate("/dashboard");
      } else if (response.status === 401) {
        setServerError("Correo o contraseña incorrectos");
      } else {
        setServerError("Error inesperado. Intenta nuevamente.");
      }
    } catch {
      setServerError("No se pudo conectar con el servidor. Verifica que el backend esté corriendo.");
    } finally {
      setCargando(false);
    }
  };

  const erroresActivos = validar(form);
  const formValido = Object.keys(erroresActivos).length === 0;
  const algunCampoTocado = Object.values(touched).some(Boolean);
  const botonDeshabilitado = cargando || (algunCampoTocado && !formValido);

  return (
    <div className="login-page">
      <div className="login-wrapper">

        {/* Logo */}
        <div className="login-logo">
          <div className="login-logo-circle">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="9" cy="9" r="7" stroke="#052659" strokeWidth="2" />
              <path d="M6 9h6M9 6v6" stroke="#052659" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <span className="login-logo-text">DataCL</span>
        </div>

        {/* Card */}
        <div className="login-card">
          <h1 className="login-title">Bienvenido de vuelta</h1>
          <p className="login-subtitle">Ingresa a tu cuenta</p>

          {serverError && (
            <div className="login-server-error">{serverError}</div>
          )}

          {/* Campo correo */}
          <div className="login-field-group">
            <input
              type="email"
              placeholder="Ingresa tu correo electrónico"
              value={form.correo}
              onChange={handleChange("correo")}
              onBlur={handleBlur("correo")}
              className={`login-input${touched.correo && errors.correo ? " has-error" : ""}`}
              autoComplete="off"
            />
            {touched.correo && errors.correo && (
              <div className="login-error-text">{errors.correo}</div>
            )}
          </div>

          {/* Campo contraseña con ojo */}
          <div className="login-field-group">
            <div className="login-password-wrapper">
              <input
                type={mostrarPassword ? "text" : "password"}
                placeholder="Contraseña"
                value={form.password}
                onChange={handleChange("password")}
                onBlur={handleBlur("password")}
                className={`login-input${touched.password && errors.password ? " has-error" : ""}`}
                autoComplete="off"
              />
              <button
                type="button"
                className="login-eye-btn"
                onClick={() => setMostrarPassword((v) => !v)}
                tabIndex={-1}
                aria-label={mostrarPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {mostrarPassword ? <IconoOjoCerrado /> : <IconoOjoAbierto />}
              </button>
            </div>
            {touched.password && errors.password && (
              <div className="login-error-text">{errors.password}</div>
            )}
          </div>

          {/* Link olvidé contraseña */}
          <button
            className="login-forgot"
            onClick={() => navigate("/recuperar-password")}
          >
            ¿Olvidaste tu contraseña?
          </button>

          {/* Botón ingresar */}
          <button
            className="login-btn"
            onClick={handleSubmit}
            disabled={botonDeshabilitado}
          >
            {cargando ? "Ingresando..." : "Ingresar"}
          </button>

          {/* Separador y registro */}
          <hr className="login-divider" />

          <div className="login-register-block">
            <p className="login-register-label">¿No tienes cuenta?</p>
            <button
              className="login-register-link"
              onClick={() => navigate("/registro")}
            >
              Regístrate
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
