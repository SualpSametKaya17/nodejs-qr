"use client";

import { useState, FormEvent } from "react";
import { ImageUpload } from "./ImageUpload";

interface ItemFormProps {
  initial?: {
    name: string;
    description?: string | null;
    price: number | string;
    imageUrl?: string | null;
    calories?: number | null;
    allergens?: string | null;
    isPopular?: boolean;
  };
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}

export function ItemForm({ initial, onSubmit, onCancel }: ItemFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? "");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      await onSubmit({
        name: form.get("name"),
        description: form.get("description"),
        price: form.get("price"),
        imageUrl: imageUrl || null,
        calories: form.get("calories"),
        allergens: form.get("allergens"),
        isPopular: form.get("isPopular") === "on",
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Hata oluştu.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Ürün Görseli</label>
        <ImageUpload currentUrl={initial?.imageUrl ?? null} onUpload={setImageUrl} />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Ürün Adı *</label>
        <input
          name="name"
          required
          defaultValue={initial?.name ?? ""}
          placeholder="Örn: Adana Kebap"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fiyat *</label>
          <input
            name="price"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={initial?.price ?? ""}
            placeholder="0.00"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Kalori</label>
          <input
            name="calories"
            type="number"
            min="0"
            defaultValue={initial?.calories ?? ""}
            placeholder="kcal"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
        <textarea
          name="description"
          rows={2}
          defaultValue={initial?.description ?? ""}
          placeholder="Opsiyonel"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Alerjenler</label>
        <input
          name="allergens"
          defaultValue={initial?.allergens ?? ""}
          placeholder="Örn: gluten, fıstık"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          name="isPopular"
          defaultChecked={initial?.isPopular ?? false}
          className="w-4 h-4 text-blue-600 rounded border-gray-300"
        />
        <span className="text-sm text-gray-700">Popüler ürün olarak işaretle</span>
      </label>

      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors"
        >
          İptal
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {loading ? "Kaydediliyor..." : "Kaydet"}
        </button>
      </div>
    </form>
  );
}
