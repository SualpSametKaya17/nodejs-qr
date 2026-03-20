"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";

interface Restaurant {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
}

interface Props {
  restaurants: Restaurant[];
  selectedId: number | null;
}

export function RestaurantSelectorBar({ restaurants, selectedId }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const id = e.target.value;
      // Cookie'yi güncelle (proxy bunu okuyacak)
      document.cookie = `superadmin_target_restaurant=${id}; path=/; max-age=86400; SameSite=Lax`;

      // URL'yi güncelle (server page yeniden render için)
      const params = new URLSearchParams(searchParams.toString());
      params.set("restaurantId", id);
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 lg:px-6 py-2 flex items-center gap-3">
      <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide shrink-0">
        Süper Admin
      </span>
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <svg className="w-4 h-4 text-amber-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
        <select
          value={selectedId ?? ""}
          onChange={handleChange}
          className="text-sm border border-amber-300 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 min-w-0 flex-1 max-w-xs"
        >
          {restaurants.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name} — {r.email}{!r.isActive ? " (pasif)" : ""}
            </option>
          ))}
        </select>
      </div>
      <span className="text-xs text-amber-600 shrink-0">
        {restaurants.length} restoran
      </span>
    </div>
  );
}
