// src/App.tsx
import { Route, Routes, Navigate } from "react-router-dom";
import { QueryProvider } from "./lib/query/QueryProvider";
import Home from "./pages/Home";
import Health from "./pages/Health";
import About from "./pages/About";
import Navbar from "./components/Navbar";

export default function App() {
  return (
    <QueryProvider>
      <div className="min-h-screen bg-gray-50 text-gray-900">
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/health" element={<Health />} />
          <Route path="/about" element={<About />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </QueryProvider>
  );
}
