"use client";

import { useState, useCallback } from "react";
import { Modal } from "@/components/ui/Modal";
import { CategoryForm } from "@/components/menu/CategoryForm";
import { ItemForm } from "@/components/menu/ItemForm";
import { ModifiersModal } from "@/components/menu/ModifiersModal";

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

export function MenuClient({ menus, initialCategories, defaultMenuId }: Props) {
  const [selectedMenuId, setSelectedMenuId] = useState<number | null>(defaultMenuId);
  const [categories, setCategories] = useState<Category[]>(initialCategories as Category[]);
  const [modal, setModal] = useState<ModalState>(null);
  const [loadingMenu, setLoadingMenu] = useState(false);

  async function loadCategories(menuId: number) {
    setLoadingMenu(true);
    try {
      const res = await fetch(`/api/menus/${menuId}/categories`);
      const json = await res.json();
      if (json.success) setCategories(json.data.categories);
    } finally {
      setLoadingMenu(false);
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
      body: JSON.stringify({ name: data.name, description: data.description, imageUrl: data.imageUrl }),
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Menü Yönetimi</h1>
          <p className="text-sm text-gray-500 mt-1">Kategoriler ve ürünleri düzenle</p>
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
      {loadingMenu ? (
        <div className="text-center py-16 text-gray-400">Yükleniyor...</div>
      ) : categories.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-xl py-16 text-center">
          <p className="text-gray-400 text-sm">Henüz kategori yok.</p>
          <button
            onClick={() => setModal({ type: "addCategory" })}
            className="mt-3 text-sm text-blue-600 hover:underline"
          >
            İlk kategoriyi ekle
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {categories.map((cat) => (
            <div key={cat.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              {/* Kategori başlığı */}
              <div className="flex items-center justify-between px-4 sm:px-5 py-3 bg-gray-50 border-b border-gray-100 gap-2">
                <div className="min-w-0">
                  <span className="font-semibold text-gray-800">{cat.name}</span>
                  {cat.description && (
                    <span className="ml-2 text-xs text-gray-400 hidden sm:inline">{cat.description}</span>
                  )}
                  <span className="ml-2 text-xs text-gray-400">({cat.items.length} ürün)</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setModal({ type: "addItem", categoryId: cat.id })}
                    className="px-3 py-1.5 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg font-medium transition-colors"
                  >
                    + Ürün
                  </button>
                  <button
                    onClick={() => setModal({ type: "editCategory", category: cat })}
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(cat.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
                <div className="px-5 py-6 text-center text-sm text-gray-400">
                  Bu kategoride henüz ürün yok.
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {cat.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between px-4 sm:px-5 py-3 hover:bg-gray-50 transition-colors gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                            {item.isPopular && (
                              <span className="text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded font-medium">Popüler</span>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-xs text-gray-400 truncate">{item.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                        <span className="text-sm font-semibold text-gray-900">
                          ₺{Number(item.price).toFixed(2)}
                        </span>
                        <button
                          onClick={() => setModal({ type: "modifiers", item })}
                          className="px-2 py-1 text-xs text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg font-medium transition-colors"
                          title="Seçenekler"
                        >
                          ⚙ Seçenekler
                        </button>
                        <button
                          onClick={() => setModal({ type: "editItem", item, categoryId: cat.id })}
                          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modaller */}
      <Modal
        open={modal?.type === "addCategory"}
        onClose={closeModal}
        title="Yeni Kategori"
      >
        <CategoryForm
          onSubmit={handleAddCategory}
          onCancel={closeModal}
        />
      </Modal>

      <Modal
        open={modal?.type === "editCategory"}
        onClose={closeModal}
        title="Kategoriyi Düzenle"
      >
        {modal?.type === "editCategory" && (
          <CategoryForm
            initial={modal.category}
            onSubmit={(data) => handleEditCategory(modal.category.id, data)}
            onCancel={closeModal}
          />
        )}
      </Modal>

      <Modal
        open={modal?.type === "addItem"}
        onClose={closeModal}
        title="Yeni Ürün"
      >
        {modal?.type === "addItem" && (
          <ItemForm
            onSubmit={(data) => handleAddItem(modal.categoryId, data)}
            onCancel={closeModal}
          />
        )}
      </Modal>

      <Modal
        open={modal?.type === "editItem"}
        onClose={closeModal}
        title="Ürünü Düzenle"
      >
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
