import { BrowserRouter, Routes, Route } from "react-router-dom"
import Home from "./pages/Home";

function App() {
    return (
        <BrowserRouter>
            <Routes>

                <Route path="/" element={<Home />} />
                {/*Otras pantallas, acá igual*/}
                
            </Routes>
        </BrowserRouter>
    )
}

export default App

