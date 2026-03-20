"use client";

import { useEffect, useState, useCallback, useRef } from "react";

type OrderStatus = "PENDING" | "CONFIRMED" | "PREPARING" | "READY" | "DELIVERED" | "CANCELLED";

interface OrderItem {
  id: number;
  quantity: number;
  unitPrice: number | string;
  note: string | null;
  menuItem: { name: string; imageUrl: string | null };
}

interface Order {
  id: number;
  tableNumber: string | null;
  customerNote: string | null;
  status: OrderStatus;
  totalAmount: number | string;
  createdAt: string;
  items: OrderItem[];
}

interface Props {
  initialOrders: Order[];
}

const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "Bekliyor",
  CONFIRMED: "Onaylandı",
  PREPARING: "Hazırlanıyor",
  READY: "Hazır",
  DELIVERED: "Teslim Edildi",
  CANCELLED: "İptal",
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-700 border-yellow-200",
  CONFIRMED: "bg-blue-100 text-blue-700 border-blue-200",
  PREPARING: "bg-orange-100 text-orange-700 border-orange-200",
  READY: "bg-green-100 text-green-700 border-green-200",
  DELIVERED: "bg-gray-100 text-gray-600 border-gray-200",
  CANCELLED: "bg-red-100 text-red-600 border-red-200",
};

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  PENDING: "CONFIRMED",
  CONFIRMED: "PREPARING",
  PREPARING: "READY",
  READY: "DELIVERED",
};

const NEXT_LABELS: Partial<Record<OrderStatus, string>> = {
  PENDING: "Onayla",
  CONFIRMED: "Hazırlamaya Başla",
  PREPARING: "Hazır İşaretle",
  READY: "Teslim Edildi",
};

const FILTER_TABS: { key: OrderStatus | "ALL"; label: string }[] = [
  { key: "ALL", label: "Tümü" },
  { key: "PENDING", label: "Bekliyor" },
  { key: "CONFIRMED", label: "Onaylandı" },
  { key: "PREPARING", label: "Hazırlanıyor" },
  { key: "READY", label: "Hazır" },
  { key: "DELIVERED", label: "Teslim" },
];

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s önce`;
  if (diff < 3600) return `${Math.floor(diff / 60)}dk önce`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}sa önce`;
  return new Date(dateStr).toLocaleDateString("tr-TR");
}

