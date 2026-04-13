import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import Error404 from "./pages/Error404";
import Registro from "./pages/Registro";
import Login from "./pages/Login";
import DashboardCliente from "./pages/DashboardCliente";
import RutaProtegida from "./components/RutaProtegida"

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/registro" element={<Registro />} />
                <Route path="/recuperar-password" element={<div>Recuperar contraseña — próximamente</div>} />
                <Route path="*" element={<Error404 />} />

                <Route path="/dashboard" element={
                    <RutaProtegida>
                        <DashboardCliente />
                    </RutaProtegida>
                } />

            </Routes>
        </BrowserRouter>
    );
}

export default App;