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

export async function descargarInforme(id) {
  const respuesta = await api.get(`/informes/${id}/descargar`, {
    responseType: 'blob'
  })
  const url = window.URL.createObjectURL(new Blob([respuesta.data]))
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', `informe_${id}.pdf`)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}