import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import RutaProtegida from './components/RutaProtegida'
import RutaAdmin from './components/RutaAdmin'
import Login from './pages/Login'
import Registro from './pages/Registro'
import Dashboard from './pages/Dashboard'
import DashboardAdmin from './pages/DashboardAdmin'
import Admin from './pages/Admin'
import Detalle from './pages/Detalle'
import Informes from './pages/Informes'
import RecuperarPassword from './pages/RecuperarPassword'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Registro />} />
          <Route path="/recuperar" element={<RecuperarPassword />} />

          <Route path="/dashboard" element={<RutaProtegida><Dashboard /></RutaProtegida>} />
          <Route path="/admin" element={<RutaAdmin><DashboardAdmin /></RutaAdmin>} />
          <Route path="/admin/organizaciones" element={<RutaAdmin><Admin /></RutaAdmin>} />
          <Route path="/admin/detalle/:id" element={<RutaAdmin><Detalle /></RutaAdmin>} />
          <Route path="/informes" element={<RutaProtegida><Informes /></RutaProtegida>} />

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
