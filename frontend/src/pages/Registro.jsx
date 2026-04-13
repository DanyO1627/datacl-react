import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/registro.css";
import Logo from "../components/Logo";

function validarRut(rut) {
  const patron = /^\d{7,8}-[\dKk]$/;
  return patron.test(rut.trim());
}

function InputField({ type = "text", value, onChange, onBlur, error, placeholder }) {
  return (
    <div className="registro-field-group">
      <input
        type={type}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        className={`registro-input${error ? " has-error" : ""}`}
        autoComplete="off"
      />
      {error && <div className="registro-error-text">{error}</div>}
    </div>
  );
}

export default function Registro() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    nombre: "",
    rut: "",
    correo: "",
    password: "",
    confirmarPassword: "",
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [cargando, setCargando] = useState(false);
  const [serverError, setServerError] = useState("");

  const validar = (campos) => {
    const e = {};
    if (!campos.nombre.trim())
      e.nombre = "El nombre de la organización es requerido";

    if (!campos.rut.trim())
      e.rut = "El RUT es requerido";
    else if (!validarRut(campos.rut))
      e.rut = "Formato inválido. Ejemplo: 12345678-9";

    if (!campos.correo.trim())
      e.correo = "El correo electrónico es requerido";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(campos.correo))
      e.correo = "Ingresa un correo electrónico válido";

    if (!campos.password)
      e.password = "La contraseña es requerida";
    else if (campos.password.length < 8)
      e.password = "La contraseña debe tener al menos 8 caracteres";
    else if (campos.password.length > 72)
      e.password = "La contraseña no puede tener más de 72 caracteres";

    if (!campos.confirmarPassword)
      e.confirmarPassword = "Debes confirmar tu contraseña";
    else if (campos.password !== campos.confirmarPassword)
      e.confirmarPassword = "Las contraseñas no coinciden";

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
    const todosToched = {
      nombre: true, rut: true, correo: true,
      password: true, confirmarPassword: true,
    };
    setTouched(todosToched);
    const e = validar(form);
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    setCargando(true);
    setServerError("");

    try {
      const response = await fetch("http://localhost:8000/auth/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: form.nombre,
          rut: form.rut,
          correo: form.correo,
          password: form.password,
          confirmar_password: form.confirmarPassword,
        }),
      });

      const data = await response.json();

      if (response.status === 201) {
        navigate("/login");
      } else if (response.status === 400) {
        setServerError(data.detail || "El correo o RUT ya están registrados");
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
  <div className="registro-page">
    <div className="registro-wrapper">

      <div className="registro-logo" onClick={() => navigate("/")}>
        <Logo size="sm" />
        <span className="registro-logo-text">DataCL</span>
      </div>

      <div className="registro-card">
        <h1 className="registro-title">Crear cuenta</h1>
        <p className="registro-subtitle">Registra tu organización en DataCL</p>

        {serverError && (
          <div className="registro-server-error">{serverError}</div>
        )}

        <InputField
          placeholder="Nombre de la organización"
          value={form.nombre}
          onChange={handleChange("nombre")}
          onBlur={handleBlur("nombre")}
          error={touched.nombre ? errors.nombre : ""}
        />
        <InputField
          placeholder="RUT de la organización (Ej: 76543210-K)"
          value={form.rut}
          onChange={handleChange("rut")}
          onBlur={handleBlur("rut")}
          error={touched.rut ? errors.rut : ""}
        />
        <InputField
          type="email"
          placeholder="Correo electrónico"
          value={form.correo}
          onChange={handleChange("correo")}
          onBlur={handleBlur("correo")}
          error={touched.correo ? errors.correo : ""}
        />
        <InputField
          type="password"
          placeholder="Contraseña"
          value={form.password}
          onChange={handleChange("password")}
          onBlur={handleBlur("password")}
          error={touched.password ? errors.password : ""}
        />
        <InputField
          type="password"
          placeholder="Confirmar contraseña"
          value={form.confirmarPassword}
          onChange={handleChange("confirmarPassword")}
          onBlur={handleBlur("confirmarPassword")}
          error={touched.confirmarPassword ? errors.confirmarPassword : ""}
        />

        <button
          className="registro-btn"
          onClick={handleSubmit}
          disabled={botonDeshabilitado}
        >
          {cargando ? "Creando cuenta..." : "Crear cuenta"}
        </button>

        <div className="registro-link-row">
          ¿Ya tienes una cuenta?{" "}
          <button className="registro-link" onClick={() => navigate("/login")}>
            Inicia sesión
          </button>
        </div>
      </div>

    </div>
  </div>
);
}
