import { Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import Health from "./pages/Health";
import Navbar from "./components/Navbar";

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/health" element={<Health />} />
      </Routes>
    </div>
  );
}
