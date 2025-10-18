import { NavLink, Link } from "react-router-dom";
import LogoutButton from "./LogoutButton";
import { useAuth } from "@/features/auth/AuthProvider";

function NavItem({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `px-2 py-1 text-sm ${isActive ? "font-semibold" : "text-gray-600 hover:text-gray-900"}`
      }
    >
      {children}
    </NavLink>
  );
}

export default function Navbar() {
  const { user } = useAuth();

  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        {/* Left: brand + nav */}
        <div className="flex items-center gap-6">
          <Link to="/" className="text-lg font-bold">
            Revline
          </Link>
          <nav className="flex items-center gap-2">
            <NavItem to="/">Home</NavItem>
            <NavItem to="/health">Health</NavItem>
            <NavItem to="/about">About</NavItem>
            {user && <NavItem to="/dashboard">Dashboard</NavItem>}
          </nav>
        </div>

        {/* Right: auth action */}
        <div className="flex items-center gap-3">
          {user ? (
            <LogoutButton />
          ) : (
            <NavLink
              to="/login"
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-100"
            >
              Sign in
            </NavLink>
          )}
        </div>
      </div>
    </header>
  );
}
