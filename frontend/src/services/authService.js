
// Este archivo centraliza todas las llamadas HTTP al backend relacionadas con autenticación.
// con Axios (maneja automáticamente los errores http)

import axios from "axios";

const BASE_URL = "http://localhost:8000"; // URL base del backend (si hay que cambiar, se cambia acá y queda para todo el proyecto)


// Instancia de Axios con la URL base configurada, todos los métodos de acá lo usan
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});


// REGISTRO
// Manda los datos del formulario de registro al backend
// El backend valida, hashea la password y guarda en MySQL
// Recibe un objeto con: { nombre, rut, correo, password, confirmar_password }
// y devuelve los datos de la organización creada (sin password): { id, nombre, correo, rol }
// si ya existe el correo, entonces el backend devuelve 400 y axios lanza un error
// si lo ponen hay que ponerle un try catch para atraparlo.

export async function registrar(datos) {
  const respuesta = await api.post("/auth/registro", datos);
  return respuesta.data;
}


// LOGIN
// manda correo y password al backend y el backend devuelve un token JWT
// recibe objeto con: { correo, password }
// y devuelve { access_token, token_type, organizacion: { id, nombre, correo, rol } }
// si las crendenciales están mal, entonces el backend devuelve 401 y axios manda error

export async function login(datos) {
  const respuesta = await api.post("/auth/login", datos);
  return respuesta.data;
}


// OBTENER PERFIL 
// llama a GET /auth/me con el token JWT para sacar los datos del usuario
// se usa por ejemplo cuando se carga el nombre de la organización en el dashboard
//
// recibe un token JWT como string (lo saca el componente del localStorage o del contexto)
// y devuelve { id, nombre, correo, rol }

export async function obtenerPerfil(token) {
  const respuesta = await api.get("/auth/me", {
    headers: {
      // El backend espera el token en este formato exacto
      Authorization: `Bearer ${token}`,
    },
  });
  return respuesta.data;
}