// src/App.tsx
import { Route, Routes, Navigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";

import Home from "@/pages/Home";
import Health from "@/pages/Health";
import About from "@/pages/About";
import LoginPage from "@/pages/Login";
import RegisterPage from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";

import ActiveROBoard from "@/pages/ActiveROBoard";
import ActiveRODetail from "@/pages/ActiveRODetail";

import { RequireAuth } from "@/features/auth/AuthProvider";

export default function App() {
  return (
    <Routes>
      {/* Public auth routes live outside the main layout */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Main site layout */}
      <Route element={<Layout />}>
        {/* Home */}
        <Route index element={<Home />} />

        {/* Utilities */}
        <Route path="health" element={<Health />} />
        <Route path="about" element={<About />} />

        {/* Active RO board + detail */}
        <Route path="ros">
          {/* redirect /ros -> /ros/active */}
          <Route index element={<Navigate to="/ros/active" replace />} />
          <Route path="active" element={<ActiveROBoard />} />
          <Route path=":id" element={<ActiveRODetail />} />
        </Route>

        {/* Protected area */}
        <Route
          path="dashboard"
          element={
            <RequireAuth>
              <Dashboard />
            </RequireAuth>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
