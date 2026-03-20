"use client";

import { useEffect, useState, useRef, useCallback } from "react";

interface ItemModifier {
  id: number;
  name: string;
  price: number | string;
  isDefault: boolean;
}

interface ItemModifierGroup {
  id: number;
  name: string;
  type: string; // "single" | "multiple"
  required: boolean;
  modifiers: ItemModifier[];
}

interface MenuItem {
  id: number;
  name: string;
  description: string | null;
  price: number | string;
  imageUrl: string | null;
  calories: number | null;
  allergens: string | null;
  isPopular: boolean;
  isLiquid: boolean;
  effectIcon: string | null;
  effectColor: string | null;
  modifierGroups: ItemModifierGroup[];
}

interface Category {
  id: number;
  name: string;
  description: string | null;
  imageUrl: string | null;
  items: MenuItem[];
}

interface Restaurant {
  name: string;
  logoUrl: string | null;
  primaryColor: string | null;
  menuStyle: string | null;
  address: string | null;
  phone: string | null;
  currency: string;
}

interface Menu {
  id: number;
  name: string;
  restaurant: Restaurant;
  categories: Category[];
}

interface SelectedModifier {
  modifierId: number;
  name: string;
  price: number;
}

interface CartItem {
  cartKey: string; // menuItemId + sorted modifierIds
  menuItemId: number;
  name: string;
  basePrice: number;
  modifierPrice: number;
  quantity: number;
  imageUrl: string | null;
  selectedModifiers: SelectedModifier[];
}

interface Props {
  menu: Menu;
  restaurantId: number;
  tableNumber: string | null;
  qrId: string | null;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  TRY: "₺", USD: "$", EUR: "€", GBP: "£",
};

// ─── Liquid wave styles (injected once) ──────────────────────────────────────
const LIQUID_STYLES = `
@keyframes liquidFlow {
  0%   { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
@keyframes liquidBubble {
  0%   { transform: translateY(0) scale(1); opacity: 0.7; }
  50%  { opacity: 1; }
  100% { transform: translateY(-28px) scale(0.5); opacity: 0; }
}
.liquid-wave-track { animation: liquidFlow 3s linear infinite; }
.liquid-bubble-1   { animation: liquidBubble 2.2s ease-in infinite; }
.liquid-bubble-2   { animation: liquidBubble 2.8s ease-in 0.6s infinite; }
.liquid-bubble-3   { animation: liquidBubble 2.4s ease-in 1.3s infinite; }
`;

// ─── Liquid Wave Overlay ──────────────────────────────────────────────────────
function LiquidWave({ color, height = 28 }: { color: string; height?: number; icon?: string }) {
  const fill = color + "99"; // ~60% opacity
  const wavePath = "M0 14 Q12.5 4 25 14 Q37.5 24 50 14 Q62.5 4 75 14 Q87.5 24 100 14 L100 28 L0 28 Z";
  return (
    <div
      className="absolute bottom-0 left-0 right-0 overflow-hidden pointer-events-none select-none"
      style={{ height }}
    >
      {/* Bubbles */}
      <span className="liquid-bubble-1 absolute bottom-2 left-[20%] w-1.5 h-1.5 rounded-full" style={{ backgroundColor: fill }} />
      <span className="liquid-bubble-2 absolute bottom-1 left-[55%] w-1 h-1 rounded-full" style={{ backgroundColor: fill }} />
      <span className="liquid-bubble-3 absolute bottom-2 left-[75%] w-1.5 h-1.5 rounded-full" style={{ backgroundColor: fill }} />
      {/* Wave — double-wide so it loops seamlessly */}
      <div className="liquid-wave-track absolute bottom-0 left-0 flex" style={{ width: "200%" }}>
        <svg viewBox="0 0 100 28" style={{ width: "50%", height }} fill={fill} xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
          <path d={wavePath} />
        </svg>
        <svg viewBox="0 0 100 28" style={{ width: "50%", height }} fill={fill} xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
          <path d={wavePath} />
        </svg>
      </div>
    </div>
  );
}

