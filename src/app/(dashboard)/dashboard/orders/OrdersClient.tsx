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

const STATUS_COLORS: Record<OrderStatus, string> = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  CONFIRMED: "bg-blue-50 text-blue-700 border-blue-200",
  PREPARING: "bg-orange-50 text-orange-700 border-orange-200",
  READY: "bg-emerald-50 text-emerald-700 border-emerald-200",
  DELIVERED: "bg-gray-50 text-gray-500 border-gray-200",
  CANCELLED: "bg-red-50 text-red-600 border-red-200",
};

const STATUS_LEFT_BORDER: Record<OrderStatus, string> = {
  PENDING: "border-l-amber-400",
  CONFIRMED: "border-l-blue-500",
  PREPARING: "border-l-orange-500",
  READY: "border-l-emerald-500",
  DELIVERED: "border-l-gray-300",
  CANCELLED: "border-l-red-300",
};

const STATUS_ICONS: Record<OrderStatus, string> = {
  PENDING: "⏳",
  CONFIRMED: "✓",
  PREPARING: "👨‍🍳",
  READY: "🟢",
  DELIVERED: "✅",
  CANCELLED: "✕",
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
  PENDING: "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100",
  CONFIRMED: "bg-orange-500 hover:bg-orange-600 shadow-orange-100",
  PREPARING: "bg-blue-600 hover:bg-blue-700 shadow-blue-100",
  READY: "bg-gray-700 hover:bg-gray-800 shadow-gray-100",
};

