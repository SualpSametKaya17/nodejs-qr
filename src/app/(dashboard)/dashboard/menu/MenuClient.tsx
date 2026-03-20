"use client";

import Link from "next/link";

interface Menu {
  id: number;
  name: string;
  isDefault: boolean;
  isActive: boolean;
  _count?: { categories: number };
}

interface Props {
  menus: Menu[];
}

export function MenuClient({ menus }: Props) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Menüler</h1>
          <p className="text-sm text-gray-500 mt-1">Restoranınızın menülerini görüntüleyin</p>
        </div>
      </div>

      {menus.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-xl py-16 text-center">
          <p className="text-gray-400 text-sm">Henüz menü yok.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {menus.map((menu) => (
            <div
              key={menu.id}
              className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{menu.name}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    {menu.isDefault && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                        Varsayılan
                      </span>
                    )}
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        menu.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {menu.isActive ? "Aktif" : "Pasif"}
                    </span>
                  </div>
                </div>
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
              </div>

              {menu._count !== undefined && (
                <p className="text-sm text-gray-500 mb-4">
                  {menu._count.categories} kategori
                </p>
              )}

              <Link
                href={`/dashboard/categories?menuId=${menu.id}`}
                className="flex items-center justify-center gap-2 w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                Kategorileri Yönet
              </Link>
            </div>
          ))}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700">
        <strong>İpucu:</strong> Kategori ve ürün yönetimi için{" "}
        <Link href="/dashboard/categories" className="underline font-medium">
          Kategoriler & Ürünler
        </Link>{" "}
        sayfasına gidin.
      </div>
    </div>
  );
}
