"use client";

import { useState, useCallback, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { ItemForm } from "@/components/menu/ItemForm";
import { ModifiersModal } from "@/components/menu/ModifiersModal";

const ITEMS_PER_PAGE = 10;

interface Item {
  id: number;
  name: string;
  description: string | null;
  price: number | string;
  imageUrl: string | null;
  calories: number | null;
  allergens: string | null;
  isPopular: boolean;
  isActive: boolean;
  category: { id: number; name: string };
}

interface Category {
  id: number;
  name: string;
}

interface Menu {
  id: number;
  name: string;
  isDefault: boolean;
  isActive: boolean;
}

interface Props {
  menus: Menu[];
  categories: Category[];
  initialItems: unknown[];
  defaultMenuId: number | null;
  defaultCategoryId: number | null;
}

type ModalState =
  | { type: "addItem"; categoryId: number }
  | { type: "editItem"; item: Item }
  | { type: "modifiers"; item: Item }
  | null;

export function ItemsClient({
  menus,
  categories: initialCategories,
  initialItems,
  defaultMenuId,
  defaultCategoryId,
}: Props) {
  const [selectedMenuId, setSelectedMenuId] = useState<number | null>(defaultMenuId);
  const [items, setItems] = useState<Item[]>(initialItems as Item[]);
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [modal, setModal] = useState<ModalState>(null);
  const [loading, setLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [filterCategoryId, setFilterCategoryId] = useState<number | "all">(
    defaultCategoryId ?? "all"
  );
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "passive">("all");

  // Pagination
  const [page, setPage] = useState(0);

  // Filtered items
  const filtered = items.filter((item) => {
    if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterCategoryId !== "all" && item.category.id !== filterCategoryId) return false;
    if (filterStatus === "active" && !item.isActive) return false;
    if (filterStatus === "passive" && item.isActive) return false;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const pageItems = filtered.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);

  // Reset page when filters change
  useEffect(() => { setPage(0); }, [search, filterCategoryId, filterStatus]);

  async function loadItems(menuId: number) {
    setLoading(true);
    try {
      const res = await fetch(`/api/items?menuId=${menuId}`);
      const json = await res.json();
      if (json.success) setItems(json.data.items);
    } finally {
      setLoading(false);
    }
  }

  async function loadCategories(menuId: number) {
    const res = await fetch(`/api/menus/${menuId}/categories`);
    const json = await res.json();
    if (json.success) {
      setCategories(json.data.categories.map((c: Category) => ({ id: c.id, name: c.name })));
    }
  }

  function selectMenu(menuId: number) {
    setSelectedMenuId(menuId);
    setFilterCategoryId("all");
    loadItems(menuId);
    loadCategories(menuId);
  }

  const closeModal = useCallback(() => setModal(null), []);

  async function handleAddItem(categoryId: number, data: Record<string, unknown>) {
    const res = await fetch("/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId, ...data }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    if (selectedMenuId) await loadItems(selectedMenuId);
    closeModal();
  }

  async function handleEditItem(itemId: number, data: Record<string, unknown>) {
    const res = await fetch(`/api/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    if (selectedMenuId) await loadItems(selectedMenuId);
    closeModal();
  }

  async function handleDeleteItem(itemId: number) {
    if (!confirm("Ürün silinecek. Devam et?")) return;
    await fetch(`/api/items/${itemId}`, { method: "DELETE" });
    if (selectedMenuId) await loadItems(selectedMenuId);
  }

  return (
    <div className="space-y-5">
      {/* Başlık */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ürünler</h1>
          <p className="text-sm text-gray-500 mt-1">
            {filtered.length} ürün{filtered.length !== items.length && ` (toplam ${items.length})`}
          </p>
        </div>
        {categories.length > 0 && (
          <button
            onClick={() => setModal({ type: "addItem", categoryId: (filterCategoryId !== "all" ? filterCategoryId : categories[0].id) })}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors sm:w-auto w-full"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Ürün Ekle
          </button>
        )}
      </div>

      {/* Menü seçici */}
      {menus.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {menus.map((m) => (
            <button
              key={m.id}
              onClick={() => selectMenu(m.id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                selectedMenuId === m.id
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {m.name} {m.isDefault && "⭐"}
            </button>
          ))}
        </div>
      )}

      {/* Filtreler */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Arama */}
          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ürün adı ara..."
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Durum filtresi */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as "all" | "active" | "passive")}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="all">Tüm Durumlar</option>
            <option value="active">Aktif</option>
            <option value="passive">Pasif</option>
          </select>
        </div>

        {/* Kategori filtresi — tabs */}
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setFilterCategoryId("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterCategoryId === "all"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Tüm Kategoriler
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilterCategoryId(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filterCategoryId === cat.id
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Ürün listesi */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">Yükleniyor...</div>
      ) : pageItems.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-xl py-16 text-center">
          <p className="text-gray-400 text-sm">
            {items.length === 0 ? "Henüz ürün yok." : "Filtreyle eşleşen ürün bulunamadı."}
          </p>
          {items.length === 0 && categories.length > 0 && (
            <button
              onClick={() => setModal({ type: "addItem", categoryId: categories[0].id })}
              className="mt-3 text-sm text-blue-600 hover:underline font-medium"
            >
              İlk ürünü ekle
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {pageItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-4 bg-white border border-gray-100 rounded-xl p-4 hover:border-gray-200 hover:shadow-sm transition-all"
            >
              {/* Resim */}
              <div className="shrink-0">
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-16 h-16 rounded-xl object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center">
                    <svg className="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Bilgiler */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-base font-semibold text-gray-900">{item.name}</span>
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                    {item.category.name}
                  </span>
                  {item.isPopular && (
                    <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-medium">
                      ⭐ Popüler
                    </span>
                  )}
                  {!item.isActive && (
                    <span className="text-xs bg-red-100 text-red-400 px-2 py-0.5 rounded-full">
                      Pasif
                    </span>
                  )}
                </div>
                {item.description && (
                  <p className="text-sm text-gray-500 mt-0.5 truncate">{item.description}</p>
                )}
                {(item.calories || item.allergens) && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    {item.calories && `${item.calories} kcal`}
                    {item.calories && item.allergens && " · "}
                    {item.allergens}
                  </p>
                )}
              </div>

              {/* Fiyat + Aksiyonlar */}
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-lg font-bold text-gray-900 min-w-[60px] text-right">
                  ₺{Number(item.price).toFixed(2)}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setModal({ type: "modifiers", item })}
                    className="px-2 py-1.5 text-xs text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg font-medium transition-colors"
                    title="Seçenekler"
                  >
                    ⚙ Seçenekler
                  </button>
                  <button
                    onClick={() => setModal({ type: "editItem", item })}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-5 py-3">
          <span className="text-sm text-gray-500">
            {page * ITEMS_PER_PAGE + 1}–{Math.min((page + 1) * ITEMS_PER_PAGE, filtered.length)} / {filtered.length} ürün
          </span>
          <div className="flex items-center gap-1.5">
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ← Önceki
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              // Show pages around current
              let pageNum = i;
              if (totalPages > 7) {
                if (page < 4) pageNum = i;
                else if (page > totalPages - 5) pageNum = totalPages - 7 + i;
                else pageNum = page - 3 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`w-8 h-8 text-sm rounded-lg transition-colors ${
                    page === pageNum
                      ? "bg-blue-600 text-white font-medium"
                      : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {pageNum + 1}
                </button>
              );
            })}
            <button
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Sonraki →
            </button>
          </div>
        </div>
      )}

      {/* Modaller */}
      <Modal open={modal?.type === "addItem"} onClose={closeModal} title="Yeni Ürün">
        {modal?.type === "addItem" && (
          <ItemForm
            onSubmit={(data) => handleAddItem(modal.categoryId, data)}
            onCancel={closeModal}
          />
        )}
      </Modal>

      <Modal open={modal?.type === "editItem"} onClose={closeModal} title="Ürünü Düzenle">
        {modal?.type === "editItem" && (
          <ItemForm
            initial={modal.item}
            onSubmit={(data) => handleEditItem(modal.item.id, data)}
            onCancel={closeModal}
          />
        )}
      </Modal>

      {modal?.type === "modifiers" && (
        <ModifiersModal
          open={true}
          onClose={closeModal}
          itemId={modal.item.id}
          itemName={modal.item.name}
        />
      )}
    </div>
  );
}
