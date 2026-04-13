
// este authcontex está para guardar el token jwt y los datos del usuario de forma global.
// y así cualquier componente puede saber si hay un usaurio logeado o no y acceder a los datos.
// hay que usarlo así: 
// import { useAuth } from "../context/AuthContext"
// const { usuario, iniciarSesion, cerrarSesion } = useAuth()
 
import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
 
const AuthContext = createContext(null); // por acá pasan los datos
 
 
// Provider
// es el componente que envuelve la app y da los datos.
 
export function AuthProvider({ children }) {
 
  // se lee en local storage y mantiene los datos si el usuario cierra la sesión o recarga la página
  const [token, setToken] = useState(() => {
    return localStorage.getItem("token") || null;
  });
 
  // Estado de los datos del usuario
  const [usuario, setUsuario] = useState(() => {
    const guardado = localStorage.getItem("usuario");
    // JSON.parse convierte el string guardado en localstorage de vuelta a objeto
    return guardado ? JSON.parse(guardado) : null;
  });
 
  // Estado de carga true mientras se verifica si sigue válido
  const [cargando, setCargando] = useState(true);
 
 
  // Verificar token al cargar la app
  // Si hay token en localStorage, verificamos que siga siendo válido
 
  useEffect(() => { // esto solo se ejecuta una vez
    async function verificarSesion() {
      const tokenGuardado = localStorage.getItem("token");
 
      if (!tokenGuardado) {
        // No hay token — no hay sesión
        setCargando(false);
        return;
      }
 
      try {
        // vemos si el token sigue valido
        const respuesta = await axios.get("http://localhost:8000/auth/me", {
          headers: { Authorization: `Bearer ${tokenGuardado}` },
        });
 
        // si es válido actualizamos los datos
        setUsuario(respuesta.data);
        setToken(tokenGuardado);
      } catch (error) {
        // si no es valido sacamos todo
        console.warn("Sesión expirada, cerrando sesión automáticamente");
        localStorage.removeItem("token");
        localStorage.removeItem("usuario");
        setToken(null);
        setUsuario(null);
      } finally { // termina de verificar
        setCargando(false);
      }
    }
 
    verificarSesion();
  }, []); // solo se ejecuta al cargar la app, no en cada render
 
 
  // Iniciar sesion
  // se llama desde la pantalla de login después de recibir la respuesta del backend
  // guarda el token y los datos del usuario en el estado y en localStorage.
  // recibe la respuesta completa del backend: {access_token, token_type, organizacion: { id, nombre, correo, rol } }
 
  function iniciarSesion(respuestaLogin) {
    const { access_token, organizacion } = respuestaLogin;
 
    // se gaurda en el locastorage
    localStorage.setItem("token", access_token);
    localStorage.setItem("usuario", JSON.stringify(organizacion));
 
    // se actualiza el estado en react
    setToken(access_token);
    setUsuario(organizacion);
  }
 
 
  // cerrar sesión 
  // elimina el token y los datos del usuario.
  // y cualquier ruta protegida te dirige al login
 
  function cerrarSesion() {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    setToken(null);
    setUsuario(null);
  }
 
 
  // hay token para verificar si hay una sesipon activa
  function hayToken() {
    return token !== null;
  }
 
 
  // valor compartido entre todos los componentes que usan usen useAuth()
  const valor = {
    token,        // el JWT como string
    usuario,      // { id, nombre, correo, rol }
    cargando,     // true mientras se verifica el token al cargar
    iniciarSesion,
    cerrarSesion,
    hayToken,
  };
 
  return ( // children son todos los componentes dentro del provider
    <AuthContext.Provider value={valor}>
      {cargando ? null : children}
    </AuthContext.Provider>
  );
}
 
 
// useAuth es para simplificar el uso. Se usa así:
// const { usuario, cerrarSesion } = useAuth()
 
export function useAuth() {
  const contexto = useContext(AuthContext);
 
  // si se usa fuera, da error claro para que verifiquem
  if (!contexto) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }
 
  return contexto;
}