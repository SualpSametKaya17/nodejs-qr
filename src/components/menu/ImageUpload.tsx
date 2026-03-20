"use client";

import { useState, useRef } from "react";

interface Props {
  currentUrl: string | null;
  onUpload: (url: string) => void;
  /** "circle" → yuvarlak önizleme (logo/ikon için), varsayılan dikdörtgen */
  shape?: "circle" | "rect";
}

export function ImageUpload({ currentUrl, onUpload, shape = "rect" }: Props) {
  const [preview, setPreview] = useState<string | null>(currentUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);
    setUploading(true);
    setError("");

    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (json.success) {
        URL.revokeObjectURL(localUrl);
        setPreview(json.data.url);
        onUpload(json.data.url);
      } else {
        setError(json.error ?? "Yükleme başarısız.");
        setPreview(currentUrl);
      }
    } catch {
      setError("Ağ hatası. Tekrar deneyin.");
      setPreview(currentUrl);
    } finally {
      setUploading(false);
    }
  }

  function remove() {
    setPreview(null);
    onUpload("");
    if (inputRef.current) inputRef.current.value = "";
  }

  const isCircle = shape === "circle";

  return (
    <div className={`space-y-2 ${isCircle ? "flex flex-col items-start" : ""}`}>
      {preview ? (
        <div className={`relative bg-gray-100 overflow-hidden ${isCircle ? "w-24 h-24 rounded-full" : "w-full h-32 rounded-xl"}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="preview" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={remove}
            className={`absolute bg-black/60 hover:bg-black/80 text-white flex items-center justify-center text-sm transition-colors ${isCircle ? "inset-0 rounded-full opacity-0 hover:opacity-100" : "top-2 right-2 rounded-full w-6 h-6"}`}
          >
            ×
          </button>
          {uploading && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <span className="text-white text-xs font-medium">Yükleniyor...</span>
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className={`border-2 border-dashed border-gray-300 hover:border-blue-400 flex flex-col items-center justify-center gap-1.5 text-gray-400 hover:text-blue-500 transition-colors disabled:opacity-50 ${isCircle ? "w-24 h-24 rounded-full" : "w-full h-24 rounded-xl"}`}
        >
          {isCircle ? (
            <>
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="text-xs font-medium text-center leading-tight px-1">Logo Yükle</span>
            </>
          ) : (
            <>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-xs font-medium">Resim Yükle</span>
              <span className="text-xs">JPEG, PNG, WebP — maks 5 MB</span>
            </>
          )}
        </button>
      )}

      {preview && !uploading && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="text-xs text-blue-600 hover:underline"
        >
          {isCircle ? "Logoyu değiştir" : "Resmi değiştir"}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleChange}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
