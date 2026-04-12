import { BrowserRouter, Routes, Route } from "react-router-dom"
import Home from "./pages/Home";
import Error404 from "./pages/Error404"

function App() {
    return (
        <BrowserRouter>
            <Routes>

                <Route path="/" element={<Home />} />
                <Route path="*" element={<Error404 />} />

            </Routes>
        </BrowserRouter>
    )
}

export default App

