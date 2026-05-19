import axios from 'axios'

const API = 'http://localhost:8000'

const api = axios.create({ baseURL: API })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export async function obtenerInformes() {
  const res = await api.get('/informes')
  return res.data
}

export async function descargarInforme(id, nombreOrg) {
  const respuesta = await api.get(`/informes/${id}/descargar`, {
    responseType: 'blob'
  })
  const url = window.URL.createObjectURL(new Blob([respuesta.data]))
  const link = document.createElement('a')
  link.href = url
  const fecha = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const nombreSeguro = (nombreOrg || 'organizacion')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '_')
  link.setAttribute('download', `RAT_${nombreSeguro}_${fecha}.pdf`)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

export async function agregarAnalisisIA(id) {
  const res = await api.post(`/informes/${id}/analizar`)
  return res.data
}

export async function obtenerAnalisisIA(id) {
  const res = await api.get(`/informes/${id}/analisis`)
  return res.data
}

export async function eliminarInforme(id) {
  await api.delete(`/informes/${id}`)
}