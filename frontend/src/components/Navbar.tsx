import { NavLink } from "react-router-dom";

const linkBase = "inline-flex items-center rounded-md px-3 py-2 text-sm font-medium";
const linkInactive = "text-gray-600 hover:text-gray-900 hover:bg-gray-100";
const linkActive = "text-gray-900 bg-gray-100";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/90 backdrop-blur">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <NavLink to="/" className="text-base font-semibold tracking-tight">Revline</NavLink>
        <nav className="flex items-center gap-1">
          <NavLink to="/" className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}>Home</NavLink>
          <NavLink to="/health" className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}>Health</NavLink>
          <NavLink to="/about" className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}>About</NavLink>
        </nav>
      </div>
    </header>
  );
}
