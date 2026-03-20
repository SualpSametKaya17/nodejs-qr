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
  sortOrder: number;
  isActive: boolean;
  parentId?: number | null;
  parent?: { id: number; name: string } | null;
  children?: { id: number; name: string; _count: { items: number } }[];
  _count?: { items: number };
  // legacy fallback
  items?: { id: number }[];
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
  | { type: "addCategory"; parentId?: number }
  | { type: "editCategory"; category: Category }
  | null;

export function CategoriesClient({ menus, initialCategories, defaultMenuId }: Props) {
  const [selectedMenuId, setSelectedMenuId] = useState<number | null>(defaultMenuId);
  const [categories, setCategories] = useState<Category[]>(initialCategories as Category[]);
  const [modal, setModal] = useState<ModalState>(null);
  const [loading, setLoading] = useState(false);

  // Sadece üst kategoriler (root)
  const roots = categories.filter((c) => !c.parentId);

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

  async function handleAddCategory(data: { name: string; description: string; imageUrl: string; parentId?: number }) {
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

  const itemCount = (cat: Category) =>
    (cat._count?.items ?? cat.items?.length ?? 0);

  return (
    <div className="space-y-5">
      {/* Başlık */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kategoriler</h1>
          <p className="text-sm text-gray-500 mt-1">{categories.length} kategori</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedMenuId && (
            <Link
              href={`/dashboard/items?menuId=${selectedMenuId}`}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
            >
              Ürünlere Git →
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

      {/* Tablo */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">Yükleniyor...</div>
      ) : categories.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-xl py-16 text-center">
          <p className="text-gray-400 text-sm">Henüz kategori yok.</p>
          <button onClick={() => setModal({ type: "addCategory" })} className="mt-3 text-sm text-blue-600 hover:underline font-medium">
            İlk kategoriyi ekle
          </button>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-12">Sıra</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Üst Kategori</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Alt Kategoriler</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">Ürün Sayısı</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">Durum</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {roots.map((cat) => (
                  <>
                    {/* Üst kategori satırı */}
                    <tr key={cat.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center justify-center w-6 h-6 bg-gray-100 rounded text-xs font-bold text-gray-500">
                          {cat.sortOrder + 1}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {cat.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={cat.imageUrl} alt={cat.name} className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                              <svg className="w-4 h-4 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                              </svg>
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-gray-900">{cat.name}</p>
                            {cat.description && (
                              <p className="text-xs text-gray-400 truncate max-w-[200px]">{cat.description}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {(cat.children ?? []).length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {(cat.children ?? []).map((child) => (
                              <span key={child.id} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                                {child.name} ({child._count.items})
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-semibold text-gray-700">{itemCount(cat)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          cat.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"
                        }`}>
                          {cat.isActive ? "Aktif" : "Pasif"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setModal({ type: "addCategory", parentId: cat.id })}
                            className="px-2 py-1 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg font-medium transition-colors"
                            title="Alt kategori ekle"
                          >
                            + Alt
                          </button>
                          <Link
                            href={`/dashboard/items?menuId=${selectedMenuId}&categoryId=${cat.id}`}
                            className="px-2 py-1 text-xs text-gray-500 bg-gray-50 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                          >
                            Ürünler
                          </Link>
                          <button
                            onClick={() => setModal({ type: "editCategory", category: cat })}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(cat.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Alt kategori satırları */}
                    {(cat.children ?? []).map((child) => {
                      const fullChild = categories.find((c) => c.id === child.id);
                      return (
                        <tr key={`child-${child.id}`} className="bg-gray-50/50 hover:bg-blue-50/30 transition-colors">
                          <td className="px-4 py-2.5 pl-10">
                            <span className="inline-flex items-center justify-center w-5 h-5 bg-gray-100 rounded text-xs text-gray-400">
                              ↳
                            </span>
                          </td>
                          <td className="px-4 py-2.5 pl-10">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-md bg-gray-100 flex items-center justify-center flex-shrink-0">
                                <svg className="w-3.5 h-3.5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16" />
                                </svg>
                              </div>
                              <span className="text-sm text-gray-700">{child.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="text-xs text-gray-400">Alt kategori</span>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="text-sm text-gray-600">{child._count.items}</span>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              (fullChild?.isActive ?? true) ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"
                            }`}>
                              {(fullChild?.isActive ?? true) ? "Aktif" : "Pasif"}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center justify-end gap-1">
                              <Link
                                href={`/dashboard/items?menuId=${selectedMenuId}&categoryId=${child.id}`}
                                className="px-2 py-1 text-xs text-gray-500 bg-gray-50 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                              >
                                Ürünler
                              </Link>
                              {fullChild && (
                                <button
                                  onClick={() => setModal({ type: "editCategory", category: fullChild })}
                                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteCategory(child.id)}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modaller */}
      <Modal
        open={modal?.type === "addCategory"}
        onClose={closeModal}
        title={modal?.type === "addCategory" && modal.parentId ? "Alt Kategori Ekle" : "Yeni Kategori"}
      >
        <CategoryForm
          onSubmit={(data) =>
            handleAddCategory({
              ...data,
              ...(modal?.type === "addCategory" && modal.parentId ? { parentId: modal.parentId } : {}),
            })
          }
          onCancel={closeModal}
        />
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
