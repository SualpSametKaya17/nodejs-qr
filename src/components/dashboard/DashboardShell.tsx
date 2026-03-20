"use client";

import { useState, useEffect, useRef } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import type { AuthSession } from "@/types";

interface PendingOrder {
  id: number;
  tableNumber: string | null;
  status: string;
  total: number | string;
  createdAt: string;
  items: { quantity: number; menuItem: { name: string } }[];
}

interface Props {
  session: AuthSession;
  menuUrl: string | null;
  children: React.ReactNode;
}

export function DashboardShell({ session, menuUrl, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const knownIdsRef = useRef<Set<number> | null>(null);

  async function playBeep() {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") await ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    } catch { /* sessiz geç */ }
  }

  useEffect(() => {
    async function fetchPending() {
      try {
        const res = await fetch("/api/orders?status=PENDING&limit=20");
        const json = await res.json();
        if (!json.success) return;
        const orders: PendingOrder[] = json.data.orders;

        if (knownIdsRef.current === null) {
          // İlk yükleme: mevcut siparişleri kaydet, ses çalma
          knownIdsRef.current = new Set(orders.map((o) => o.id));
        } else {
          // Yeni sipariş var mı kontrol et
          const hasNew = orders.some((o) => !knownIdsRef.current!.has(o.id));
          if (hasNew) playBeep();
          knownIdsRef.current = new Set(orders.map((o) => o.id));
        }

        setPendingOrders(orders);
      } catch { /* sessiz geç */ }
    }

    fetchPending();
    const interval = setInterval(fetchPending, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar
        restaurantName={session.name}
        menuUrl={menuUrl}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        pendingOrders={pendingOrders.length}
        role={session.role}
      />
      <div className="flex flex-col flex-1 min-w-0">
        <TopBar
          session={session}
          onMenuClick={() => setSidebarOpen(true)}
          pendingOrders={pendingOrders}
        />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
