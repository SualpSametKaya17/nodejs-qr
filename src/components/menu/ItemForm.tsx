"use client";

import { useState, FormEvent } from "react";
import { ImageUpload } from "./ImageUpload";

const EFFECT_ICONS = ["💧", "🌊", "☕", "🍵", "🧃", "🥤", "🍺", "🍷", "🍜", "🥣"];

interface ItemFormProps {
  initial?: {
    name: string;
    description?: string | null;
    price: number | string;
    imageUrl?: string | null;
    calories?: number | null;
    allergens?: string | null;
    isPopular?: boolean;
    isLiquid?: boolean;
    effectIcon?: string | null;
    effectColor?: string | null;
  };
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}

export function ItemForm({ initial, onSubmit, onCancel }: ItemFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? "");
  const [isLiquid, setIsLiquid] = useState(initial?.isLiquid ?? false);
  const [effectIcon, setEffectIcon] = useState(initial?.effectIcon ?? "💧");
  const [effectColor, setEffectColor] = useState(initial?.effectColor ?? "#38bdf8");

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
        isLiquid,
        effectIcon: isLiquid ? effectIcon : null,
        effectColor: isLiquid ? effectColor : null,
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

      <div className="space-y-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            name="isPopular"
            defaultChecked={initial?.isPopular ?? false}
            className="w-4 h-4 text-blue-600 rounded border-gray-300"
          />
          <span className="text-sm text-gray-700">⭐ Popüler ürün olarak işaretle</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isLiquid}
            onChange={(e) => setIsLiquid(e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded border-gray-300"
          />
          <span className="text-sm text-gray-700">💧 Sıvı ürün (içecek, çorba vb.) — dalga efekti gösterir</span>
        </label>

        {isLiquid && (
          <div className="ml-6 p-3 bg-blue-50 border border-blue-100 rounded-xl space-y-3">
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1.5">Efekt İkonu</p>
              <div className="flex flex-wrap gap-1.5">
                {EFFECT_ICONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setEffectIcon(icon)}
                    className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center border-2 transition-colors ${
                      effectIcon === icon
                        ? "border-blue-500 bg-white"
                        : "border-transparent hover:border-gray-300 bg-white/60"
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1.5">Dalga Rengi</p>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={effectColor}
                  onChange={(e) => setEffectColor(e.target.value)}
                  className="w-9 h-9 rounded-lg border border-gray-300 cursor-pointer p-0.5"
                />
                <input
                  type="text"
                  value={effectColor}
                  onChange={(e) => setEffectColor(e.target.value)}
                  className="flex-1 px-2 py-1.5 border border-gray-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  pattern="^#[0-9A-Fa-f]{6}$"
                  placeholder="#38bdf8"
                />
                <div
                  className="w-9 h-9 rounded-lg border border-gray-200 flex-shrink-0"
                  style={{ backgroundColor: effectColor }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

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
