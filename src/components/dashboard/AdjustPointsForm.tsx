"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdjustPointsForm({
  customerId,
  currentPoints,
}: {
  customerId: number;
  currentPoints: number;
}) {
  const router = useRouter();
  const [points, setPoints] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSubmit(type: "add" | "subtract") {
    const amount = Number(points);
    if (!amount || amount <= 0) {
      setMessage({ type: "error", text: "Geçerli bir puan miktarı girin." });
      return;
    }

    const finalPoints = type === "subtract" ? -amount : amount;
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/admin/loyalty/customers/${customerId}/adjust`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ points: finalPoints, description }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: data.message ?? "Puan güncellendi." });
        setPoints("");
        setDescription("");
        router.refresh();
      } else {
        setMessage({ type: "error", text: data.error ?? "Hata oluştu." });
      }
    } catch {
      setMessage({ type: "error", text: "Bağlantı hatası." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Puan Miktarı
        </label>
        <input
          type="number"
          min={1}
          value={points}
          onChange={(e) => setPoints(e.target.value)}
          placeholder="Örn: 50"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Açıklama (Opsiyonel)
        </label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Örn: Doğum günü bonusu"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {message && (
        <div className={`px-3 py-2 rounded-lg text-sm ${
          message.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
        }`}>
          {message.text}
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={() => handleSubmit("add")}
          className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          + Ekle
        </button>
        <button
          type="button"
          disabled={loading || currentPoints <= 0}
          onClick={() => handleSubmit("subtract")}
          className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
        >
          − Çıkar
        </button>
      </div>
      <p className="text-xs text-gray-400 text-center">
        Mevcut bakiye: {currentPoints.toLocaleString("tr-TR")} puan
      </p>
    </div>
  );
}
