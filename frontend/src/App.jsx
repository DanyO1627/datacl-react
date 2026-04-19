import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Error404 from "./pages/Error404";
import Registro from "./pages/Registro";
import Login from "./pages/Login";
import DashboardCliente from "./pages/DashboardCliente";
import RutaProtegida from "./components/RutaProtegida";
import RutaAdmin from "./components/RutaAdmin";
import RecuperarPassword from "./pages/RecuperarPassword";
import Informes from "./pages/Informes";
import Detalle from "./pages/Detalle";
import DashboardAdmin from "./pages/DashboardAdmin";
import Admin from "./pages/Admin";
import EditarTratamiento from "./pages/EditarTratamiento";
import DetalleTratamiento from "./pages/DetalleTratamiento";
import MisTratamientos from "./pages/MisTratamientos";
// import NuevoTratamiento from "./pages/NuevoTratamiento";

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
        <Route path="/dashboardAdmin" element={
          <RutaAdmin>
            <DashboardAdmin />
          </RutaAdmin>
        } />
        <Route path="/admin" element={
          <RutaAdmin>
            <Admin />
          </RutaAdmin>
        } />

        <Route path="/admin/detalle/:id" element={
          <RutaAdmin>
            <Detalle />
          </RutaAdmin>
        } />
      

        <Route path="/dashboard" element={
          <RutaProtegida>
            <DashboardCliente />
          </RutaProtegida>
        } />

        <Route path="/mis-tratamientos" element={
          <RutaProtegida>
            <MisTratamientos />
          </RutaProtegida>
        } />

        {/* <Route path="/nuevo-tratamiento" element={
          <RutaProtegida>
            <NuevoTratamiento />
          </RutaProtegida>
        } /> */}

        <Route path="/tratamientos/:id" element={
          <RutaProtegida>
            <DetalleTratamiento />
          </RutaProtegida>
        } />

        <Route path="/tratamientos/:id/editar" element={
          <RutaProtegida>
            <EditarTratamiento />
          </RutaProtegida>
        } />

        <Route path="*" element={<Error404 />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;