export function formatearFechaHora(valor, incluirMilisegundos = true) {
  if (!valor) return '—'

  const fecha = new Date(valor)
  if (Number.isNaN(fecha.getTime())) return '—'

  const pad = (numero, largo = 2) => String(numero).padStart(largo, '0')

  const fechaBase = [
    pad(fecha.getDate()),
    pad(fecha.getMonth() + 1),
    fecha.getFullYear(),
  ].join('/')

  const horaBase = [
    pad(fecha.getHours()),
    pad(fecha.getMinutes()),
    pad(fecha.getSeconds()),
  ].join(':')

  if (!incluirMilisegundos) {
    return `${fechaBase} ${horaBase}`
  }

  return `${fechaBase} ${horaBase}.${pad(fecha.getMilliseconds(), 3)}`
}
