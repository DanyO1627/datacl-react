import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Error404 from "./pages/Error404";
import Registro from "./pages/Registro";
import Login from "./pages/Login";
import DashboardCliente from "./pages/DashboardCliente";
import RutaProtegida from "./components/RutaProtegida";
import RutaConPermiso from "./components/RutaConPermiso";
import RutaAdmin from "./components/RutaAdmin";
import RecuperarPassword from "./pages/RecuperarPassword";
import Informes from "./pages/Informes";
import DashboardAdmin from "./pages/DashboardAdmin";
import Admin from "./pages/Admin";
import AdminConfig from "./pages/AdminConfig";
import CargaArchivo from "./pages/CargaArchivo";
import EditarTratamiento from "./pages/EditarTratamiento";
import DetalleTratamiento from "./pages/DetalleTratamiento";
import MisTratamientos from "./pages/MisTratamientos";
import Riesgos from "./pages/Riesgos";
import ResultadosAnalisis from "./pages/ResultadoAnalisis";
import { FormularioProvider } from "./context/FormularioContext";
import Paso1 from "./pages/formulario/Paso1";
import Paso2 from "./pages/formulario/Paso2";
import Paso3 from "./pages/formulario/Paso3";
import Paso4 from "./pages/formulario/Paso4";
import Perfil from "./pages/Perfil";
import VistaPrevia from "./pages/VistaPrevia";
import ConfirmacionDescarga from "./pages/ConfirmacionDescarga";
import DetalleOrganizacion from "./pages/DetalleOrganizacion";
import IngresoManual from "./pages/IngresoManual";
import ConexionBD from "./pages/ConexionBD";
import HistorialVersiones from "./pages/HistorialVersiones";
import CambiarPasswordObligatorio from "./pages/CambiarPasswordObligatorio";

function App() {
  return (
    <BrowserRouter>
      <FormularioProvider>
        <Routes>
          {/* Rutas públicas */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Registro />} />
          <Route path="/recuperar-password" element={<RecuperarPassword />} />

          {/* R10.7 — requiere sesión pero NO va envuelta en RutaProtegida:
              esa misma redirige acá cuando debe_cambiar_password === true,
              así que envolverla causaría un loop infinito. El guard de auth
              lo hace el propio componente. */}
          <Route path="/cambiar-password" element={<CambiarPasswordObligatorio />} />

          {/* Rutas admin */}
          <Route
            path="/dashboardAdmin"
            element={
              <RutaAdmin>
                <DashboardAdmin />
              </RutaAdmin>
            }
          />
          <Route
            path="/admin"
            element={
              <RutaAdmin>
                <Admin />
              </RutaAdmin>
            }
          />
          <Route
            path="/admin/config"
            element={
              <RutaAdmin>
                <AdminConfig />
              </RutaAdmin>
            }
          />
          <Route
            path="/admin/detalle/:id"
            element={
              <RutaAdmin>
                <DetalleOrganizacion />
              </RutaAdmin>
            }
          />
          <Route
            path="/admin/organizaciones/:id"
            element={
              <RutaAdmin>
                <DetalleOrganizacion />
              </RutaAdmin>
            }
          />

          {/* Rutas protegidas */}
          <Route
            path="/dashboard"
            element={
              <RutaProtegida>
                <DashboardCliente />
              </RutaProtegida>
            }
          />
          <Route
            path="/subir-archivo"
            element={
              <RutaConPermiso modulo="tratamientos" accion="crear">
                <CargaArchivo />
              </RutaConPermiso>
            }
          />
          <Route
            path="/nueva-sesion/conexion-bd"
            element={
              <RutaConPermiso modulo="tratamientos" accion="crear">
                <ConexionBD />
              </RutaConPermiso>
            }
          />
          <Route
            path="/informes"
            element={
              <RutaConPermiso modulo="informes" accion="ver">
                <Informes />
              </RutaConPermiso>
            }
          />
          <Route
            path="/informes/nuevo"
            element={
              <RutaConPermiso modulo="informes" accion="generar">
                <VistaPrevia />
              </RutaConPermiso>
            }
          />
          <Route
            path="/informes/confirmacion"
            element={
              <RutaConPermiso modulo="informes" accion="generar">
                <ConfirmacionDescarga />
              </RutaConPermiso>
            }
          />
          <Route
            path="/mis-tratamientos"
            element={
              <RutaConPermiso modulo="tratamientos" accion="ver">
                <MisTratamientos />
              </RutaConPermiso>
            }
          />
          <Route
            path="/tratamientos/:id"
            element={
              <RutaConPermiso modulo="tratamientos" accion="ver">
                <DetalleTratamiento />
              </RutaConPermiso>
            }
          />
          <Route
            path="/tratamientos/:id/editar"
            element={
              <RutaConPermiso modulo="tratamientos" accion="editar">
                <EditarTratamiento />
              </RutaConPermiso>
            }
          />
          <Route
            path="/mis-tratamientos/:id/historial"
            element={
              <RutaConPermiso modulo="tratamientos" accion="ver">
                <HistorialVersiones />
              </RutaConPermiso>
            }
          />
          <Route
            path="/perfil"
            element={
              <RutaProtegida>
                <Perfil />
              </RutaProtegida>
            }
          />
          <Route
            path="/riesgos"
            element={
              <RutaConPermiso modulo="riesgos" accion="ver">
                <Riesgos />
              </RutaConPermiso>
            }
          />
          <Route
            path="/resultados-analisis"
            element={
              <RutaConPermiso modulo="tratamientos" accion="crear">
                <ResultadosAnalisis />
              </RutaConPermiso>
            }
          />

          {/* Ingreso manual */}
          <Route
            path="/nueva-sesion/manual"
            element={
              <RutaConPermiso modulo="tratamientos" accion="crear">
                <IngresoManual />
              </RutaConPermiso>
            }
          />

          {/* Formulario RAT — wizard compartido por crear Y editar (ver
              RutaConPermiso.jsx: EditarTratamiento.jsx redirige acá mismo) */}
          <Route
            path="/nuevo-tratamiento"
            element={
              <RutaConPermiso permisos={[{ modulo: "tratamientos", accion: "crear" }, { modulo: "tratamientos", accion: "editar" }]}>
                <Paso1 />
              </RutaConPermiso>
            }
          />
          <Route
            path="/nuevo-tratamiento/paso2"
            element={
              <RutaConPermiso permisos={[{ modulo: "tratamientos", accion: "crear" }, { modulo: "tratamientos", accion: "editar" }]}>
                <Paso2 />
              </RutaConPermiso>
            }
          />
          <Route
            path="/nuevo-tratamiento/paso3"
            element={
              <RutaConPermiso permisos={[{ modulo: "tratamientos", accion: "crear" }, { modulo: "tratamientos", accion: "editar" }]}>
                <Paso3 />
              </RutaConPermiso>
            }
          />
          <Route
            path="/nuevo-tratamiento/paso4"
            element={
              <RutaConPermiso permisos={[{ modulo: "tratamientos", accion: "crear" }, { modulo: "tratamientos", accion: "editar" }]}>
                <Paso4 />
              </RutaConPermiso>
            }
          />

          {/* 404 */}
          <Route path="*" element={<Error404 />} />
        </Routes>
      </FormularioProvider>
    </BrowserRouter>
  );
}

export default App;
