import { NavLink } from "react-router-dom";
import React from "react";

const link =
  "px-3 py-1.5 rounded-lg hover:bg-accent";
const linkActive = "bg-accent font-semibold";
//const _linkInactive = "data-[active=true]:bg-accent data-[active=true]:font-semibold"; // kept if you still use data-attrs elsewhere

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh grid grid-rows-[auto_1fr]">
      {/* Header */}
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold">Revline</span>
            <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
              Frontend MVP
            </span>
          </div>
          <nav className="flex items-center gap-2">
            <NavLink
              to="/"
              className={({ isActive }: { isActive: boolean }) =>
                `${link} ${isActive ? linkActive : ""}`
              }
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/about"
              className={({ isActive }: { isActive: boolean }) =>
                `${link} ${isActive ? linkActive : ""}`
              }
            >
              About
            </NavLink>
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto w-full max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
