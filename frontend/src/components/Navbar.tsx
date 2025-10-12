import { Link, NavLink } from "react-router-dom";

export default function Navbar() {
  const linkCls = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 rounded-md text-sm font-medium ${
      isActive ? "bg-gray-200 text-gray-900" : "text-gray-700 hover:bg-gray-100"
    }`;

  return (
    <header className="border-b bg-white">
      <nav className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
        <Link to="/" className="font-semibold">Revline</Link>
        <div className="flex gap-2">
          <NavLink to="/" className={linkCls} end>Dashboard</NavLink>
          <NavLink to="/health" className={linkCls}>Health</NavLink>
        </div>
      </nav>
    </header>
  );
}
