import axios from "axios"

const BASE_URL = "http://localhost:8000"

const api = axios.create({ baseURL: BASE_URL })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token")
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export async function obtenerTratamientos(token) {
  const res = await api.get("/tratamientos", {
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.data
}
