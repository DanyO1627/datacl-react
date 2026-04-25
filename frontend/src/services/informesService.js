const API = 'http://localhost:8000'

export async function obtenerInformes(token) {
  const res = await fetch(`${API}/informes`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Error al obtener informes')
  return res.json()
}

export function descargarInforme(id, token) {
  const url = `${API}/informes/${id}/descargar`
  const link = document.createElement('a')
  link.href = url
  link.target = '_blank'
  link.rel = 'noopener noreferrer'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