const FILTER_TABS: { key: OrderStatus | "ALL"; label: string; emoji: string }[] = [
  { key: "ALL", label: "Tümü", emoji: "📋" },
  { key: "PENDING", label: "Bekliyor", emoji: "⏳" },
  { key: "CONFIRMED", label: "Onaylandı", emoji: "✓" },
  { key: "PREPARING", label: "Hazırlanıyor", emoji: "👨‍🍳" },
  { key: "READY", label: "Hazır", emoji: "🟢" },
  { key: "DELIVERED", label: "Teslim", emoji: "✅" },
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
    ? "text-amber-600 font-semibold"
    : "text-red-600 font-bold";

  const formatted =
    elapsed < 3600
      ? `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
      : `${Math.floor(elapsed / 3600)}s ${String(minutes % 60).padStart(2, "0")}dk`;

  return (
    <span className={`flex items-center gap-1 text-xs tabular-nums ${colorClass}`}>
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" strokeWidth={2} />
        <path strokeLinecap="round" strokeWidth={2} d="M12 6v6l4 2" />
      </svg>
      {formatted}
    </span>
  );
}

function StatCard({
  label,
  count,
  emoji,
  active,
  onClick,
}: {
  label: string;
  count: number;
  emoji: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 min-w-[80px] flex flex-col items-center gap-0.5 py-3 px-2 rounded-2xl border transition-all text-center ${
        active
          ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-100"
          : "bg-white border-gray-200 text-gray-600 hover:border-blue-300 hover:bg-blue-50"
      }`}
    >
      <span className="text-base">{emoji}</span>
      <span className={`text-xl font-bold leading-tight ${active ? "text-white" : "text-gray-900"}`}>
        {count}
      </span>
      <span className={`text-xs ${active ? "text-blue-100" : "text-gray-400"}`}>{label}</span>
    </button>
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

  const statCounts: Record<OrderStatus | "ALL", number> = {
    ALL: orders.length,
    PENDING: orders.filter((o) => o.status === "PENDING").length,
    CONFIRMED: orders.filter((o) => o.status === "CONFIRMED").length,
    PREPARING: orders.filter((o) => o.status === "PREPARING").length,
    READY: orders.filter((o) => o.status === "READY").length,
    DELIVERED: orders.filter((o) => o.status === "DELIVERED").length,
    CANCELLED: orders.filter((o) => o.status === "CANCELLED").length,
  };

  return (
    <div className="space-y-5">
      {/* Başlık */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-gray-900">Siparişler</h1>
            {pendingCount > 0 && (
              <span className="flex items-center gap-1 bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full animate-pulse shadow-sm shadow-red-200">
                <span className="text-base leading-none">⏳</span>
                {pendingCount} bekliyor
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">Her 5 saniyede otomatik güncellenir</p>
        </div>
        <button
          onClick={() => refreshOrders(true)}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-60 shadow-sm"
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

      {/* İstatistik kartları */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {FILTER_TABS.map((tab) => (
          <StatCard
            key={tab.key}
            label={tab.label}
            count={statCounts[tab.key]}
            emoji={tab.emoji}
            active={filter === tab.key}
            onClick={() => setFilter(tab.key)}
          />
        ))}
      </div>

      {/* Sipariş listesi */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-200 rounded-2xl py-20 text-center">
          <p className="text-4xl mb-3">🗒️</p>
          <p className="text-gray-500 font-medium">Bu filtrede sipariş yok</p>
          <p className="text-gray-400 text-sm mt-1">Yeni siparişler otomatik görünecek</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => (
            <div
              key={order.id}
              className={`bg-white border-l-4 border border-gray-200 rounded-2xl overflow-hidden transition-all ${STATUS_LEFT_BORDER[order.status]} ${
                newOrderIds.has(order.id)
                  ? "ring-2 ring-amber-300 shadow-lg shadow-amber-50"
                  : "shadow-sm hover:shadow-md"
              }`}
            >
              {/* Sipariş header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50 gap-2 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Sipariş No */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-base font-black text-gray-900">#{order.id}</span>
                  </div>

                  {/* Masa */}
                  {order.tableNumber && (
                    <span className="flex items-center gap-1 text-xs font-bold bg-gray-900 text-white px-2.5 py-1 rounded-full">
                      🪑 Masa {order.tableNumber}
                    </span>
                  )}

                  {/* Statü badge */}
                  <span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${STATUS_COLORS[order.status]}`}>
                    <span className="text-sm leading-none">{STATUS_ICONS[order.status]}</span>
                    {STATUS_LABELS[order.status]}
                  </span>

                  {/* Yeni sipariş */}
                  {newOrderIds.has(order.id) && (
                    <span className="text-xs font-bold bg-amber-400 text-amber-900 px-2.5 py-1 rounded-full animate-bounce">
                      🔔 Yeni Sipariş!
                    </span>
                  )}
                </div>

                {/* Sağ: süre + tutar */}
                <div className="flex items-center gap-3">
                  <ElapsedTimer createdAt={order.createdAt} status={order.status} />
                  <span className="text-base font-black text-gray-900">
                    ₺{Number(order.totalAmount).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Ürün listesi */}
              <div className="px-4 py-3 space-y-2">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-start gap-3">
                    {/* Miktar badge */}
                    <span className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-black text-gray-700 flex-shrink-0 mt-0.5">
                      {item.quantity}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-semibold text-gray-800 block">{item.menuItem.name}</span>
                      {(item.modifiers ?? []).length > 0 && (
                        <span className="text-xs text-gray-400 block mt-0.5">
                          + {(item.modifiers ?? []).map((m) => m.name).join(" · ")}
                        </span>
                      )}
                      {item.note && (
                        <span className="text-xs text-amber-600 block mt-0.5 italic">📝 {item.note}</span>
                      )}
                    </div>
                    <span className="text-sm font-semibold text-gray-500 flex-shrink-0 mt-0.5">
                      ₺{(Number(item.unitPrice) * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}

                {order.customerNote && (
                  <div className="mt-2 pt-2 border-t border-gray-100 flex items-start gap-2">
                    <span className="text-base">📝</span>
                    <p className="text-xs text-amber-700 italic">{order.customerNote}</p>
                  </div>
                )}
              </div>

              {/* Aksiyon butonları */}
              {order.status !== "DELIVERED" && order.status !== "CANCELLED" && (
                <div className="px-4 pb-4 pt-1 flex gap-2">
                  {NEXT_STATUS[order.status] && (
                    <button
                      onClick={() => updateStatus(order.id, NEXT_STATUS[order.status]!)}
                      disabled={updatingId === order.id}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50 text-white shadow-md ${NEXT_BTN_COLORS[order.status]}`}
                    >
                      {updatingId === order.id ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Güncelleniyor...
                        </>
                      ) : (
                        <>
                          <span>{STATUS_ICONS[NEXT_STATUS[order.status]!]}</span>
                          {NEXT_LABELS[order.status]}
                        </>
                      )}
                    </button>
                  )}
                  <button
                    onClick={() => updateStatus(order.id, "CANCELLED")}
                    disabled={updatingId === order.id}
                    className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold border border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300 transition-all disabled:opacity-50"
                  >
                    ✕ İptal
                  </button>
                </div>
              )}

              {/* Teslim/iptal edilmiş sipariş alt bilgisi */}
              {(order.status === "DELIVERED" || order.status === "CANCELLED") && (
                <div className="px-4 pb-3 flex items-center gap-1.5">
                  <span className={`text-xs ${order.status === "DELIVERED" ? "text-emerald-600" : "text-red-400"}`}>
                    {order.status === "DELIVERED" ? "✅ Teslim edildi" : "✕ İptal edildi"}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
