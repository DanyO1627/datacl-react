// Centraliza las llamadas HTTP al backend relacionadas con análisis de archivos
// Usamos FormData porque enviamos archivos binarios, no JSON
// Y el interceptor agrega el JWT automáticamente igual que en authService

import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8000",
});

// Agrega el JWT automáticamente en todas las peticiones
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});


// ANALIZAR ARCHIVO
// Si no viene diccionario → llama a /analizar/archivo (nivel 1)
// Si viene diccionario    → llama a /analizar/diccionario (nivel 2)
//
// IMPORTANTE: NO setear Content-Type manualmente.
// Axios lo detecta solo como multipart/form-data cuando recibe un FormData
// Si lo seteamos a mano, rompemos el boundary que necesita el servidor
// para separar los archivos dentro del request.
//
// Devuelve: { detectados, pendientes, total_columnas, resumen }

export async function analizarArchivo(archivo, diccionario = null) {
  const formData = new FormData();
  formData.append("archivo", archivo);

  if (diccionario) {
    formData.append("diccionario", diccionario);
    const respuesta = await api.post("/analizar/diccionario", formData);
    return respuesta.data;
  }

  const respuesta = await api.post("/analizar/archivo", formData);
  return respuesta.data;
}