"use client";

import { useState } from "react";
import type { LoyaltyProgram } from "@prisma/client";

export default function LoyaltyProgramForm({ program }: { program: LoyaltyProgram }) {
  const [form, setForm] = useState({
    isActive: program.isActive,
    pointsPerUnit: program.pointsPerUnit,
    minimumRedeemPoints: program.minimumRedeemPoints,
    welcomeBonus: program.welcomeBonus,
    expiryDays: program.expiryDays ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/loyalty/program", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isActive: form.isActive,
          pointsPerUnit: Number(form.pointsPerUnit),
          minimumRedeemPoints: Number(form.minimumRedeemPoints),
          welcomeBonus: Number(form.welcomeBonus),
          expiryDays: form.expiryDays === "" ? null : Number(form.expiryDays),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: "Ayarlar kaydedildi." });
      } else {
        setMessage({ type: "error", text: data.error ?? "Hata oluştu." });
      }
    } catch {
      setMessage({ type: "error", text: "Bağlantı hatası." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Aktif/Pasif */}
      <label className="flex items-center gap-3 cursor-pointer">
        <div className="relative">
          <input
            type="checkbox"
            className="sr-only"
            checked={form.isActive}
            onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
          />
          <div className={`w-10 h-6 rounded-full transition-colors ${form.isActive ? "bg-blue-600" : "bg-gray-300"}`} />
          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.isActive ? "translate-x-5 left-0" : "left-1"}`} />
        </div>
        <span className="text-sm font-medium text-gray-700">
          {form.isActive ? "Program Aktif" : "Program Pasif"}
        </span>
      </label>

      {/* Puan Katsayısı */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Puan Katsayısı
        </label>
        <input
          type="number"
          min={1}
          value={form.pointsPerUnit}
          onChange={(e) => setForm((f) => ({ ...f, pointsPerUnit: Number(e.target.value) }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-400 mt-1">Her 1 birim sipariş için verilecek puan sayısı</p>
      </div>

      {/* Minimum Kullanım Eşiği */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Minimum Kullanım Eşiği (Puan)
        </label>
        <input
          type="number"
          min={0}
          value={form.minimumRedeemPoints}
          onChange={(e) => setForm((f) => ({ ...f, minimumRedeemPoints: Number(e.target.value) }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-400 mt-1">Puan kullanmak için gereken minimum puan</p>
      </div>

      {/* Hoş Geldin Bonusu */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Hoş Geldin Bonusu (Puan)
        </label>
        <input
          type="number"
          min={0}
          value={form.welcomeBonus}
          onChange={(e) => setForm((f) => ({ ...f, welcomeBonus: Number(e.target.value) }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-400 mt-1">Yeni müşterilere otomatik verilecek puan (0 = yok)</p>
      </div>

      {/* Puan Geçerlilik Süresi */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Puan Geçerlilik Süresi (Gün)
        </label>
        <input
          type="number"
          min={1}
          placeholder="Boş bırakın = sınırsız"
          value={form.expiryDays}
          onChange={(e) => setForm((f) => ({ ...f, expiryDays: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-400 mt-1">Boş bırakırsanız puanlar sınırsız geçerli kalır</p>
      </div>

      {message && (
        <div className={`px-4 py-3 rounded-lg text-sm ${
          message.type === "success"
            ? "bg-green-50 text-green-700"
            : "bg-red-50 text-red-700"
        }`}>
          {message.text}
        </div>
      )}

      <button
        type="submit"
        disabled={saving}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {saving ? "Kaydediliyor..." : "Ayarları Kaydet"}
      </button>
    </form>
  );
}
