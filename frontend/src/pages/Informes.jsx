import { useEffect, useState } from 'react'
import '../styles/informes.css'
import BarraLateral from '../components/BarraLateral'

const API = 'http://localhost:8000'

export default function Informes() {
  const [informes, setInformes] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    cargarInformes()
  }, [])

  async function cargarInformes() {
    try {
      const res = await fetch(`${API}/informes`)
      const data = await res.json()
      setInformes(data)
    } catch (e) {
      console.error('Error al cargar informes:', e)
    } finally {
      setCargando(false)
    }
  }

  async function generarInforme() {
    const orgId = prompt('Ingresa el ID de la organización:')
    if (!orgId) return

    try {
      const res = await fetch(`${API}/informes?org_id=${orgId}`, { method: 'POST' })
      if (!res.ok) {
        const err = await res.json()
        alert(err.detail || 'Error al generar informe')
        return
      }
      await cargarInformes()
    } catch (e) {
      alert('Error al conectar con el servidor')
    }
  }

  function descargar(id) {
    window.open(`${API}/informes/${id}/descargar`, '_blank')
  }

  function formatearFecha(fecha) {
    if (!fecha) return '-'
    return new Date(fecha).toLocaleDateString('es-CL')
  }

  return (
    <div className="informes-layout">
      <BarraLateral />

      <main className="informes-main">
        <div className="informes-header">
          <h1 className="informes-titulo">Informes</h1>
          <div className="informes-header-right">
            <button className="btn-generar" onClick={generarInforme}>
              + Generar nuevo informe
            </button>
            <div className="informes-logo">logo</div>
          </div>
        </div>

        <div className="tabla-contenedor">
          {cargando ? (
            <p className="tabla-cargando">Cargando...</p>
          ) : (
            <table className="tabla-informes">
              <thead>
                <tr>
                  <th>Fecha de generación</th>
                  <th>Nº de tratamientos incluidos</th>
                  <th>Descargar informe</th>
                </tr>
              </thead>
              <tbody>
                {informes.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="tabla-vacia">
                      No hay informes generados
                    </td>
                  </tr>
                ) : (
                  informes.map((inf) => (
                    <tr key={inf.id}>
                      <td>{formatearFecha(inf.generado_en)}</td>
                      <td>{inf.num_tratamientos}</td>
                      <td>
                        <button
                          className="btn-descargar"
                          onClick={() => descargar(inf.id)}
                        >
                          Descargar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  )
}
