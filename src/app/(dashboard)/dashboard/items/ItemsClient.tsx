"use client";

import { useState, useCallback, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { ItemForm } from "@/components/menu/ItemForm";
import { ModifiersModal } from "@/components/menu/ModifiersModal";
import { StatCard } from "@/components/dashboard/StatCard";

const ITEMS_PER_PAGE = 15;

interface Item {
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

  const [search, setSearch] = useState("");
  const [filterCategoryId, setFilterCategoryId] = useState<number | "all">(
    defaultCategoryId ?? "all"
  );
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "passive">("all");
  const [page, setPage] = useState(0);

  const filtered = items.filter((item) => {
    if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterCategoryId !== "all" && item.category.id !== filterCategoryId) return false;
    if (filterStatus === "active" && !item.isActive) return false;
    if (filterStatus === "passive" && item.isActive) return false;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const pageItems = filtered.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);

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

  // İstatistikler
  const activeCount = items.filter((i) => i.isActive).length;
  const passiveCount = items.filter((i) => !i.isActive).length;
  const popularCount = items.filter((i) => i.isPopular).length;

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

      {/* İstatistik kartları */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          title="Toplam Ürün"
          value={items.length}
          description="tüm ürünler"
          color="blue"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
            </svg>
          }
        />
        <StatCard
          title="Aktif"
          value={activeCount}
          description="menüde görünen"
          color="green"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          title="Pasif"
          value={passiveCount}
          description="gizli ürünler"
          color="orange"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>
          }
        />
        <StatCard
          title="Popüler"
          value={popularCount}
          description="öne çıkan ürünler"
          color="purple"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          }
        />
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

        {/* Kategori filtresi */}
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

      {/* Tablo */}
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
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-16">Görsel</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Ürün</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-36">Kategori</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-28">Kalori / Alerjen</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">Durum</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-28">Fiyat</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pageItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    {/* Görsel */}
                    <td className="px-4 py-3">
                      {item.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                          <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </td>

                    {/* Ürün adı + açıklama + etiketler */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900">{item.name}</span>
                        {item.isPopular && (
                          <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-medium">
                            ⭐ Popüler
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[260px]">{item.description}</p>
                      )}
                    </td>

                    {/* Kategori */}
                    <td className="px-4 py-3">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                        {item.category.name}
                      </span>
                    </td>

                    {/* Kalori / Alerjen */}
                    <td className="px-4 py-3">
                      {item.calories || item.allergens ? (
                        <div className="text-xs text-gray-500 space-y-0.5">
                          {item.calories && <div>{item.calories} kcal</div>}
                          {item.allergens && <div className="truncate max-w-[100px]">{item.allergens}</div>}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>

                    {/* Durum */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        item.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"
                      }`}>
                        {item.isActive ? "Aktif" : "Pasif"}
                      </span>
                    </td>

                    {/* Fiyat */}
                    <td className="px-4 py-3 text-right">
                      <span className="text-base font-bold text-gray-900">
                        ₺{Number(item.price).toFixed(2)}
                      </span>
                    </td>

                    {/* İşlemler */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setModal({ type: "modifiers", item })}
                          className="px-2 py-1 text-xs text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg font-medium transition-colors"
                          title="Seçenekler"
                        >
                          ⚙ Seçenekler
                        </button>
                        <button
                          onClick={() => setModal({ type: "editItem", item })}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
