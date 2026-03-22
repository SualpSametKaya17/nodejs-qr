"use client";

import { useEffect, useState, useCallback, useRef } from "react";

type OrderStatus = "PENDING" | "CONFIRMED" | "PREPARING" | "READY" | "DELIVERED" | "CANCELLED";

interface OrderItemModifier {
  id: number;
  name: string;
  price: number | string;
}

interface OrderItem {
  id: number;
  quantity: number;
  unitPrice: number | string;
  note: string | null;
  menuItem: { name: string; imageUrl: string | null };
  modifiers: OrderItemModifier[];
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

const STATUS_BADGE: Record<OrderStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  CONFIRMED: "bg-blue-100 text-blue-700",
  PREPARING: "bg-orange-100 text-orange-700",
  READY: "bg-green-100 text-green-700",
  DELIVERED: "bg-gray-100 text-gray-500",
  CANCELLED: "bg-red-100 text-red-600",
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

const NEXT_BTN_COLORS: Partial<Record<OrderStatus, string>> = {
  PENDING: "bg-green-600 hover:bg-green-700",
  CONFIRMED: "bg-orange-500 hover:bg-orange-600",
  PREPARING: "bg-blue-600 hover:bg-blue-700",
  READY: "bg-gray-700 hover:bg-gray-800",
};

const FILTER_TABS: { key: OrderStatus | "ALL"; label: string }[] = [
  { key: "ALL", label: "Tümü" },
  { key: "PENDING", label: "Bekliyor" },
  { key: "CONFIRMED", label: "Onaylandı" },
  { key: "PREPARING", label: "Hazırlanıyor" },
  { key: "READY", label: "Hazır" },
  { key: "DELIVERED", label: "Teslim" },
];

function useElapsedSeconds(createdAt: string) {
  const [elapsed, setElapsed] = useState(() =>
    Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000)
  );
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [createdAt]);
  return elapsed;
}

function ElapsedTimer({ createdAt, status }: { createdAt: string; status: OrderStatus }) {
  const elapsed = useElapsedSeconds(createdAt);
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  const isActive = status === "PENDING" || status === "CONFIRMED" || status === "PREPARING";
  const colorClass = !isActive
    ? "text-gray-400"
    : elapsed < 300
    ? "text-gray-500"
    : elapsed < 600
    ? "text-orange-500 font-semibold"
    : "text-red-600 font-semibold";

  const formatted =
    elapsed < 3600
      ? `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
      : `${Math.floor(elapsed / 3600)}s ${String(minutes % 60).padStart(2, "0")}dk`;

  return (
    <span className={`text-xs tabular-nums ${colorClass}`}>{formatted}</span>
  );
}

export function OrdersClient({ initialOrders }: Props) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [filter, setFilter] = useState<OrderStatus | "ALL">("ALL");
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [newOrderIds, setNewOrderIds] = useState<Set<number>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const prevOrderIdsRef = useRef<Set<number>>(new Set(initialOrders.map((o) => o.id)));
  const audioRef = useRef<AudioContext | null>(null);

  async function playBeep() {
    try {
      if (!audioRef.current) audioRef.current = new AudioContext();
      const ctx = audioRef.current;
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
    } catch { /* Ses desteği yoksa sessiz geç */ }
  }

  const refreshOrders = useCallback(async (showSpinner = false) => {
    if (showSpinner) setIsRefreshing(true);
    try {
      const res = await fetch("/api/orders");
      const json = await res.json();
      if (!json.success) return;
      const fetched: Order[] = json.data.orders;

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
        }, 8000);
      }
      prevOrderIdsRef.current = new Set(fetched.map((o) => o.id));
      setOrders(fetched);
    } catch { /* ağ hatası — sessiz geç */ }
    finally {
      if (showSpinner) setIsRefreshing(false);
    }
  }, []);

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
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-gray-900">Siparişler</h1>
            {pendingCount > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full animate-pulse">
                {pendingCount} bekliyor
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">Her 5 saniyede otomatik güncellenir</p>
        </div>
        <button
          onClick={() => refreshOrders(true)}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-60"
        >
          <svg
            className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Yenile
        </button>
      </div>

      {/* Filtre sekmeleri */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {FILTER_TABS.map((tab) => {
          const count =
            tab.key === "ALL"
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
                <span
                  className={`px-1.5 py-0.5 rounded-full text-xs ${
                    filter === tab.key
                      ? "bg-white/20 text-white"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Sipariş listesi */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-200 rounded-xl py-16 text-center">
          <p className="text-gray-400 text-sm">Bu filtrede sipariş yok.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => (
            <div
              key={order.id}
              className={`bg-white border border-gray-200 rounded-xl overflow-hidden transition-colors ${
                newOrderIds.has(order.id)
                  ? "border-yellow-400 ring-2 ring-yellow-100"
                  : ""
              }`}
            >
              {/* Sipariş header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 gap-2 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-gray-900">#{order.id}</span>

                  {order.tableNumber && (
                    <span className="text-xs font-medium bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                      Masa {order.tableNumber}
                    </span>
                  )}

                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[order.status]}`}>
                    {STATUS_LABELS[order.status]}
                  </span>

                  {newOrderIds.has(order.id) && (
                    <span className="text-xs font-bold bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full animate-pulse">
                      🔔 Yeni!
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <ElapsedTimer createdAt={order.createdAt} status={order.status} />
                  <span className="text-sm font-bold text-gray-900">
                    ₺{Number(order.totalAmount).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Ürünler */}
              <div className="px-4 py-3 space-y-2">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="w-5 h-5 rounded-md bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 flex-shrink-0 mt-0.5">
                      {item.quantity}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="block font-medium text-gray-800">{item.menuItem.name}</span>
                      {(item.modifiers ?? []).length > 0 && (
                        <span className="text-xs text-gray-400">
                          {(item.modifiers ?? []).map((m) => m.name).join(", ")}
                        </span>
                      )}
                      {item.note && (
                        <span className="text-xs text-orange-500 block">Not: {item.note}</span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0 mt-0.5">
                      ₺{(Number(item.unitPrice) * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}

                {order.customerNote && (
                  <p className="text-xs text-gray-400 mt-1 pt-1.5 border-t border-gray-100 italic">
                    Not: {order.customerNote}
                  </p>
                )}
              </div>

              {/* Aksiyon butonları */}
              {order.status !== "DELIVERED" && order.status !== "CANCELLED" && (
                <div className="px-4 pb-3 flex gap-2">
                  {NEXT_STATUS[order.status] && (
                    <button
                      onClick={() => updateStatus(order.id, NEXT_STATUS[order.status]!)}
                      disabled={updatingId === order.id}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 text-white ${NEXT_BTN_COLORS[order.status]}`}
                    >
                      {updatingId === order.id ? (
                        <>
                          <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Güncelleniyor...
                        </>
                      ) : (
                        NEXT_LABELS[order.status]
                      )}
                    </button>
                  )}
                  <button
                    onClick={() => updateStatus(order.id, "CANCELLED")}
                    disabled={updatingId === order.id}
                    className="px-3 py-2 rounded-lg text-xs font-semibold border border-red-200 text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    İptal
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