// ─── Card layout (default) ───────────────────────────────────────────────────
function CardItem({
  item, primary, currencySymbol, onSelect, onAdd, cartQty, cartKey, onUpdateQty,
}: {
  item: MenuItem; primary: string; currencySymbol: string;
  onSelect: (i: MenuItem) => void; onAdd: (i: MenuItem) => void;
  cartQty: number; cartKey: string; onUpdateQty: (key: string, delta: number) => void;
}) {
  return (
    <div
      className="bg-white rounded-2xl overflow-hidden shadow-sm border hover:shadow-md transition-shadow lg:flex lg:flex-row"
      style={{ borderColor: item.isLiquid ? (item.effectColor ?? primary) + "55" : "#f3f4f6" }}
    >
      {item.imageUrl ? (
        <div className="relative w-full block lg:w-44 lg:flex-shrink-0">
          <button onClick={() => onSelect(item)} className="w-full block">
            <img src={item.imageUrl} alt={item.name} className="w-full h-44 object-cover lg:h-full lg:min-h-[140px]" />
          </button>
          {item.isLiquid && <LiquidWave color={item.effectColor ?? primary} height={36} />}
          {item.isLiquid && (
            <span className="absolute top-2 left-2 text-sm leading-none drop-shadow-sm">{item.effectIcon ?? "💧"}</span>
          )}
        </div>
      ) : item.isLiquid ? (
        <div className="relative w-full lg:w-44 lg:flex-shrink-0 h-28 lg:h-auto lg:min-h-[140px]" style={{ background: `linear-gradient(135deg, ${item.effectColor ?? primary}18 0%, ${item.effectColor ?? primary}08 100%)` }}>
          <div className="absolute inset-0 flex items-center justify-center text-4xl">{item.effectIcon ?? "💧"}</div>
          <LiquidWave color={item.effectColor ?? primary} height={32} />
        </div>
      ) : null}
      <div className="p-3.5 lg:flex lg:flex-col lg:justify-between lg:flex-1">
        <button onClick={() => onSelect(item)} className="w-full text-left">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-bold text-gray-900">{item.name}</span>
            {item.isPopular && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: primary }}>
                ⭐ Popüler
              </span>
            )}
          </div>
          {item.description && (
            <p className="text-xs text-gray-400 mt-1 line-clamp-2 lg:line-clamp-3 leading-relaxed">{item.description}</p>
          )}
          {item.calories && (
            <span className="text-xs text-gray-400 mt-1 hidden lg:block">{item.calories} kcal</span>
          )}
        </button>
        <div className="flex items-center justify-between mt-3">
          <div>
            <span className="text-base font-bold" style={{ color: primary }}>
              {currencySymbol}{Number(item.price).toFixed(2)}
            </span>
            {item.calories && (
              <span className="ml-2 text-xs text-gray-400 lg:hidden">{item.calories} kcal</span>
            )}
          </div>
          {cartQty === 0 ? (
            <button
              onClick={() => onAdd(item)}
              className="w-9 h-9 rounded-xl text-white flex items-center justify-center font-bold text-xl shadow-sm transition-opacity active:opacity-70"
              style={{ backgroundColor: primary }}
            >+</button>
          ) : (
            <div className="flex items-center gap-1.5 rounded-xl p-1" style={{ backgroundColor: primary + "18" }}>
              <button onClick={() => onUpdateQty(cartKey, -1)} className="w-7 h-7 rounded-lg bg-white shadow-sm flex items-center justify-center font-bold text-gray-700">−</button>
              <span className="text-sm font-bold w-5 text-center" style={{ color: primary }}>{cartQty}</span>
              <button onClick={() => onAdd(item)} className="w-7 h-7 rounded-lg text-white flex items-center justify-center font-bold shadow-sm" style={{ backgroundColor: primary }}>+</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Grid layout (2 columns) ──────────────────────────────────────────────────
function GridItem({
  item, primary, currencySymbol, onSelect, onAdd, cartQty, cartKey, onUpdateQty,
}: {
  item: MenuItem; primary: string; currencySymbol: string;
  onSelect: (i: MenuItem) => void; onAdd: (i: MenuItem) => void;
  cartQty: number; cartKey: string; onUpdateQty: (key: string, delta: number) => void;
}) {
  return (
    <div
      className="bg-white rounded-2xl overflow-hidden border shadow-sm hover:shadow-md transition-shadow"
      style={{ borderColor: item.isLiquid ? (item.effectColor ?? primary) + "55" : "#f3f4f6" }}
    >
      <div className="relative w-full block">
        <button onClick={() => onSelect(item)} className="w-full block">
          {item.imageUrl ? (
            <img src={item.imageUrl} alt={item.name} className="w-full h-36 object-cover" />
          ) : item.isLiquid ? (
            <div className="w-full h-36 flex items-center justify-center text-4xl" style={{ background: `linear-gradient(135deg, ${item.effectColor ?? primary}18 0%, ${item.effectColor ?? primary}08 100%)` }}>{item.effectIcon ?? "💧"}</div>
          ) : (
            <div className="w-full h-36 bg-gray-50 flex items-center justify-center text-4xl">🍽️</div>
          )}
        </button>
        {item.isLiquid && <LiquidWave color={item.effectColor ?? primary} height={28} />}
        {item.isLiquid && (
          <span className="absolute top-1.5 left-1.5 text-sm leading-none drop-shadow-sm">{item.effectIcon ?? "💧"}</span>
        )}
      </div>
      <div className="p-2.5">
        <button onClick={() => onSelect(item)} className="w-full text-left">
          <p className="text-xs font-bold text-gray-900 line-clamp-1">{item.name}</p>
          {item.isPopular && (
            <span className="text-xs font-medium" style={{ color: primary }}>⭐ Popüler</span>
          )}
        </button>
        <div className="flex items-center justify-between mt-2">
          <span className="text-sm font-bold" style={{ color: primary }}>
            {currencySymbol}{Number(item.price).toFixed(2)}
          </span>
          {cartQty === 0 ? (
            <button onClick={() => onAdd(item)} className="w-7 h-7 rounded-lg text-white flex items-center justify-center font-bold text-base" style={{ backgroundColor: primary }}>+</button>
          ) : (
            <div className="flex items-center gap-0.5">
              <button onClick={() => onUpdateQty(cartKey, -1)} className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center font-bold text-gray-600 text-sm">−</button>
              <span className="text-xs font-bold w-5 text-center" style={{ color: primary }}>{cartQty}</span>
              <button onClick={() => onAdd(item)} className="w-6 h-6 rounded-lg text-white flex items-center justify-center font-bold text-sm" style={{ backgroundColor: primary }}>+</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── List layout (compact) ────────────────────────────────────────────────────
function ListItem({
  item, primary, currencySymbol, onSelect, onAdd, cartQty, cartKey, onUpdateQty,
}: {
  item: MenuItem; primary: string; currencySymbol: string;
  onSelect: (i: MenuItem) => void; onAdd: (i: MenuItem) => void;
  cartQty: number; cartKey: string; onUpdateQty: (key: string, delta: number) => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors lg:py-4">
      <button onClick={() => onSelect(item)} className="flex-1 flex items-center gap-3 text-left min-w-0">
        {item.imageUrl ? (
          <div className="relative flex-shrink-0 w-14 h-14 lg:w-20 lg:h-20 rounded-xl lg:rounded-2xl overflow-hidden">
            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
            {item.isLiquid && <LiquidWave color={item.effectColor ?? primary} height={18} />}
          </div>
        ) : item.isLiquid ? (
          <div className="relative flex-shrink-0 w-14 h-14 lg:w-20 lg:h-20 rounded-xl lg:rounded-2xl overflow-hidden" style={{ background: `linear-gradient(135deg, ${item.effectColor ?? primary}18 0%, ${item.effectColor ?? primary}08 100%)` }}>
            <div className="w-full h-full flex items-center justify-center text-2xl">{item.effectIcon ?? "💧"}</div>
            <LiquidWave color={item.effectColor ?? primary} height={18} />
          </div>
        ) : (
          <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0 text-2xl lg:w-20 lg:h-20 lg:rounded-2xl">🍽️</div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-semibold text-gray-900 truncate lg:text-base">{item.name}</span>
            {item.isPopular && <span className="text-xs" style={{ color: primary }}>⭐</span>}
            {item.isLiquid && <span className="text-xs">{item.effectIcon ?? "💧"}</span>}
          </div>
          {item.description && (
            <p className="text-xs text-gray-400 truncate lg:whitespace-normal lg:line-clamp-2 mt-0.5">{item.description}</p>
          )}
          <div className="flex items-center gap-3 mt-1">
            <span className="text-sm font-bold" style={{ color: primary }}>
              {currencySymbol}{Number(item.price).toFixed(2)}
            </span>
            {item.calories && (
              <span className="text-xs text-gray-400 hidden lg:inline">{item.calories} kcal</span>
            )}
          </div>
        </div>
      </button>
      <div className="flex-shrink-0">
        {cartQty === 0 ? (
          <button onClick={() => onAdd(item)} className="w-9 h-9 rounded-xl text-white flex items-center justify-center font-bold text-xl" style={{ backgroundColor: primary }}>+</button>
        ) : (
          <div className="flex items-center gap-1 p-0.5 rounded-xl" style={{ backgroundColor: primary + "18" }}>
            <button onClick={() => onUpdateQty(cartKey, -1)} className="w-7 h-7 rounded-lg bg-white shadow-sm flex items-center justify-center font-bold text-gray-700 text-base">−</button>
            <span className="text-sm font-bold w-5 text-center" style={{ color: primary }}>{cartQty}</span>
            <button onClick={() => onAdd(item)} className="w-7 h-7 rounded-lg text-white flex items-center justify-center font-bold text-base" style={{ backgroundColor: primary }}>+</button>
          </div>
        )}
      </div>
    </div>
  );
}

interface CustomerInfo {
  id: number;
  phone: string;
  name: string | null;
  points: number;
  segment?: string;
  orderCount?: number;
}

// ─── Main component ───────────────────────────────────────────────────────────
export function PublicMenuClient({ menu, restaurantId, tableNumber, qrId }: Props) {
  const [activeCat, setActiveCat] = useState<number | null>(menu.categories[0]?.id ?? null);
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  // Seçilen modifierlar (item detail modalında)
  const [selectedMods, setSelectedMods] = useState<Record<number, number[]>>({}); // groupId → modifierIds
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [orderNote, setOrderNote] = useState("");
  const [ordering, setOrdering] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<{ orderId: number } | null>(null);
  const catRefs = useRef<Record<number, HTMLElement | null>>({});

  // Müşteri sadakat sistemi
  const [customer, setCustomer] = useState<CustomerInfo | null>(null);
  const [authModal, setAuthModal] = useState<"login" | "register" | null>(null);
  const [authPhone, setAuthPhone] = useState("");
  const [authName, setAuthName] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  const fetchCustomer = useCallback(async () => {
    try {
      const res = await fetch("/api/public/customers/me");
      const json = await res.json();
      if (json.success) setCustomer(json.data);
    } catch { /* oturum yok */ }
  }, []);

  useEffect(() => { fetchCustomer(); }, [fetchCustomer]);

  const primary = menu.restaurant.primaryColor ?? "#2563eb";
  const menuStyle = menu.restaurant.menuStyle ?? "card";
  const currencySymbol = CURRENCY_SYMBOLS[menu.restaurant.currency] ?? "₺";

  // QR tarama sayacı
  useEffect(() => {
    if (!qrId) return;
    fetch(`/api/qr-codes/${qrId}/scan`, { method: "POST" }).catch(() => {});
  }, [qrId]);

  // Scroll → aktif kategori
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const id = parseInt((e.target as HTMLElement).dataset.catId ?? "0", 10);
            if (id) setActiveCat(id);
          }
        });
      },
      { threshold: 0.25, rootMargin: "-56px 0px -55% 0px" }
    );
    Object.values(catRefs.current).forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [menu.categories]);

  function scrollTo(catId: number) {
    setActiveCat(catId);
    catRefs.current[catId]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // item açıldığında default modifier seçimlerini hazırla
  function openItem(item: MenuItem) {
    const defaults: Record<number, number[]> = {};
    for (const g of item.modifierGroups) {
      const defaultMods = g.modifiers.filter((m) => m.isDefault).map((m) => m.id);
      if (defaultMods.length > 0) defaults[g.id] = defaultMods;
    }
    setSelectedMods(defaults);
    setSelectedItem(item);
  }

  function toggleMod(group: ItemModifierGroup, modId: number) {
    setSelectedMods((prev) => {
      const current = prev[group.id] ?? [];
      if (group.type === "single") {
        return { ...prev, [group.id]: [modId] };
      }
      // multiple
      if (current.includes(modId)) {
        return { ...prev, [group.id]: current.filter((id) => id !== modId) };
      }
      return { ...prev, [group.id]: [...current, modId] };
    });
  }

  function buildCartEntry(item: MenuItem, mods: Record<number, number[]>): CartItem {
    const allModifiers = item.modifierGroups.flatMap((g) =>
      g.modifiers.filter((m) => (mods[g.id] ?? []).includes(m.id))
    );
    const selectedModifiers: SelectedModifier[] = allModifiers.map((m) => ({
      modifierId: m.id, name: m.name, price: Number(m.price),
    }));
    const modifierPrice = selectedModifiers.reduce((s, m) => s + m.price, 0);
    const cartKey = `${item.id}_${selectedModifiers.map((m) => m.modifierId).sort().join("-")}`;
    return {
      cartKey, menuItemId: item.id, name: item.name,
      basePrice: Number(item.price), modifierPrice, quantity: 1,
      imageUrl: item.imageUrl, selectedModifiers,
    };
  }

  function addToCart(item: MenuItem, mods?: Record<number, number[]>) {
    const entry = buildCartEntry(item, mods ?? {});
    setCart((prev) => {
      const existing = prev.find((c) => c.cartKey === entry.cartKey);
      if (existing) return prev.map((c) => c.cartKey === entry.cartKey ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, entry];
    });
  }

  function updateQty(cartKey: string, delta: number) {
    setCart((prev) =>
      prev.map((c) => c.cartKey === cartKey ? { ...c, quantity: c.quantity + delta } : c)
        .filter((c) => c.quantity > 0)
    );
  }

  async function handleAuthSubmit(mode: "login" | "register") {
    if (!authPhone || !authPassword) { setAuthError("Telefon ve şifre zorunludur."); return; }
    setAuthLoading(true);
    setAuthError("");
    try {
      const res = await fetch(`/api/public/customers/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId, phone: authPhone, name: authName.trim() || undefined, password: authPassword }),
      });
      const json = await res.json();
      if (json.success) {
        setCustomer(json.data);
        setAuthModal(null);
        setAuthPhone(""); setAuthName(""); setAuthPassword("");
      } else {
        setAuthError(json.error ?? "Bir hata oluştu.");
      }
    } catch {
      setAuthError("Bağlantı hatası.");
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/public/customers/logout", { method: "POST" });
    setCustomer(null);
  }

  const cartCount = cart.reduce((s, c) => s + c.quantity, 0);
  const cartTotal = cart.reduce((s, c) => s + (c.basePrice + c.modifierPrice) * c.quantity, 0);

  async function placeOrder() {
    if (cart.length === 0) return;
    setOrdering(true);
    try {
      const res = await fetch("/api/public/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId,
          tableNumber,
          customerNote: orderNote.trim() || null,
          items: cart.map((c) => ({
            menuItemId: c.menuItemId,
            quantity: c.quantity,
            unitPrice: c.basePrice,
            selectedModifiers: c.selectedModifiers,
          })),
        }),
      });
      const json = await res.json();
      if (json.success) {
        setOrderSuccess({ orderId: json.data.order.id });
        setCart([]);
        setCartOpen(false);
        setOrderNote("");
      } else {
        alert("Sipariş gönderilemedi: " + json.error);
      }
    } finally {
      setOrdering(false);
    }
  }

  const filtered = search.trim()
    ? menu.categories
        .map((c) => ({
          ...c,
          items: c.items.filter(
            (i) =>
              i.name.toLowerCase().includes(search.toLowerCase()) ||
              i.description?.toLowerCase().includes(search.toLowerCase())
          ),
        }))
        .filter((c) => c.items.length > 0)
    : menu.categories;

  const itemProps = (item: MenuItem) => {
    const cartEntry = cart.find((c) => c.menuItemId === item.id);
    return {
      item,
      primary,
      currencySymbol,
      onSelect: openItem,
      onAdd: (i: MenuItem) => {
        if (i.modifierGroups.length > 0) { openItem(i); return; }
        addToCart(i, {});
      },
      cartQty: cartEntry?.quantity ?? 0,
      cartKey: cartEntry?.cartKey ?? "",
      onUpdateQty: updateQty,
    };
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <style>{LIQUID_STYLES}</style>
      {/* ── Header ── */}
      <header className="sticky top-0 z-30 text-white shadow-md" style={{ backgroundColor: primary }}>
        <div className="max-w-6xl mx-auto px-4 pt-3 pb-2 flex items-center gap-3">
          {menu.restaurant.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={menu.restaurant.logoUrl}
              alt={menu.restaurant.name}
              className="w-10 h-10 rounded-full object-cover ring-2 ring-white/30 flex-shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-white/20 ring-2 ring-white/30 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
              {menu.restaurant.name[0]}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="font-bold text-sm leading-tight truncate">{menu.restaurant.name}</p>
            <p className="text-xs text-white/70 truncate">{menu.name}</p>
          </div>
          {tableNumber && (
            <span className="flex-shrink-0 bg-white/25 text-white text-xs font-semibold px-3 py-1.5 rounded-full border border-white/20">
              Masa {tableNumber}
            </span>
          )}
          {/* Müşteri giriş / profil butonu */}
          {customer ? (
            <button
              onClick={handleLogout}
              className="flex-shrink-0 flex items-center gap-1.5 bg-white/15 hover:bg-white/25 transition-colors px-2.5 py-1.5 rounded-xl"
              title="Çıkış yap"
            >
              <span className="text-white text-xs font-semibold hidden sm:block max-w-[80px] truncate">
                {customer.name ?? customer.phone}
              </span>
              <span className="text-white text-xs font-bold bg-white/20 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">
                {customer.points}
              </span>
            </button>
          ) : (
            <button
              onClick={() => { setAuthModal("login"); setAuthError(""); }}
              className="flex-shrink-0 bg-white/15 hover:bg-white/25 transition-colors text-white text-xs font-semibold px-3 py-1.5 rounded-xl"
            >
              Giriş
            </button>
          )}
          {/* Sepet ikonu */}
          <button
            onClick={() => setCartOpen(true)}
            className="relative flex-shrink-0 p-2 rounded-xl bg-white/15 hover:bg-white/25 transition-colors"
            aria-label="Sepeti aç"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-white text-xs font-bold rounded-full flex items-center justify-center px-1"
                style={{ color: primary }}>
                {cartCount}
              </span>
            )}
          </button>
        </div>

        {/* Arama */}
        <div className="max-w-6xl mx-auto px-4 pb-2">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ürün ara..."
              className="w-full bg-white/15 text-white placeholder-white/60 text-sm pl-9 pr-4 py-2 rounded-xl focus:outline-none focus:bg-white/25 transition-colors"
            />
          </div>
        </div>

        {/* Kategori sekmeleri — sadece mobil */}
        {!search && (
          <div className="lg:hidden max-w-6xl mx-auto overflow-x-auto pb-2.5 px-4 flex gap-2 scrollbar-hide">
            {menu.categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => scrollTo(cat.id)}
                className={`flex-shrink-0 text-xs font-semibold px-3.5 py-1.5 rounded-full transition-colors ${
                  activeCat === cat.id ? "bg-white text-gray-900" : "bg-white/20 text-white hover:bg-white/30"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* ── İçerik ── */}
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="lg:flex lg:gap-8 lg:items-start">

          {/* Desktop kategori sidebar */}
          {!search && (
            <aside className="hidden lg:block w-52 flex-shrink-0 sticky top-28 self-start">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-2">Kategoriler</p>
                <nav className="space-y-0.5">
                  {menu.categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => scrollTo(cat.id)}
                      className="w-full text-left text-sm px-3 py-2 rounded-xl font-medium transition-colors"
                      style={activeCat === cat.id
                        ? { backgroundColor: primary, color: "#fff" }
                        : { color: "#4b5563" }}
                    >
                      {cat.name}
                    </button>
                  ))}
                </nav>
              </div>
            </aside>
          )}

          {/* Ana içerik */}
          <main className="flex-1 min-w-0 pb-32 space-y-7">
            {filtered.length === 0 ? (
              <div className="text-center py-16 text-gray-400 text-sm">Sonuç bulunamadı.</div>
            ) : (
              filtered.map((cat) => (
                <section
                  key={cat.id}
                  ref={(el) => { catRefs.current[cat.id] = el; }}
                  data-cat-id={cat.id}
                >
                  {/* Kategori başlığı */}
                  <div className="flex items-center gap-3 mb-4">
                    {cat.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cat.imageUrl} alt={cat.name} className="w-9 h-9 rounded-xl object-cover flex-shrink-0" />
                    )}
                    <div>
                      <h2 className="text-base font-bold text-gray-900">{cat.name}</h2>
                      {cat.description && <p className="text-xs text-gray-400 mt-0.5">{cat.description}</p>}
                    </div>
                  </div>

                  {/* Ürünler — layout'a göre */}
                  {menuStyle === "grid" ? (
                    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                      {cat.items.map((item) => <GridItem key={item.id} {...itemProps(item)} />)}
                    </div>
                  ) : menuStyle === "list" ? (
                    <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50 overflow-hidden shadow-sm">
                      {cat.items.map((item) => <ListItem key={item.id} {...itemProps(item)} />)}
                    </div>
                  ) : (
                    /* card (default) */
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                      {cat.items.map((item) => <CardItem key={item.id} {...itemProps(item)} />)}
                    </div>
                  )}
                </section>
              ))
            )}

            <footer className="text-center text-xs text-gray-300 py-4 space-y-1">
              {menu.restaurant.phone && (
                <p>
                  <a href={`tel:${menu.restaurant.phone}`} className="hover:text-gray-400">{menu.restaurant.phone}</a>
                </p>
              )}
              {menu.restaurant.address && <p>{menu.restaurant.address}</p>}
              <p className="mt-3 text-gray-200/40">Dijital Menü</p>
            </footer>
          </main>

        </div>
      </div>

      {/* ── Sepet butonu (floating) ── */}
      {cartCount > 0 && !cartOpen && (
        <div className="fixed bottom-6 left-0 right-0 z-40 flex justify-center px-4 pointer-events-none">
          <button
            onClick={() => setCartOpen(true)}
            className="pointer-events-auto flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-white font-semibold text-sm transition-all active:scale-95 max-w-sm w-full justify-between"
            style={{ backgroundColor: primary }}
          >
            <span className="bg-white/25 rounded-full w-7 h-7 flex items-center justify-center text-xs font-bold flex-shrink-0">
              {cartCount}
            </span>
            <span>Sepeti Görüntüle</span>
            <span className="font-bold flex-shrink-0">{currencySymbol}{cartTotal.toFixed(2)}</span>
          </button>
        </div>
      )}

      {/* ── Ürün detay modal ── */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setSelectedItem(null)}>
          <div className="absolute inset-0 bg-black/50" />
          <div
            className="relative bg-white rounded-xl w-full max-w-2xl max-h-[88vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {selectedItem.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={selectedItem.imageUrl} alt={selectedItem.name} className="w-full h-56 object-cover" />
            ) : (
              <div className="pt-4 flex justify-center">
                <div className="w-10 h-1 bg-gray-200 rounded-full" />
              </div>
            )}
            <div className="px-5 py-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-xl font-bold text-gray-900">{selectedItem.name}</h3>
                <span className="text-xl font-bold flex-shrink-0" style={{ color: primary }}>
                  {currencySymbol}{Number(selectedItem.price).toFixed(2)}
                </span>
              </div>
              {selectedItem.isPopular && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full text-white" style={{ backgroundColor: primary }}>
                  ⭐ Popüler
                </span>
              )}
              {selectedItem.description && (
                <p className="text-sm text-gray-500 leading-relaxed">{selectedItem.description}</p>
              )}
              <div className="flex flex-wrap gap-3 text-xs text-gray-400">
                {selectedItem.calories && <span>🔥 {selectedItem.calories} kcal</span>}
                {selectedItem.allergens && <span>⚠️ Alerjenler: {selectedItem.allergens}</span>}
              </div>

              {/* Modifier grupları */}
              {selectedItem.modifierGroups.length > 0 && (
                <div className="space-y-5 pt-1">
                  {selectedItem.modifierGroups.map((group) => {
                    const isSingle = group.type === "single";
                    const selectedIds = selectedMods[group.id] ?? [];
                    return (
                      <div key={group.id}>
                        <div className="flex items-center gap-2 mb-2.5">
                          <span className="text-sm font-bold text-gray-900">{group.name}</span>
                          {group.required && (
                            <span className="text-xs bg-red-50 text-red-500 px-2 py-0.5 rounded-full font-semibold">Zorunlu</span>
                          )}
                          <span className="text-xs text-gray-400 ml-auto">
                            {isSingle ? "Birini seç" : "Birden fazla seçebilirsin"}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {group.modifiers.map((mod) => {
                            const isSelected = selectedIds.includes(mod.id);
                            return (
                              <button
                                key={mod.id}
                                type="button"
                                onClick={(e) => { e.stopPropagation(); toggleMod(group, mod.id); }}
                                className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl border-2 text-left transition-all active:scale-[0.98]"
                                style={{
                                  borderColor: isSelected ? primary : "#e5e7eb",
                                  backgroundColor: isSelected ? primary + "10" : "#f9fafb",
                                }}
                              >
                                {/* Seçim göstergesi — radio (tek) veya checkbox (çoklu) */}
                                <span
                                  className="flex-shrink-0 flex items-center justify-center transition-all"
                                  style={{
                                    width: 22, height: 22,
                                    borderRadius: isSingle ? "50%" : 6,
                                    border: `2.5px solid ${isSelected ? primary : "#d1d5db"}`,
                                    backgroundColor: isSelected ? primary : "white",
                                  }}
                                >
                                  {isSelected && (
                                    <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                                      <path d="M1 5L4.5 8.5L11 1.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                  )}
                                </span>
                                <span className="flex-1 text-sm font-medium text-gray-800 leading-tight">{mod.name}</span>
                                {Number(mod.price) > 0 && (
                                  <span className="text-sm font-bold flex-shrink-0" style={{ color: primary }}>
                                    +{currencySymbol}{Number(mod.price).toFixed(2)}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Fiyat özeti */}
              {selectedItem.modifierGroups.length > 0 && (() => {
                const modTotal = selectedItem.modifierGroups.flatMap(g =>
                  g.modifiers.filter(m => (selectedMods[g.id] ?? []).includes(m.id))
                ).reduce((s, m) => s + Number(m.price), 0);
                const total = Number(selectedItem.price) + modTotal;
                return (
                  <div className="flex items-center justify-between py-2 border-t border-gray-100">
                    <span className="text-sm text-gray-500">Toplam</span>
                    <span className="text-base font-bold" style={{ color: primary }}>
                      {currencySymbol}{total.toFixed(2)}
                    </span>
                  </div>
                );
              })()}

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setSelectedItem(null)}
                  className="flex-1 py-3.5 rounded-2xl text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  Kapat
                </button>
                <button
                  onClick={() => {
                    // Zorunlu grup kontrolü
                    const missing = selectedItem.modifierGroups.find(
                      (g) => g.required && (selectedMods[g.id] ?? []).length === 0
                    );
                    if (missing) { alert(`"${missing.name}" zorunlu, lütfen seçin.`); return; }
                    addToCart(selectedItem, selectedMods);
                    setSelectedItem(null);
                  }}
                  className="flex-1 py-3.5 rounded-2xl text-sm font-semibold text-white transition-colors active:opacity-80"
                  style={{ backgroundColor: primary }}
                >
                  + Sepete Ekle
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Sepet drawer ── */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center lg:items-stretch lg:justify-end" onClick={() => setCartOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div
            className="relative bg-white rounded-t-3xl w-full max-w-2xl max-h-[88vh] flex flex-col lg:rounded-none lg:rounded-l-3xl lg:w-[420px] lg:max-w-[420px] lg:max-h-full lg:h-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle — sadece mobil */}
            <div className="pt-3 pb-1 flex justify-center flex-shrink-0 lg:hidden">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 flex-shrink-0">
              <div>
                <h3 className="font-bold text-gray-900 text-lg">Siparişim</h3>
                {tableNumber && <p className="text-xs text-gray-400 mt-0.5">Masa {tableNumber}</p>}
              </div>
              <button onClick={() => setCartOpen(false)} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {cart.map((c) => (
                <div key={c.cartKey} className="flex items-start gap-3">
                  {c.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.imageUrl} alt={c.name} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{c.name}</p>
                    {c.selectedModifiers.length > 0 && (
                      <p className="text-xs text-gray-400 truncate mt-0.5">
                        {c.selectedModifiers.map((m) => m.name).join(", ")}
                      </p>
                    )}
                    <p className="text-sm font-bold mt-0.5" style={{ color: primary }}>
                      {currencySymbol}{((c.basePrice + c.modifierPrice) * c.quantity).toFixed(2)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 p-1 rounded-xl flex-shrink-0" style={{ backgroundColor: primary + "15" }}>
                    <button onClick={() => updateQty(c.cartKey, -1)} className="w-7 h-7 rounded-lg bg-white shadow-sm flex items-center justify-center font-bold text-gray-700">−</button>
                    <span className="text-sm font-bold w-5 text-center" style={{ color: primary }}>{c.quantity}</span>
                    <button onClick={() => updateQty(c.cartKey, 1)} className="w-7 h-7 rounded-lg text-white shadow-sm flex items-center justify-center font-bold" style={{ backgroundColor: primary }}>+</button>
                  </div>
                </div>
              ))}

              {/* Not */}
              <div className="pt-2">
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  Sipariş notu (opsiyonel)
                </label>
                <textarea
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                  placeholder="Özel istekleriniz, alerji bilgisi..."
                  rows={2}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-gray-300 resize-none placeholder-gray-400"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-gray-100 space-y-3 flex-shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  Toplam ({cartCount} ürün)
                </span>
                <span className="text-xl font-bold text-gray-900">{currencySymbol}{cartTotal.toFixed(2)}</span>
              </div>
              <button
                onClick={placeOrder}
                disabled={ordering}
                className="w-full py-4 rounded-2xl text-white font-bold text-base transition-opacity disabled:opacity-60 active:opacity-80"
                style={{ backgroundColor: primary }}
              >
                {ordering ? "Gönderiliyor..." : "Sipariş Ver"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Müşteri giriş / kayıt modal ── */}
      {authModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={() => setAuthModal(null)}>
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 space-y-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {/* Tab */}
            <div className="flex rounded-xl overflow-hidden border border-gray-200">
              <button
                onClick={() => { setAuthModal("login"); setAuthError(""); }}
                className="flex-1 py-2.5 text-sm font-semibold transition-colors"
                style={authModal === "login" ? { backgroundColor: primary, color: "#fff" } : { color: "#6b7280" }}
              >Giriş Yap</button>
              <button
                onClick={() => { setAuthModal("register"); setAuthError(""); }}
                className="flex-1 py-2.5 text-sm font-semibold transition-colors"
                style={authModal === "register" ? { backgroundColor: primary, color: "#fff" } : { color: "#6b7280" }}
              >Kayıt Ol</button>
            </div>

            <div className="space-y-3">
              {authModal === "register" && (
                <input
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                  placeholder="Adınız (opsiyonel)"
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-3 text-sm focus:outline-none focus:border-gray-400"
                />
              )}
              <input
                value={authPhone}
                onChange={(e) => setAuthPhone(e.target.value)}
                placeholder="Telefon numarası"
                type="tel"
                className="w-full border border-gray-200 rounded-xl px-3.5 py-3 text-sm focus:outline-none focus:border-gray-400"
              />
              <input
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder="Şifre"
                type="password"
                className="w-full border border-gray-200 rounded-xl px-3.5 py-3 text-sm focus:outline-none focus:border-gray-400"
              />
            </div>

            {authError && (
              <p className="text-xs text-red-500 text-center">{authError}</p>
            )}

            <button
              onClick={() => handleAuthSubmit(authModal)}
              disabled={authLoading}
              className="w-full py-3.5 rounded-2xl text-white font-bold text-sm transition-opacity disabled:opacity-60"
              style={{ backgroundColor: primary }}
            >
              {authLoading ? "Lütfen bekleyin..." : authModal === "login" ? "Giriş Yap" : "Kayıt Ol"}
            </button>

            <p className="text-center text-xs text-gray-400">
              Giriş yaparak puan kazanın, kampanyalardan yararlanın.
            </p>
          </div>
        </div>
      )}

      {/* ── Sipariş başarılı ── */}
      {orderSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-8 text-center space-y-4 shadow-2xl">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto text-3xl"
              style={{ backgroundColor: primary + "20" }}
            >
              🎉
            </div>
            <h3 className="text-xl font-bold text-gray-900">Sipariş Alındı!</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              #{orderSuccess.orderId} numaralı siparişiniz alındı.
              {tableNumber ? ` Masa ${tableNumber} için` : ""} en kısa sürede hazırlanacak.
            </p>
            <button
              onClick={() => setOrderSuccess(null)}
              className="w-full py-3.5 rounded-2xl text-white font-semibold transition-opacity active:opacity-80"
              style={{ backgroundColor: primary }}
            >
              Tamam
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
