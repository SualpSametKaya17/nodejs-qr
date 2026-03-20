"use client";

import { useState } from "react";

interface StaffMember {
  id: number;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

interface Props {
  staff: StaffMember[];
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Yönetici",
  MANAGER: "Müdür",
  WAITER: "Garson",
  KITCHEN: "Mutfak",
};

const ROLE_COLORS: Record<string, string> = {
  ADMIN: "bg-purple-100 text-purple-700",
  MANAGER: "bg-blue-100 text-blue-700",
  WAITER: "bg-green-100 text-green-700",
  KITCHEN: "bg-orange-100 text-orange-700",
};

const ROLES = ["ADMIN", "MANAGER", "WAITER", "KITCHEN"] as const;

type FormMode = "create" | "edit";

interface FormState {
  mode: FormMode;
  staffId?: number;
  name: string;
  email: string;
  password: string;
  staffRole: string;
  isActive: boolean;
}

const emptyForm = (): FormState => ({
  mode: "create",
  name: "",
  email: "",
  password: "",
  staffRole: "WAITER",
  isActive: true,
});

export function StaffClient({ staff: initialStaff }: Props) {
  const [staff, setStaff] = useState<StaffMember[]>(initialStaff);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  function openCreate() {
    setForm(emptyForm());
  }

  function openEdit(s: StaffMember) {
    setForm({
      mode: "edit",
      staffId: s.id,
      name: s.name,
      email: s.email,
      password: "",
      staffRole: s.role,
      isActive: s.isActive,
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);

    try {
      if (form.mode === "create") {
        const res = await fetch("/api/staff", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name,
            email: form.email,
            password: form.password,
            staffRole: form.staffRole,
          }),
        });
        const json = await res.json();
        if (json.success) {
          setStaff((prev) => [json.data.staff, ...prev]);
          setForm(null);
          showToast("Personel eklendi.");
        } else {
          showToast(json.error ?? "Hata oluştu.", false);
        }
      } else {
        const body: Record<string, unknown> = {
          name: form.name,
          email: form.email,
          staffRole: form.staffRole,
          isActive: form.isActive,
        };
        if (form.password) body.password = form.password;

        const res = await fetch(`/api/staff/${form.staffId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = await res.json();
        if (json.success) {
          setStaff((prev) =>
            prev.map((s) => (s.id === form.staffId ? { ...s, ...json.data.staff } : s))
          );
          setForm(null);
          showToast("Personel güncellendi.");
        } else {
          showToast(json.error ?? "Hata oluştu.", false);
        }
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Bu personeli silmek istediğinizden emin misiniz?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/staff/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        setStaff((prev) => prev.filter((s) => s.id !== id));
        showToast("Personel silindi.");
      } else {
        showToast(json.error ?? "Hata oluştu.", false);
      }
    } finally {
      setDeletingId(null);
    }
  }

  const inputCls = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="space-y-6 max-w-3xl w-full">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${
            toast.ok ? "bg-green-600 text-white" : "bg-red-600 text-white"
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Personel</h1>
          <p className="text-sm text-gray-500 mt-1">Çalışan hesaplarını yönet</p>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          + Personel Ekle
        </button>
      </div>

      {/* Rol açıklaması */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {ROLES.map((r) => (
          <div key={r} className={`rounded-lg px-3 py-2 text-xs font-medium ${ROLE_COLORS[r]}`}>
            <div className="font-semibold">{ROLE_LABELS[r]}</div>
            <div className="font-normal opacity-75 mt-0.5">
              {r === "ADMIN" && "Tüm yetkiler"}
              {r === "MANAGER" && "Sipariş, analitik, menü"}
              {r === "WAITER" && "Sadece siparişler"}
              {r === "KITCHEN" && "Sadece siparişler"}
            </div>
          </div>
        ))}
      </div>

      {/* Liste */}
      {staff.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-gray-400">
          <p className="text-base font-medium">Henüz personel eklenmemiş.</p>
          <p className="text-sm mt-1">Personel ekleyerek çalışanlarınıza giriş izni verin.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-500">Ad</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">E-posta</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Rol</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Durum</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {staff.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                  <td className="px-4 py-3 text-gray-500">{s.email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${ROLE_COLORS[s.role] ?? "bg-gray-100 text-gray-600"}`}>
                      {ROLE_LABELS[s.role] ?? s.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${s.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {s.isActive ? "Aktif" : "Pasif"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => openEdit(s)}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Düzenle
                      </button>
                      <button
                        onClick={() => handleDelete(s.id)}
                        disabled={deletingId === s.id}
                        className="text-xs text-red-500 hover:underline disabled:opacity-50"
                      >
                        {deletingId === s.id ? "..." : "Sil"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {form.mode === "create" ? "Yeni Personel" : "Personeli Düzenle"}
              </h2>
              <button onClick={() => setForm(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ad Soyad *</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={inputCls}
                  placeholder="Ahmet Yılmaz"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-posta *</label>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={inputCls}
                  placeholder="ahmet@restoran.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {form.mode === "create" ? "Şifre *" : "Yeni Şifre (boş bırakılırsa değişmez)"}
                </label>
                <input
                  required={form.mode === "create"}
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className={inputCls}
                  placeholder="En az 6 karakter"
                  minLength={form.mode === "create" ? 6 : undefined}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rol *</label>
                <select
                  value={form.staffRole}
                  onChange={(e) => setForm({ ...form, staffRole: e.target.value })}
                  className={inputCls}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                  ))}
                </select>
              </div>
              {form.mode === "edit" && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    className="w-4 h-4 rounded accent-blue-600"
                  />
                  <span className="text-sm text-gray-700">Aktif</span>
                </label>
              )}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setForm(null)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {saving ? "Kaydediliyor..." : form.mode === "create" ? "Ekle" : "Güncelle"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
