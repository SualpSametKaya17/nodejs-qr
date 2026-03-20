"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import type { AuthSession } from "@/types";

interface Props {
  session: AuthSession;
  menuUrl: string | null;
  children: React.ReactNode;
}

export function DashboardShell({ session, menuUrl, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingOrders, setPendingOrders] = useState(0);

  useEffect(() => {
    async function fetchPending() {
      try {
        const res = await fetch("/api/orders?status=PENDING&limit=200");
        const json = await res.json();
        if (json.success) setPendingOrders(json.data.orders.length);
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
        pendingOrders={pendingOrders}
      />
      <div className="flex flex-col flex-1 min-w-0">
        <TopBar session={session} onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
