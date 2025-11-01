import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthProvider";

export default function LogoutButton() {
  const { logoutUser } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    try {
      await logoutUser(); // clears tokens + context user
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
