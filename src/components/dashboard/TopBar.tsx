"use client";

import { useRouter } from "next/navigation";
import type { AuthSession } from "@/types";

interface TopBarProps {
  session: AuthSession;
  onMenuClick: () => void;
}

export function TopBar({ session, onMenuClick }: TopBarProps) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 shrink-0">
      {/* Hamburger - sadece mobilde */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        aria-label="Menüyü aç"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Desktop'ta boş alan */}
      <div className="hidden lg:block" />

      <div className="flex items-center gap-2 sm:gap-3">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium text-gray-900 truncate max-w-[150px]">{session.name}</p>
          <p className="text-xs text-gray-500 truncate max-w-[150px]">{session.email}</p>
        </div>

        <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
          <span className="text-sm font-semibold text-blue-700">
            {session.name.charAt(0).toUpperCase()}
          </span>
        </div>

        <button
          onClick={handleLogout}
          className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          title="Çıkış yap"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </header>
  );
}
