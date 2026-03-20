"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AuthSession } from "@/types";

interface PendingOrder {
  id: number;
  tableNumber: string | null;
  status: string;
  total: number | string;
  createdAt: string;
  items: { quantity: number; menuItem: { name: string } }[];
}

interface TopBarProps {
  session: AuthSession;
  onMenuClick: () => void;
  pendingOrders?: PendingOrder[];
}

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}sn önce`;
  if (diff < 3600) return `${Math.floor(diff / 60)}dk önce`;
  return `${Math.floor(diff / 3600)}sa önce`;
}

export function TopBar({ session, onMenuClick, pendingOrders = [] }: TopBarProps) {
  const router = useRouter();
  const [notifOpen, setNotifOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Panel dışına tıklayınca kapat
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    if (notifOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [notifOpen]);

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

      <div className="hidden lg:block" />

      <div className="flex items-center gap-2 sm:gap-3">

        {/* Bildirim zili */}
        <div className="relative" ref={panelRef}>
          <button
            onClick={() => setNotifOpen((v) => !v)}
            className="relative p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            aria-label="Bildirimler"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {pendingOrders.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                {pendingOrders.length > 99 ? "99+" : pendingOrders.length}
              </span>
            )}
          </button>

          {/* Bildirim paneli */}
          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <span className="text-sm font-semibold text-gray-900">
                  Bekleyen Siparişler
                </span>
                {pendingOrders.length > 0 && (
                  <span className="text-xs bg-red-100 text-red-600 font-bold px-2 py-0.5 rounded-full">
                    {pendingOrders.length}
                  </span>
                )}
              </div>

              {pendingOrders.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <svg className="w-10 h-10 text-gray-200 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  <p className="text-sm text-gray-400">Bekleyen sipariş yok</p>
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
                  {pendingOrders.map((order) => (
                    <Link
                      key={order.id}
                      href="/dashboard/orders"
                      onClick={() => setNotifOpen(false)}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                        <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-gray-900">
                            Sipariş #{order.id}
                            {order.tableNumber && (
                              <span className="ml-1.5 text-xs font-normal text-gray-500">
                                · Masa {order.tableNumber}
                              </span>
                            )}
                          </span>
                          <span className="text-xs text-gray-400 shrink-0">
                            {timeAgo(order.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">
                          {order.items.map((i) => `${i.quantity}x ${i.menuItem.name}`).join(", ")}
                        </p>
                        <p className="text-xs font-semibold text-gray-900 mt-0.5">
                          ₺{Number(order.total).toFixed(2)}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              <div className="border-t border-gray-100 px-4 py-2.5">
                <Link
                  href="/dashboard/orders"
                  onClick={() => setNotifOpen(false)}
                  className="text-xs text-blue-600 hover:underline font-medium"
                >
                  Tüm siparişleri görüntüle →
                </Link>
              </div>
            </div>
          )}
        </div>

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
