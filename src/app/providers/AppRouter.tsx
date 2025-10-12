import { HomePage, RoomPage } from "@pages";
import { BrowserRouter, Route, Routes } from "react-router-dom";

export const AppRouter = () => {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/room/:id" element={<RoomPage />} />
            </Routes>
        </BrowserRouter>
    )
}