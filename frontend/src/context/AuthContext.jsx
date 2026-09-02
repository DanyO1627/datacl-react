
// este authcontex está para guardar el token jwt y los datos del usuario de forma global.
// y así cualquier componente puede saber si hay un usaurio logeado o no y acceder a los datos.
// hay que usarlo así: 
// import { useAuth } from "../context/AuthContext"
// const { usuario, iniciarSesion, cerrarSesion } = useAuth()
 
import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
 
const AuthContext = createContext(null); // por acá pasan los datos


// R10.5 — normaliza los datos de cuenta a una sola forma, sin importar por
// qué camino de login vinieron:
//   - Nuevo (Usuario, R10.1/R10.4): { id, nombre, correo, rol, debe_cambiar_password,
//     organizacion: {...}, permisos: {...} } — rol es 'ADMIN_ORG'/'MIEMBRO'.
//   - Viejo (Organizacion, admin de plataforma o cuentas sin migrar a R10.4):
//     { id, nombre, correo, rol, rut, activo, color_institucional, logo_ruta, ... }
//     — acá no existe el concepto de "persona" separado de "organización",
//     así que la propia fila hace de organizacion y no hay tabla de permisos.
function normalizarUsuario(datos) {
  if (!datos) return null;
  if (datos.organizacion) return datos; // ya viene en forma nueva (Usuario)
  return {
    id: datos.id,
    nombre: datos.nombre,
    correo: datos.correo,
    rol: datos.rol,
    debe_cambiar_password: false,
    organizacion: datos,
    permisos: null,
  };
}


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
        const respuesta = await axios.get("/api/auth/me", {
          headers: { Authorization: `Bearer ${tokenGuardado}` },
        });

        // si es válido actualizamos los datos (misma forma que iniciarSesion)
        setUsuario(normalizarUsuario(respuesta.data));
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
  //
  // La respuesta del backend tiene dos formas posibles según el camino de
  // login (ver normalizarUsuario más arriba):
  //   - camino viejo: {access_token, token_type, organizacion: {...}}
  //   - camino nuevo: {access_token, token_type, usuario: {..., organizacion: {...}, permisos: {...}}}

  function iniciarSesion(respuestaLogin) {
    const { access_token, usuario, organizacion } = respuestaLogin;
    const datosPersona = normalizarUsuario(usuario || organizacion);

    // se gaurda en el locastorage
    localStorage.setItem("token", access_token);
    localStorage.setItem("usuario", JSON.stringify(datosPersona));

    // se actualiza el estado en react
    setToken(access_token);
    setUsuario(datosPersona);
  }
 
 
  // R10.7 — actualiza campos puntuales del usuario ya logueado (ej: apagar
  // debe_cambiar_password tras el cambio obligatorio) sin tener que volver a
  // loguear. Hace merge superficial sobre el objeto guardado en localStorage
  // y en el estado, para no perder el resto de los campos (organizacion,
  // permisos, etc).
  function actualizarUsuario(parcial) {
    setUsuario((actual) => {
      if (!actual) return actual;
      const actualizado = { ...actual, ...parcial };
      localStorage.setItem("usuario", JSON.stringify(actualizado));
      return actualizado;
    });
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


  // R10.5/R10.8 — permiso granular puntual, mismo criterio que
  // requiere_permiso() en el backend (utils/jwt.py):
  //   - Camino viejo (Organizacion, rol='ORGANIZACION' u 'ADMIN' de
  //     plataforma): pasa siempre, sin restricción. Son cuentas que nunca
  //     tuvieron el concepto de permisos granulares — organizacion.rut existe
  //     en usuario.organizacion cuando viene de acá, así se distingue sin
  //     necesitar el objeto Organizacion completo. R10 solo AGREGA subcuentas
  //     restringidas (Usuario), no le saca nada a la cuenta original.
  //   - ADMIN_ORG: pasa siempre sin consultar la tabla de permisos.
  //   - MIEMBRO: necesita el booleano correspondiente en usuario.permisos.
  // Uso: tienePermiso('tratamientos', 'editar')
  function tienePermiso(modulo, accion) {
    if (!usuario) return false;
    if (usuario.rol !== 'ADMIN_ORG' && usuario.rol !== 'MIEMBRO') return true;
    if (usuario.rol === 'ADMIN_ORG') return true;
    const campo = `${modulo}_${accion}`;
    return !!(usuario.permisos && usuario.permisos[campo]);
  }


  // valor compartido entre todos los componentes que usan usen useAuth()
  const valor = {
    token,        // el JWT como string
    usuario,      // { id, nombre, correo, rol, debe_cambiar_password, organizacion, permisos }
    cargando,     // true mientras se verifica el token al cargar
    iniciarSesion,
    actualizarUsuario,
    cerrarSesion,
    hayToken,
    tienePermiso,
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
