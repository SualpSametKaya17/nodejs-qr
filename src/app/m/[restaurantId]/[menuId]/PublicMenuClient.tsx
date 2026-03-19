"use client";

import { useEffect, useState, useRef } from "react";

interface MenuItem {
  id: number;
  name: string;
  description: string | null;
  price: number | string;
  imageUrl: string | null;
  calories: number | null;
  allergens: string | null;
  isPopular: boolean;
}

interface Category {
  id: number;
  name: string;
  description: string | null;
  items: MenuItem[];
}

interface Restaurant {
  name: string;
  logoUrl: string | null;
  primaryColor: string | null;
  address: string | null;
  phone: string | null;
}

interface Menu {
  id: number;
  name: string;
  restaurant: Restaurant;
  categories: Category[];
}

interface Props {
  menu: Menu;
  tableNumber: string | null;
  qrId: string | null;
}

export function PublicMenuClient({ menu, tableNumber, qrId }: Props) {
  const [activeCat, setActiveCat] = useState<number | null>(
    menu.categories[0]?.id ?? null
  );
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const catRefs = useRef<Record<number, HTMLElement | null>>({});
  const primary = menu.restaurant.primaryColor ?? "#2563eb";

  // QR tarama sayacını artır (bir kere)
  useEffect(() => {
    if (!qrId) return;
    fetch(`/api/qr-codes/${qrId}/scan`, { method: "POST" }).catch(() => {});
  }, [qrId]);

  // Sayfa scroll → aktif kategoriyi güncelle
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
      { threshold: 0.3, rootMargin: "-60px 0px -60% 0px" }
    );
    Object.values(catRefs.current).forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [menu.categories]);

  function scrollTo(catId: number) {
    setActiveCat(catId);
    catRefs.current[catId]?.scrollIntoView({ behavior: "smooth", block: "start" });
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header
        className="sticky top-0 z-30 text-white shadow-sm"
        style={{ backgroundColor: primary }}
      >
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          {menu.restaurant.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={menu.restaurant.logoUrl}
              alt={menu.restaurant.name}
              className="w-9 h-9 rounded-full object-cover bg-white/20 flex-shrink-0"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
              {menu.restaurant.name[0]}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm leading-tight truncate">{menu.restaurant.name}</p>
            <p className="text-xs text-white/70 truncate">{menu.name}</p>
          </div>
          {tableNumber && (
            <span className="flex-shrink-0 bg-white/20 text-white text-xs font-medium px-2.5 py-1 rounded-full">
              Masa {tableNumber}
            </span>
          )}
        </div>

        {/* Arama */}
        <div className="max-w-2xl mx-auto px-4 pb-3">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ürün ara..."
              className="w-full bg-white/15 text-white placeholder-white/60 text-sm pl-9 pr-4 py-2 rounded-xl focus:outline-none focus:bg-white/25 transition-colors"
            />
          </div>
        </div>

        {/* Kategori sekmeler */}
        {!search && (
          <div className="max-w-2xl mx-auto overflow-x-auto pb-2 px-4 flex gap-2 scrollbar-hide">
            {menu.categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => scrollTo(cat.id)}
                className={`flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                  activeCat === cat.id
                    ? "bg-white text-gray-900"
                    : "bg-white/20 text-white hover:bg-white/30"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* İçerik */}
      <main className="max-w-2xl mx-auto px-4 py-4 space-y-6">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">
            Sonuç bulunamadı.
          </div>
        ) : (
          filtered.map((cat) => (
            <section
              key={cat.id}
              ref={(el) => { catRefs.current[cat.id] = el; }}
              data-cat-id={cat.id}
            >
              <div className="mb-3">
                <h2 className="text-base font-bold text-gray-900">{cat.name}</h2>
                {cat.description && (
                  <p className="text-xs text-gray-400 mt-0.5">{cat.description}</p>
                )}
              </div>
              <div className="space-y-2">
                {cat.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className="w-full bg-white border border-gray-100 rounded-xl p-3 flex gap-3 items-start text-left hover:border-gray-200 hover:shadow-sm transition-all active:scale-[0.99]"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-semibold text-gray-900">{item.name}</span>
                        {item.isPopular && (
                          <span
                            className="text-xs font-medium px-1.5 py-0.5 rounded text-white"
                            style={{ backgroundColor: primary }}
                          >
                            Popüler
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{item.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-sm font-bold text-gray-900">
                          ₺{Number(item.price).toFixed(2)}
                        </span>
                        {item.calories && (
                          <span className="text-xs text-gray-400">{item.calories} kcal</span>
                        )}
                      </div>
                    </div>
                    {item.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                      />
                    )}
                  </button>
                ))}
              </div>
            </section>
          ))
        )}

        {/* Alt bilgi */}
        <footer className="text-center text-xs text-gray-300 py-6 space-y-1">
          {menu.restaurant.phone && (
            <p>
              <a href={`tel:${menu.restaurant.phone}`} className="hover:text-gray-400">
                {menu.restaurant.phone}
              </a>
            </p>
          )}
          {menu.restaurant.address && <p>{menu.restaurant.address}</p>}
          <p className="mt-3 text-gray-200/40">Dijital Menü</p>
        </footer>
      </main>

      {/* Ürün detay modalı */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          onClick={() => setSelectedItem(null)}
        >
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative bg-white rounded-t-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {selectedItem.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={selectedItem.imageUrl}
                alt={selectedItem.name}
                className="w-full h-48 object-cover"
              />
            )}
            <div className="px-5 py-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-lg font-bold text-gray-900">{selectedItem.name}</h3>
                <span className="text-lg font-bold text-gray-900 flex-shrink-0">
                  ₺{Number(selectedItem.price).toFixed(2)}
                </span>
              </div>
              {selectedItem.description && (
                <p className="text-sm text-gray-500">{selectedItem.description}</p>
              )}
              <div className="flex flex-wrap gap-3 text-xs text-gray-400">
                {selectedItem.calories && <span>{selectedItem.calories} kcal</span>}
                {selectedItem.allergens && (
                  <span>Alerjenler: {selectedItem.allergens}</span>
                )}
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="w-full py-3 rounded-xl text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors mt-2"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
