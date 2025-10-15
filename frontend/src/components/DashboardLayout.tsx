import { NavLink } from 'react-router-dom';
import React from 'react';

const base = 'px-3 py-1.5 rounded-lg hover:bg-accent transition-colors';

function navClasses(isActive: boolean) {
  return [base, isActive ? 'bg-accent font-semibold' : 'text-foreground/80'].join(' ');
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh grid grid-rows-[auto_1fr]">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold">Revline</span>
            <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
              Frontend MVP
            </span>
          </div>
          <nav className="flex items-center gap-2">
            <NavLink to="/" end className={({ isActive }) => navClasses(isActive)}>
              Home
            </NavLink>
            <NavLink to="/dashboard" className={({ isActive }) => navClasses(isActive)}>
              Dashboard
            </NavLink>
            <NavLink to="/about" className={({ isActive }) => navClasses(isActive)}>
              About
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl p-4">{children}</main>
    </div>
  );
}
