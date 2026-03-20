"use client";

import { useState } from "react";

type Restaurant = {
  id: number;
  name: string;
  slug: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  cartEnabled: boolean;
  orderingEnabled: boolean;
  subscriptionPlan: string;
  subscriptionStatus: string;
  createdAt: Date | string;
  _count: { menus: number; orders: number };
};

interface Props {
  restaurants: Restaurant[];
}

export function AdminClient({ restaurants: initialRestaurants }: Props) {
  const [restaurants, setRestaurants] = useState(initialRestaurants);
  const [saving, setSaving] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const filtered = restaurants.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.email.toLowerCase().includes(search.toLowerCase()) ||
      r.slug.toLowerCase().includes(search.toLowerCase())
  );

  async function toggle(id: number, field: "isActive" | "cartEnabled" | "orderingEnabled", value: boolean) {
    setSaving(id);
    try {
      const res = await fetch(`/api/admin/restaurants/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      const data = await res.json();
      if (data.success) {
        setRestaurants((prev) =>
          prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
        );
      } else {
        alert(data.error ?? "Hata oluştu.");
      }
    } catch {
      alert("Sunucu hatası.");
    } finally {
      setSaving(null);
    }
  }

  function Toggle({
    checked,
    onChange,
    disabled,
  }: {
    checked: boolean;
    onChange: (v: boolean) => void;
    disabled: boolean;
  }) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
          checked ? "bg-green-500" : "bg-gray-300"
        } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Süper Admin Paneli</h1>
        <p className="text-sm text-gray-500 mt-1">Tüm restoranları görüntüle ve yönet.</p>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Restoran adı, e-posta veya slug ara..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="text-sm text-gray-500 mb-3">{filtered.length} restoran</div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Restoran</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Slug</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Plan</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Menü</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Sipariş</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Aktif</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Sepet</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Sipariş Al</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Kayıt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((r) => {
                const isSaving = saving === r.id;
                return (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{r.name}</div>
                      <div className="text-xs text-gray-400">{r.email}</div>
                      {r.phone && <div className="text-xs text-gray-400">{r.phone}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={`/m/${r.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline font-mono text-xs"
                      >
                        {r.slug}
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          r.subscriptionPlan === "free"
                            ? "bg-gray-100 text-gray-600"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {r.subscriptionPlan}
                      </span>
                      <div
                        className={`text-xs mt-0.5 ${
                          r.subscriptionStatus === "active" ? "text-green-600" : "text-red-500"
                        }`}
                      >
                        {r.subscriptionStatus}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-700">{r._count.menus}</td>
                    <td className="px-4 py-3 text-center text-gray-700">{r._count.orders}</td>
                    <td className="px-4 py-3 text-center">
                      <Toggle
                        checked={r.isActive}
                        onChange={(v) => toggle(r.id, "isActive", v)}
                        disabled={isSaving}
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Toggle
                        checked={r.cartEnabled}
                        onChange={(v) => toggle(r.id, "cartEnabled", v)}
                        disabled={isSaving}
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Toggle
                        checked={r.orderingEnabled}
                        onChange={(v) => toggle(r.id, "orderingEnabled", v)}
                        disabled={isSaving}
                      />
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {new Date(r.createdAt).toLocaleDateString("tr-TR")}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                    Restoran bulunamadı.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
