import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Registro from "./pages/Registro";
import Login    from "./pages/Login";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Redirige la raíz al login */}
        <Route path="/"         element={<Navigate to="/login" replace />} />
        <Route path="/login"    element={<Login />} />
        <Route path="/registro" element={<Registro />} />

        {/* Próximas pantallas — se irán completando en siguientes sprints */}
        <Route path="/dashboard"          element={<div>Dashboard — próximamente</div>} />
        <Route path="/recuperar-password" element={<div>Recuperar contraseña — próximamente</div>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
