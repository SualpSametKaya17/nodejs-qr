"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Modal } from "@/components/ui/Modal";
import { CategoryForm } from "@/components/menu/CategoryForm";

interface Category {
  id: number;
  name: string;
  description: string | null;
  imageUrl?: string | null;
  isActive: boolean;
  items: { id: number }[];
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
  | null;

export function CategoriesClient({ menus, initialCategories, defaultMenuId }: Props) {
  const [selectedMenuId, setSelectedMenuId] = useState<number | null>(defaultMenuId);
  const [categories, setCategories] = useState<Category[]>(initialCategories as Category[]);
  const [modal, setModal] = useState<ModalState>(null);
  const [loading, setLoading] = useState(false);

  async function loadCategories(menuId: number) {
    setLoading(true);
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

  async function handleEditCategory(
    categoryId: number,
    data: { name: string; description: string; imageUrl: string }
  ) {
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

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kategoriler</h1>
          <p className="text-sm text-gray-500 mt-1">Menü kategorilerini düzenle</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedMenuId && (
            <Link
              href={`/dashboard/items?menuId=${selectedMenuId}`}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              Ürünlere Git
            </Link>
          )}
          {selectedMenuId && (
            <button
              onClick={() => setModal({ type: "addCategory" })}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Kategori Ekle
            </button>
          )}
        </div>
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
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden divide-y divide-gray-100">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors"
            >
              {/* Resim */}
              <div className="shrink-0">
                {cat.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={cat.imageUrl}
                    alt={cat.name}
                    className="w-14 h-14 rounded-xl object-cover"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-blue-50 flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Bilgi */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-base font-semibold text-gray-900">{cat.name}</span>
                  {!cat.isActive && (
                    <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">Pasif</span>
                  )}
                </div>
                {cat.description && (
                  <p className="text-sm text-gray-500 mt-0.5 truncate">{cat.description}</p>
                )}
                <p className="text-xs text-gray-400 mt-1">{cat.items.length} ürün</p>
              </div>

              {/* Aksiyonlar */}
              <div className="flex items-center gap-1 shrink-0">
                <Link
                  href={`/dashboard/items?menuId=${selectedMenuId}&categoryId=${cat.id}`}
                  className="px-3 py-1.5 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg font-medium transition-colors"
                >
                  Ürünleri Gör
                </Link>
                <button
                  onClick={() => setModal({ type: "editCategory", category: cat })}
                  className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDeleteCategory(cat.id)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
    </div>
  );
}
