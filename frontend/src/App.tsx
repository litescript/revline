// (7) App routes: keep existing pages, add /login and protected /dashboard
import { Route, Routes, Navigate } from "react-router-dom";
// (7a) fix imports to use alias
import Layout from "@/components/layout/Layout";
import Home from "@/pages/Home";
import Health from "@/pages/Health";
import About from "@/pages/About";
import LoginPage from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import { RequireAuth } from "@/features/auth/AuthProvider";
import RegisterPage from "@/pages/Register"


export default function App() {
  return (
    <Routes>
      {/* Public auth route lives outside the main layout */}
      <Route path="/login" element={<LoginPage />} />

      {/* Main site layout + routes */}
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="health" element={<Health />} />
        <Route path="about" element={<About />} />

        {/* Protected route */}
        <Route
          path="dashboard"
          element={
            <RequireAuth>
              <Dashboard />
            </RequireAuth>
          }
        />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