export function OrdersClient({ initialOrders }: Props) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [filter, setFilter] = useState<OrderStatus | "ALL">("ALL");
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [newOrderIds, setNewOrderIds] = useState<Set<number>>(new Set());
  const prevOrderIdsRef = useRef<Set<number>>(new Set(initialOrders.map((o) => o.id)));
  const audioRef = useRef<AudioContext | null>(null);

  // Bildirim sesi (Web Audio API)
  function playBeep() {
    try {
      if (!audioRef.current) audioRef.current = new AudioContext();
      const ctx = audioRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    } catch { /* Ses desteği yoksa sessiz geç */ }
  }

  // Siparişleri yenile
  const refreshOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/orders");
      const json = await res.json();
      if (!json.success) return;
      const fetched: Order[] = json.data.orders;

      // Yeni siparişleri tespit et
      const freshIds = new Set<number>();
      for (const o of fetched) {
        if (!prevOrderIdsRef.current.has(o.id) && o.status === "PENDING") {
          freshIds.add(o.id);
        }
      }
      if (freshIds.size > 0) {
        playBeep();
        setNewOrderIds((prev) => new Set([...prev, ...freshIds]));
        setTimeout(() => {
          setNewOrderIds((prev) => {
            const next = new Set(prev);
            freshIds.forEach((id) => next.delete(id));
            return next;
          });
        }, 6000);
      }
      prevOrderIdsRef.current = new Set(fetched.map((o) => o.id));
      setOrders(fetched);
    } catch { /* ağ hatası — sessiz geç */ }
  }, []);

  // 5 saniyede bir yenile (sekme aktifken)
  useEffect(() => {
    const interval = setInterval(() => {
      if (!document.hidden) refreshOrders();
    }, 5000);
    return () => clearInterval(interval);
  }, [refreshOrders]);

  async function updateStatus(orderId: number, status: OrderStatus) {
    setUpdatingId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (json.success) {
        setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status } : o));
      }
    } finally {
      setUpdatingId(null);
    }
  }

  const filtered = filter === "ALL" ? orders : orders.filter((o) => o.status === filter);

  const pendingCount = orders.filter((o) => o.status === "PENDING").length;

  return (
    <div className="space-y-5">
      {/* Başlık */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">Siparişler</h1>
            {pendingCount > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
                {pendingCount} yeni
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">Otomatik güncellenir (5s)</p>
        </div>
        <button
          onClick={refreshOrders}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Yenile
        </button>
      </div>

      {/* Filtre sekmeleri */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {FILTER_TABS.map((tab) => {
          const count = tab.key === "ALL"
            ? orders.length
            : orders.filter((o) => o.status === tab.key).length;
          return (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                filter === tab.key
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {tab.label}
              {count > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-xs ${filter === tab.key ? "bg-white/20 text-white" : "bg-gray-200 text-gray-500"}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Sipariş listesi */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-200 rounded-2xl py-16 text-center">
          <p className="text-gray-400 text-sm">Bu filtrede sipariş yok.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => (
            <div
              key={order.id}
              className={`bg-white border rounded-2xl overflow-hidden transition-all ${
                newOrderIds.has(order.id)
                  ? "border-yellow-400 shadow-lg shadow-yellow-100 ring-2 ring-yellow-200"
                  : "border-gray-200"
              }`}
            >
              {/* Sipariş header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50 gap-2 flex-wrap">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="text-sm font-bold text-gray-900">#{order.id}</span>
                  {order.tableNumber && (
                    <span className="text-xs font-semibold bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                      Masa {order.tableNumber}
                    </span>
                  )}
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${STATUS_COLORS[order.status]}`}>
                    {STATUS_LABELS[order.status]}
                  </span>
                  {newOrderIds.has(order.id) && (
                    <span className="text-xs font-bold bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full animate-pulse">
                      🔔 Yeni!
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">{timeAgo(order.createdAt)}</span>
                  <span className="text-sm font-bold text-gray-900">₺{Number(order.totalAmount).toFixed(2)}</span>
                </div>
              </div>

              {/* Ürünler */}
              <div className="px-4 py-3 space-y-1.5">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="w-5 h-5 rounded-md bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 flex-shrink-0">
                      {item.quantity}
                    </span>
                    <span className="truncate">{item.menuItem.name}</span>
                    <span className="ml-auto text-xs text-gray-400 flex-shrink-0">
                      ₺{(Number(item.unitPrice) * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
                {order.customerNote && (
                  <p className="text-xs text-gray-400 mt-1.5 pt-1.5 border-t border-gray-50 italic">
                    Not: {order.customerNote}
                  </p>
                )}
              </div>

              {/* Aksiyon butonları */}
              {(NEXT_STATUS[order.status] || order.status !== "CANCELLED") && (
                <div className="px-4 pb-3 flex gap-2">
                  {NEXT_STATUS[order.status] && (
                    <button
                      onClick={() => updateStatus(order.id, NEXT_STATUS[order.status]!)}
                      disabled={updatingId === order.id}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 text-white ${
                        order.status === "PENDING" ? "bg-green-600 hover:bg-green-700" :
                        order.status === "CONFIRMED" ? "bg-orange-500 hover:bg-orange-600" :
                        order.status === "PREPARING" ? "bg-blue-600 hover:bg-blue-700" :
                        "bg-gray-600 hover:bg-gray-700"
                      }`}
                    >
                      {updatingId === order.id ? "..." : NEXT_LABELS[order.status]}
                    </button>
                  )}
                  {order.status !== "DELIVERED" && order.status !== "CANCELLED" && (
                    <button
                      onClick={() => updateStatus(order.id, "CANCELLED")}
                      disabled={updatingId === order.id}
                      className="px-3 py-2 rounded-xl text-xs font-semibold border border-red-200 text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      İptal
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
