// frontend/src/components/LogoutButton.tsx
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthProvider";

export default function LogoutButton() {
  const { logout } = useAuth();        // use the context, not a lib helper
  const navigate = useNavigate();

  async function handleLogout() {
    try {
      await logout();                  // clears tokens + context user
    } finally {
      navigate("/login", { replace: true }); // always return to login
    }
  }

  return (
    <button
      onClick={handleLogout}
      className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-100"
      aria-label="Logout"
    >
      Logout
    </button>
  );
}
