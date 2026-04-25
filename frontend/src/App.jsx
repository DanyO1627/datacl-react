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
import CargaArchivo from "./pages/CargaArchivo";
import EditarTratamiento from "./pages/EditarTratamiento";
import DetalleTratamiento from "./pages/DetalleTratamiento";
import MisTratamientos from "./pages/MisTratamientos";
import Riesgos from "./pages/Riesgos";
import ResultadosAnalisis from "./pages/ResultadoAnalisis";
import { FormularioProvider } from "./context/FormularioContext";
import Paso1 from "./pages/formulario/Paso1";
import VistaPrevia from "./pages/VistaPrevia";
import ConfirmacionDescarga from "./pages/ConfirmacionDescarga";

function App() {
  return (
    <BrowserRouter>
    <FormularioProvider>
      <Routes>

        {/* públicas */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/recuperar-password" element={<RecuperarPassword />} />

        {/* admin*/}
        <Route path="/dashboardAdmin" element={
          <RutaAdmin><DashboardAdmin /></RutaAdmin>
        } />
        <Route path="/admin" element={
          <RutaAdmin><Admin /></RutaAdmin>
        } />
        <Route path="/admin/detalle/:id" element={
          <RutaAdmin><Detalle /></RutaAdmin>
        } />

        {/* protegidas */}
        <Route path="/dashboard" element={
          <RutaProtegida><DashboardCliente /></RutaProtegida>
        } />
        <Route path="/subir-archivo" element={
          <RutaProtegida><CargaArchivo /></RutaProtegida>
        } />
        <Route path="/informes" element={
          <RutaProtegida><Informes /></RutaProtegida>
        } />
        <Route path="/informes/nuevo" element={
          <RutaProtegida><VistaPrevia /></RutaProtegida>
        } />
        <Route path="/informes/confirmacion" element={
          <RutaProtegida><ConfirmacionDescarga /></RutaProtegida>
        } />
        <Route path="/mis-tratamientos" element={
          <RutaProtegida><MisTratamientos /></RutaProtegida>
        } />
        <Route path="/tratamientos/:id" element={
          <RutaProtegida><DetalleTratamiento /></RutaProtegida>
        } />
        <Route path="/tratamientos/:id/editar" element={
          <RutaProtegida><EditarTratamiento /></RutaProtegida>
        } />
        <Route path="/perfil" element={
          <RutaProtegida>
            <div>Mi perfil — próximamente</div>
          </RutaProtegida>
        } />
        <Route path="/riesgos" element={
          <RutaProtegida><Riesgos /></RutaProtegida>
        } />
        <Route path="/resultados-analisis" element={
          <RutaProtegida><ResultadosAnalisis /></RutaProtegida>
        } />
        <Route path="/nuevo-tratamiento" element={
          <RutaProtegida><Paso1 /></RutaProtegida>
        } />

        <Route path="*" element={<Error404 />} />
      </Routes>
      </FormularioProvider>
    </BrowserRouter>
  );
}

export default App;
