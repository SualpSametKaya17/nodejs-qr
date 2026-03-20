"use client";

import { useState, useEffect } from "react";
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

  useEffect(() => {
    async function fetchPending() {
      try {
        const res = await fetch("/api/orders?status=PENDING&limit=20");
        const json = await res.json();
        if (json.success) setPendingOrders(json.data.orders);
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
