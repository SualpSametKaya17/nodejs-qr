"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { generateQRDataUrl } from "@/lib/qr";

interface QRCode {
  id: number;
  tableNumber: string | null;
  label: string | null;
  url: string;
  scanCount: number;
  isActive: boolean;
  createdAt: string | Date;
  menu: { id: number; name: string } | null;
}

interface Menu {
  id: number;
  name: string;
}

interface Props {
  initialCodes: QRCode[];
  menus: Menu[];
  restaurantId: number;
}

export function QRCodesClient({ initialCodes, menus, restaurantId }: Props) {
  const [codes, setCodes] = useState<QRCode[]>(initialCodes);
  const [createOpen, setCreateOpen] = useState(false);
  const [previewCode, setPreviewCode] = useState<QRCode | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  async function loadCodes() {
    const res = await fetch("/api/qr-codes");
    const json = await res.json();
    if (json.success) setCodes(json.data.codes);
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreateError("");
    setCreating(true);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/qr-codes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        menuId: parseInt(form.get("menuId") as string, 10),
        tableNumber: form.get("tableNumber"),
        label: form.get("label"),
      }),
    });
    const json = await res.json();
    setCreating(false);
    if (!json.success) { setCreateError(json.error); return; }
    await loadCodes();
    setCreateOpen(false);
  }

  async function handleDelete(id: number) {
    if (!confirm("QR kod silinecek. Devam et?")) return;
    await fetch(`/api/qr-codes/${id}`, { method: "DELETE" });
    await loadCodes();
  }

  async function handleToggle(code: QRCode) {
    await fetch(`/api/qr-codes/${code.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !code.isActive }),
    });
    await loadCodes();
  }

  async function handleDownload(code: QRCode) {
    const dataUrl = await generateQRDataUrl(code.url);
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `qr-masa-${code.tableNumber ?? code.id}.png`;
    a.click();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">QR Kodlar</h1>
          <p className="text-sm text-gray-500 mt-1">Masalar için QR kod oluştur ve yönet</p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors sm:w-auto w-full"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Yeni QR Kod
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {[
          { label: "Toplam Kod", value: codes.length },
          { label: "Aktif", value: codes.filter((c) => c.isActive).length },
          { label: "Toplam Tarama", value: codes.reduce((s, c) => s + c.scanCount, 0) },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Liste */}
      {codes.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-xl py-16 text-center">
          <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
          </svg>
          <p className="text-gray-400 text-sm">Henüz QR kod yok.</p>
          <button onClick={() => setCreateOpen(true)} className="mt-2 text-sm text-blue-600 hover:underline">
            İlk QR kodu oluştur
          </button>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3 font-medium text-gray-500">QR / Masa</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Menü</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Tarama</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Durum</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {codes.map((code) => (
                <tr key={code.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      {/* Mini QR önizleme */}
                      <button
                        onClick={() => setPreviewCode(code)}
                        className="w-10 h-10 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0 hover:border-blue-400 transition-colors"
                        title="Önizle"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`/api/qr-codes/${code.id}/svg`}
                          alt="qr"
                          className="w-full h-full"
                        />
                      </button>
                      <div>
                        <p className="font-medium text-gray-900">
                          {code.tableNumber ? `Masa ${code.tableNumber}` : `#${code.id}`}
                        </p>
                        {code.label && <p className="text-xs text-gray-400">{code.label}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-600">{code.menu?.name ?? "—"}</td>
                  <td className="px-5 py-3 text-gray-600">{code.scanCount}</td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => handleToggle(code)}
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        code.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {code.isActive ? "Aktif" : "Pasif"}
                    </button>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => setPreviewCode(code)}
                        title="Önizle"
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDownload(code)}
                        title="İndir"
                        className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(code.id)}
                        title="Sil"
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Yeni QR Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Yeni QR Kod Oluştur">
        <form onSubmit={handleCreate} className="space-y-4">
          {createError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {createError}
            </p>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Menü *</label>
            <select
              name="menuId"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {menus.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Masa Numarası</label>
            <input
              name="tableNumber"
              placeholder="Örn: 5"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Etiket</label>
            <input
              name="label"
              placeholder="Örn: Bahçe - Masa 5"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={creating}
              className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {creating ? "Oluşturuluyor..." : "Oluştur"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Önizleme Modal */}
      <Modal
        open={!!previewCode}
        onClose={() => setPreviewCode(null)}
        title={previewCode ? `QR — ${previewCode.tableNumber ? `Masa ${previewCode.tableNumber}` : `#${previewCode.id}`}` : ""}
      >
        {previewCode && (
          <div className="flex flex-col items-center gap-4">
            <div className="w-56 h-56 border border-gray-200 rounded-xl overflow-hidden p-3 bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/qr-codes/${previewCode.id}/svg`}
                alt="QR Code"
                className="w-full h-full"
              />
            </div>
            {previewCode.label && (
              <p className="text-sm text-gray-500">{previewCode.label}</p>
            )}
            <p className="text-xs text-gray-400 break-all text-center">{previewCode.url}</p>
            <button
              onClick={() => handleDownload(previewCode)}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              PNG İndir (512×512)
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
