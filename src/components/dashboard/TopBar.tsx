"use client";

import { useRouter } from "next/navigation";
import type { AuthSession } from "@/types";

export function TopBar({ session }: { session: AuthSession }) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
      <div />

      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-medium text-gray-900">{session.name}</p>
          <p className="text-xs text-gray-500">{session.email}</p>
        </div>

        <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center">
          <span className="text-sm font-semibold text-blue-700">
            {session.name.charAt(0).toUpperCase()}
          </span>
        </div>

        <button
          onClick={handleLogout}
          className="ml-2 p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
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
