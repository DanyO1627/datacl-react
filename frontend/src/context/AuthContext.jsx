import { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => {
    const guardado = localStorage.getItem('usuario')
    return guardado ? JSON.parse(guardado) : null
  })

  function login(datos) {
    localStorage.setItem('token', datos.access_token)
    localStorage.setItem('usuario', JSON.stringify({
      nombre: datos.nombre,
      rol: datos.rol
    }))
    setUsuario({ nombre: datos.nombre, rol: datos.rol })
  }

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('usuario')
    setUsuario(null)
  }

  function getToken() {
    return localStorage.getItem('token')
  }

  return (
    <AuthContext.Provider value={{ usuario, login, logout, getToken }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
