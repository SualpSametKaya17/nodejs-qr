"use client";

import { useState, useCallback } from "react";
import { Modal } from "@/components/ui/Modal";
import { CategoryForm } from "@/components/menu/CategoryForm";
import { ItemForm } from "@/components/menu/ItemForm";
import { ModifiersModal } from "@/components/menu/ModifiersModal";

const ITEMS_PER_PAGE = 8;
const CATS_PER_PAGE = 5;

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
}

interface Category {
  id: number;
  name: string;
  description: string | null;
  imageUrl?: string | null;
  isActive: boolean;
  items: Item[];
}

interface Menu {
  id: number;
  name: string;
  isDefault: boolean;
  isActive: boolean;
}

interface Props {
  menus: Menu[];
  initialCategories: unknown[];
  defaultMenuId: number | null;
}

type ModalState =
  | { type: "addCategory" }
  | { type: "editCategory"; category: Category }
  | { type: "addItem"; categoryId: number }
  | { type: "editItem"; item: Item; categoryId: number }
  | { type: "modifiers"; item: Item }
  | null;

// ─── Item card row ─────────────────────────────────────────────────────────────
function ItemRow({
  item,
  onEdit,
  onDelete,
  onModifiers,
}: {
  item: Item;
  onEdit: () => void;
  onDelete: () => void;
  onModifiers: () => void;
}) {
  return (
    <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all">
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
          {item.isPopular && (
            <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-medium">
              ⭐ Popüler
            </span>
          )}
          {!item.isActive && (
            <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">
              Pasif
            </span>
          )}
        </div>
        {item.description && (
          <p className="text-sm text-gray-500 mt-0.5 truncate">{item.description}</p>
        )}
        {item.calories && (
          <p className="text-xs text-gray-400 mt-0.5">{item.calories} kcal</p>
        )}
      </div>

      {/* Fiyat + Aksiyonlar */}
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-lg font-bold text-gray-900">
          ₺{Number(item.price).toFixed(2)}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={onModifiers}
            className="px-2 py-1.5 text-xs text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg font-medium transition-colors"
            title="Seçenekler"
          >
            ⚙ Seçenekler
          </button>
          <button
            onClick={onEdit}
            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Düzenle"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Sil"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Category card ─────────────────────────────────────────────────────────────
function CategoryCard({
  cat,
  onAddItem,
  onEdit,
  onDelete,
  onEditItem,
  onDeleteItem,
  onModifiers,
}: {
  cat: Category;
  onAddItem: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onEditItem: (item: Item) => void;
  onDeleteItem: (itemId: number) => void;
  onModifiers: (item: Item) => void;
}) {
  const [itemPage, setItemPage] = useState(0);
  const totalPages = Math.ceil(cat.items.length / ITEMS_PER_PAGE);
  const visibleItems = cat.items.slice(
    itemPage * ITEMS_PER_PAGE,
    (itemPage + 1) * ITEMS_PER_PAGE
  );

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
      {/* Kategori başlığı */}
      <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {cat.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cat.imageUrl}
              alt={cat.name}
              className="w-12 h-12 rounded-xl object-cover shrink-0"
            />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
              <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </div>
          )}
          <div className="min-w-0">
            <h3 className="text-base font-bold text-gray-900 truncate">{cat.name}</h3>
            {cat.description && (
              <p className="text-xs text-gray-500 truncate">{cat.description}</p>
            )}
            <p className="text-xs text-gray-400 mt-0.5">{cat.items.length} ürün</p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onAddItem}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Ürün Ekle
          </button>
          <button
            onClick={onEdit}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Ürünler */}
      {cat.items.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <p className="text-sm text-gray-400">Bu kategoride henüz ürün yok.</p>
          <button
            onClick={onAddItem}
            className="mt-2 text-sm text-blue-600 hover:underline font-medium"
          >
            İlk ürünü ekle
          </button>
        </div>
      ) : (
        <>
          <div className="p-4 space-y-3">
            {visibleItems.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                onEdit={() => onEditItem(item)}
                onDelete={() => onDeleteItem(item.id)}
                onModifiers={() => onModifiers(item)}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50">
              <span className="text-xs text-gray-500">
                {itemPage * ITEMS_PER_PAGE + 1}–
                {Math.min((itemPage + 1) * ITEMS_PER_PAGE, cat.items.length)} / {cat.items.length} ürün
              </span>
              <div className="flex items-center gap-1">
                <button
                  disabled={itemPage === 0}
                  onClick={() => setItemPage((p) => p - 1)}
                  className="px-2.5 py-1 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  ← Önceki
                </button>
                <span className="text-xs text-gray-500 px-2">
                  {itemPage + 1} / {totalPages}
                </span>
                <button
                  disabled={itemPage >= totalPages - 1}
                  onClick={() => setItemPage((p) => p + 1)}
                  className="px-2.5 py-1 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Sonraki →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export function CategoriesClient({ menus, initialCategories, defaultMenuId }: Props) {
  const [selectedMenuId, setSelectedMenuId] = useState<number | null>(defaultMenuId);
  const [categories, setCategories] = useState<Category[]>(initialCategories as Category[]);
  const [modal, setModal] = useState<ModalState>(null);
  const [loading, setLoading] = useState(false);
  const [catPage, setCatPage] = useState(0);

  const totalCatPages = Math.ceil(categories.length / CATS_PER_PAGE);
  const visibleCats = categories.slice(catPage * CATS_PER_PAGE, (catPage + 1) * CATS_PER_PAGE);

  async function loadCategories(menuId: number) {
    setLoading(true);
    setCatPage(0);
    try {
      const res = await fetch(`/api/menus/${menuId}/categories`);
      const json = await res.json();
      if (json.success) setCategories(json.data.categories);
    } finally {
      setLoading(false);
    }
  }

  function selectMenu(menuId: number) {
    setSelectedMenuId(menuId);
    loadCategories(menuId);
  }

  const closeModal = useCallback(() => setModal(null), []);

  async function handleAddCategory(data: { name: string; description: string; imageUrl: string }) {
    if (!selectedMenuId) return;
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ menuId: selectedMenuId, ...data }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    await loadCategories(selectedMenuId);
    closeModal();
  }

  async function handleEditCategory(categoryId: number, data: { name: string; description: string; imageUrl: string }) {
    const res = await fetch(`/api/categories/${categoryId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    if (selectedMenuId) await loadCategories(selectedMenuId);
    closeModal();
  }

  async function handleDeleteCategory(categoryId: number) {
    if (!confirm("Kategori ve içindeki tüm ürünler silinecek. Devam et?")) return;
    const res = await fetch(`/api/categories/${categoryId}`, { method: "DELETE" });
    const json = await res.json();
    if (json.success && selectedMenuId) await loadCategories(selectedMenuId);
  }

  async function handleAddItem(categoryId: number, data: Record<string, unknown>) {
    const res = await fetch("/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId, ...data }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    if (selectedMenuId) await loadCategories(selectedMenuId);
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
    if (selectedMenuId) await loadCategories(selectedMenuId);
    closeModal();
  }

  async function handleDeleteItem(itemId: number) {
    if (!confirm("Ürün silinecek. Devam et?")) return;
    await fetch(`/api/items/${itemId}`, { method: "DELETE" });
    if (selectedMenuId) await loadCategories(selectedMenuId);
  }

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kategoriler & Ürünler</h1>
          <p className="text-sm text-gray-500 mt-1">Kategori ve ürünleri düzenle</p>
        </div>
        {selectedMenuId && (
          <button
            onClick={() => setModal({ type: "addCategory" })}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors sm:w-auto w-full"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Kategori Ekle
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

      {/* İçerik */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">Yükleniyor...</div>
      ) : categories.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-xl py-16 text-center">
          <p className="text-gray-400 text-sm">Henüz kategori yok.</p>
          <button
            onClick={() => setModal({ type: "addCategory" })}
            className="mt-3 text-sm text-blue-600 hover:underline font-medium"
          >
            İlk kategoriyi ekle
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-5">
            {visibleCats.map((cat) => (
              <CategoryCard
                key={cat.id}
                cat={cat}
                onAddItem={() => setModal({ type: "addItem", categoryId: cat.id })}
                onEdit={() => setModal({ type: "editCategory", category: cat })}
                onDelete={() => handleDeleteCategory(cat.id)}
                onEditItem={(item) => setModal({ type: "editItem", item, categoryId: cat.id })}
                onDeleteItem={handleDeleteItem}
                onModifiers={(item) => setModal({ type: "modifiers", item })}
              />
            ))}
          </div>

          {/* Kategori pagination */}
          {totalCatPages > 1 && (
            <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-5 py-3">
              <span className="text-sm text-gray-500">
                {catPage * CATS_PER_PAGE + 1}–{Math.min((catPage + 1) * CATS_PER_PAGE, categories.length)} / {categories.length} kategori
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={catPage === 0}
                  onClick={() => setCatPage((p) => p - 1)}
                  className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  ← Önceki
                </button>
                {Array.from({ length: totalCatPages }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setCatPage(i)}
                    className={`w-8 h-8 text-sm rounded-lg transition-colors ${
                      catPage === i
                        ? "bg-blue-600 text-white font-medium"
                        : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  disabled={catPage >= totalCatPages - 1}
                  onClick={() => setCatPage((p) => p + 1)}
                  className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Sonraki →
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modaller */}
      <Modal open={modal?.type === "addCategory"} onClose={closeModal} title="Yeni Kategori">
        <CategoryForm onSubmit={handleAddCategory} onCancel={closeModal} />
      </Modal>

      <Modal open={modal?.type === "editCategory"} onClose={closeModal} title="Kategoriyi Düzenle">
        {modal?.type === "editCategory" && (
          <CategoryForm
            initial={modal.category}
            onSubmit={(data) => handleEditCategory(modal.category.id, data)}
            onCancel={closeModal}
          />
        )}
      </Modal>

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
