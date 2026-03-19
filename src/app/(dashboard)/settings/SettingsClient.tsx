"use client";

import { useState, FormEvent } from "react";

interface Restaurant {
  id: number;
  name: string;
  email: string;
  logoUrl: string | null;
  primaryColor: string | null;
  address: string | null;
  phone: string | null;
  currency: string | null;
  language: string | null;
  subscriptionPlan: string;
  subscriptionStatus: string;
}

interface Props {
  restaurant: Restaurant;
}

type Section = "profile" | "appearance" | "password";

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="font-semibold text-gray-900">{title}</h2>
        <p className="text-sm text-gray-400 mt-0.5">{description}</p>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}

function inputCls() {
  return "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
}

export function SettingsClient({ restaurant }: Props) {
  const [activeSection, setActiveSection] = useState<Section>("profile");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [color, setColor] = useState(restaurant.primaryColor ?? "#2563eb");

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  async function handleProfileSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/restaurant", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        address: form.get("address"),
        phone: form.get("phone"),
        currency: form.get("currency"),
        language: form.get("language"),
      }),
    });
    setSaving(false);
    const json = await res.json();
    showToast(json.success ? "Profil kaydedildi." : json.error, json.success);
  }

  async function handleAppearanceSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/restaurant", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        logoUrl: form.get("logoUrl"),
        primaryColor: color,
      }),
    });
    setSaving(false);
    const json = await res.json();
    showToast(json.success ? "Görünüm kaydedildi." : json.error, json.success);
  }

  async function handlePasswordSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const newPass = form.get("newPassword") as string;
    const confirm = form.get("confirmPassword") as string;
    if (newPass !== confirm) { showToast("Şifreler eşleşmiyor.", false); return; }
    setSaving(true);
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword: form.get("currentPassword"),
        newPassword: newPass,
      }),
    });
    setSaving(false);
    const json = await res.json();
    showToast(json.success ? "Şifre güncellendi." : json.error, json.success);
    if (json.success) (e.target as HTMLFormElement).reset();
  }

  const planColors: Record<string, string> = {
    free: "bg-gray-100 text-gray-600",
    starter: "bg-blue-100 text-blue-700",
    pro: "bg-purple-100 text-purple-700",
    enterprise: "bg-yellow-100 text-yellow-700",
  };

  const tabs: { key: Section; label: string }[] = [
    { key: "profile", label: "Profil" },
    { key: "appearance", label: "Görünüm" },
    { key: "password", label: "Şifre" },
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${
            toast.ok ? "bg-green-600 text-white" : "bg-red-600 text-white"
          }`}
        >
          {toast.msg}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Ayarlar</h1>
        <p className="text-sm text-gray-500 mt-1">Hesap ve restoran bilgilerini yönet</p>
      </div>

      {/* Abonelik bilgisi */}
      <div className="bg-white border border-gray-200 rounded-xl px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">Hesap</p>
          <p className="font-medium text-gray-900">{restaurant.email}</p>
        </div>
        <div className="text-right">
          <span
            className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wide ${
              planColors[restaurant.subscriptionPlan] ?? planColors.free
            }`}
          >
            {restaurant.subscriptionPlan}
          </span>
          <p className="text-xs text-gray-400 mt-0.5 capitalize">
            {restaurant.subscriptionStatus}
          </p>
        </div>
      </div>

      {/* Sekmeler */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveSection(t.key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeSection === t.key
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Profil */}
      {activeSection === "profile" && (
        <SectionCard title="Restoran Bilgileri" description="Müşterilere gösterilen genel bilgiler">
          <form onSubmit={handleProfileSave} className="space-y-4">
            <Field label="Restoran Adı *">
              <input
                name="name"
                required
                defaultValue={restaurant.name}
                className={inputCls()}
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Telefon">
                <input
                  name="phone"
                  type="tel"
                  defaultValue={restaurant.phone ?? ""}
                  placeholder="+90 555 000 00 00"
                  className={inputCls()}
                />
              </Field>
              <Field label="Para Birimi">
                <select name="currency" defaultValue={restaurant.currency ?? "TRY"} className={inputCls()}>
                  <option value="TRY">₺ Türk Lirası (TRY)</option>
                  <option value="USD">$ Dolar (USD)</option>
                  <option value="EUR">€ Euro (EUR)</option>
                  <option value="GBP">£ Sterlin (GBP)</option>
                </select>
              </Field>
            </div>
            <Field label="Adres">
              <textarea
                name="address"
                rows={2}
                defaultValue={restaurant.address ?? ""}
                placeholder="Restoran adresi"
                className={`${inputCls()} resize-none`}
              />
            </Field>
            <Field label="Dil">
              <select name="language" defaultValue={restaurant.language ?? "tr"} className={inputCls()}>
                <option value="tr">Türkçe</option>
                <option value="en">English</option>
                <option value="de">Deutsch</option>
                <option value="ar">العربية</option>
              </select>
            </Field>
            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {saving ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </div>
          </form>
        </SectionCard>
      )}

      {/* Görünüm */}
      {activeSection === "appearance" && (
        <SectionCard title="Görünüm" description="Menü sayfasının görsel kimliği">
          <form onSubmit={handleAppearanceSave} className="space-y-4">
            <Field label="Logo URL">
              <input
                name="logoUrl"
                type="url"
                defaultValue={restaurant.logoUrl ?? ""}
                placeholder="https://..."
                className={inputCls()}
              />
            </Field>
            <Field label="Ana Renk">
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer p-0.5"
                />
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  pattern="^#[0-9A-Fa-f]{6}$"
                  placeholder="#2563eb"
                />
                {/* Önizleme */}
                <div
                  className="px-3 py-1.5 rounded-lg text-white text-xs font-medium"
                  style={{ backgroundColor: color }}
                >
                  Önizleme
                </div>
              </div>
            </Field>
            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {saving ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </div>
          </form>
        </SectionCard>
      )}

      {/* Şifre */}
      {activeSection === "password" && (
        <SectionCard title="Şifre Değiştir" description="Hesap güvenliğinizi güncel tutun">
          <form onSubmit={handlePasswordSave} className="space-y-4">
            <Field label="Mevcut Şifre">
              <input
                name="currentPassword"
                type="password"
                required
                autoComplete="current-password"
                className={inputCls()}
              />
            </Field>
            <Field label="Yeni Şifre">
              <input
                name="newPassword"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="En az 8 karakter"
                className={inputCls()}
              />
            </Field>
            <Field label="Yeni Şifre (Tekrar)">
              <input
                name="confirmPassword"
                type="password"
                required
                autoComplete="new-password"
                className={inputCls()}
              />
            </Field>
            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {saving ? "Güncelleniyor..." : "Güncelle"}
              </button>
            </div>
          </form>
        </SectionCard>
      )}
    </div>
  );
}
