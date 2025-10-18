import React from "react";
import { Link } from "react-router-dom";
import LogoutButton from "@/components/LogoutButton";
import { useAuth } from "@/features/auth/AuthProvider";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  return (
    <div className="min-h-screen grid grid-rows-[auto_1fr] bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-lg font-bold">Revline</Link>
            <span className="rounded-full border px-2 py-0.5 text-xs text-gray-500">Frontend MVP</span>
          </div>
          <div>{user && <LogoutButton />}</div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
