"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";

interface Modifier {
  id: number;
  name: string;
  price: number | string;
  isDefault: boolean;
}

interface ModifierGroup {
  id: number;
  name: string;
  type: string;
  required: boolean;
  modifiers: Modifier[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  itemId: number;
  itemName: string;
}

export function ModifiersModal({ open, onClose, itemId, itemName }: Props) {
  const [groups, setGroups] = useState<ModifierGroup[]>([]);
  const [loading, setLoading] = useState(false);

  // Yeni grup formu
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupType, setNewGroupType] = useState("multiple");
  const [newGroupRequired, setNewGroupRequired] = useState(false);
  const [addingGroup, setAddingGroup] = useState(false);

  // Yeni seçenek formları (her grup için)
  const [newModifier, setNewModifier] = useState<Record<number, { name: string; price: string }>>({});
  const [addingModifier, setAddingModifier] = useState<number | null>(null);

  async function fetchGroups() {
    setLoading(true);
    try {
      const res = await fetch(`/api/items/${itemId}/modifier-groups`);
      const json = await res.json();
      if (json.success) setGroups(json.data.groups);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open) fetchGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, itemId]);

  async function handleAddGroup() {
    if (!newGroupName.trim()) return;
    setAddingGroup(true);
    try {
      const res = await fetch(`/api/items/${itemId}/modifier-groups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newGroupName.trim(), type: newGroupType, required: newGroupRequired }),
      });
      const json = await res.json();
      if (json.success) {
        setGroups((prev) => [...prev, { ...json.data.group, modifiers: [] }]);
        setNewGroupName("");
        setNewGroupType("multiple");
        setNewGroupRequired(false);
      }
    } finally {
      setAddingGroup(false);
    }
  }

  async function handleDeleteGroup(groupId: number) {
    if (!confirm("Grup ve tüm seçenekleri silinecek. Devam et?")) return;
    const res = await fetch(`/api/modifier-groups/${groupId}`, { method: "DELETE" });
    const json = await res.json();
    if (json.success) setGroups((prev) => prev.filter((g) => g.id !== groupId));
  }

  async function handleAddModifier(groupId: number) {
    const form = newModifier[groupId];
    if (!form?.name?.trim()) return;
    setAddingModifier(groupId);
    try {
      const res = await fetch(`/api/modifier-groups/${groupId}/modifiers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name.trim(), price: parseFloat(form.price || "0") || 0 }),
      });
      const json = await res.json();
      if (json.success) {
        setGroups((prev) =>
          prev.map((g) => g.id === groupId ? { ...g, modifiers: [...g.modifiers, json.data.modifier] } : g)
        );
        setNewModifier((prev) => ({ ...prev, [groupId]: { name: "", price: "" } }));
      }
    } finally {
      setAddingModifier(null);
    }
  }

  async function handleDeleteModifier(groupId: number, modifierId: number) {
    const res = await fetch(`/api/modifiers/${modifierId}`, { method: "DELETE" });
    const json = await res.json();
    if (json.success) {
      setGroups((prev) =>
        prev.map((g) => g.id === groupId ? { ...g, modifiers: g.modifiers.filter((m) => m.id !== modifierId) } : g)
      );
    }
  }

  async function toggleRequired(group: ModifierGroup) {
    const res = await fetch(`/api/modifier-groups/${group.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ required: !group.required }),
    });
    const json = await res.json();
    if (json.success) {
      setGroups((prev) => prev.map((g) => g.id === group.id ? { ...g, required: !g.required } : g));
    }
  }

  async function toggleType(group: ModifierGroup) {
    const newType = group.type === "single" ? "multiple" : "single";
    const res = await fetch(`/api/modifier-groups/${group.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: newType }),
    });
    const json = await res.json();
    if (json.success) {
      setGroups((prev) => prev.map((g) => g.id === group.id ? { ...g, type: newType } : g));
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Seçenekler — ${itemName}`}>
      <div className="space-y-5 max-h-[65vh] overflow-y-auto pr-1">
        {loading && <p className="text-sm text-gray-400 text-center py-4">Yükleniyor...</p>}

        {/* Mevcut gruplar */}
        {groups.map((group) => (
          <div key={group.id} className="border border-gray-200 rounded-xl overflow-hidden">
            {/* Grup header */}
            <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 border-b border-gray-100">
              <span className="font-semibold text-sm text-gray-800 flex-1 truncate">{group.name}</span>
              <button
                onClick={() => toggleType(group)}
                className={`text-xs px-2 py-0.5 rounded-full font-medium border transition-colors ${
                  group.type === "single"
                    ? "bg-purple-50 text-purple-700 border-purple-200"
                    : "bg-blue-50 text-blue-700 border-blue-200"
                }`}
              >
                {group.type === "single" ? "Tek seçim" : "Çoklu"}
              </button>
              <button
                onClick={() => toggleRequired(group)}
                className={`text-xs px-2 py-0.5 rounded-full font-medium border transition-colors ${
                  group.required
                    ? "bg-orange-50 text-orange-700 border-orange-200"
                    : "bg-gray-100 text-gray-500 border-gray-200"
                }`}
              >
                {group.required ? "Zorunlu" : "Opsiyonel"}
              </button>
              <button
                onClick={() => handleDeleteGroup(group.id)}
                className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>

            {/* Seçenekler */}
            <div className="divide-y divide-gray-50">
              {group.modifiers.map((mod) => (
                <div key={mod.id} className="flex items-center px-3 py-2 gap-2">
                  <span className="flex-1 text-sm text-gray-700">{mod.name}</span>
                  {Number(mod.price) > 0 && (
                    <span className="text-xs text-green-600 font-medium">+₺{Number(mod.price).toFixed(2)}</span>
                  )}
                  <button
                    onClick={() => handleDeleteModifier(group.id, mod.id)}
                    className="p-1 text-gray-300 hover:text-red-500 rounded transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}

              {/* Yeni seçenek ekle */}
              <div className="px-3 py-2 flex items-center gap-2">
                <input
                  value={newModifier[group.id]?.name ?? ""}
                  onChange={(e) => setNewModifier((p) => ({ ...p, [group.id]: { ...p[group.id], name: e.target.value } }))}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddModifier(group.id))}
                  placeholder="Seçenek adı (ör: Soğansız)"
                  className="flex-1 text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <input
                  value={newModifier[group.id]?.price ?? ""}
                  onChange={(e) => setNewModifier((p) => ({ ...p, [group.id]: { ...p[group.id], price: e.target.value } }))}
                  placeholder="+₺"
                  type="number"
                  min="0"
                  step="0.5"
                  className="w-20 text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <button
                  onClick={() => handleAddModifier(group.id)}
                  disabled={addingModifier === group.id}
                  className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex-shrink-0"
                >
                  {addingModifier === group.id ? "..." : "Ekle"}
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Yeni grup ekle */}
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 space-y-3">
          <p className="text-sm font-medium text-gray-600">+ Yeni Seçenek Grubu Ekle</p>
          <input
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddGroup())}
            placeholder="Grup adı (ör: İçerik Seçenekleri)"
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-3 flex-wrap">
            <select
              value={newGroupType}
              onChange={(e) => setNewGroupType(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="multiple">Çoklu seçim</option>
              <option value="single">Tek seçim</option>
            </select>
            <label className="flex items-center gap-1.5 cursor-pointer text-sm text-gray-700">
              <input
                type="checkbox"
                checked={newGroupRequired}
                onChange={(e) => setNewGroupRequired(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-gray-300"
              />
              Zorunlu
            </label>
            <button
              onClick={handleAddGroup}
              disabled={addingGroup || !newGroupName.trim()}
              className="ml-auto px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {addingGroup ? "Ekleniyor..." : "Grup Ekle"}
            </button>
          </div>
        </div>

        {!loading && groups.length === 0 && (
          <p className="text-sm text-gray-400 text-center pb-2">
            Henüz seçenek grubu yok. Yukarıdan ekleyin.
          </p>
        )}
      </div>
    </Modal>
  );
}
