import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Error404 from "./pages/Error404";
import Registro from "./pages/Registro";
import Login from "./pages/Login";
import DashboardCliente from "./pages/DashboardCliente";
import RutaProtegida from "./components/RutaProtegida";
import RecuperarPassword from "./pages/RecuperarPassword";
import Informes from "./pages/Informes";
import Detalle from "./pages/Detalle";
import DashboardAdmin from "./pages/DashboardAdmin";
import Admin from "./pages/Admin";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/recuperar-password" element={<RecuperarPassword />} />
        <Route path="/informes" element={<Informes />} /> 
        <Route path="/detalle" element={<Detalle />} />
        <Route path="/dashboardAdmin" element={<DashboardAdmin />} />
        <Route path="/admin" element={<Admin />} />
      

        <Route path="/dashboard" element={
          <RutaProtegida>
            <DashboardCliente />
          </RutaProtegida>
        } />

        <Route path="*" element={<Error404 />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;