"use client";

interface Summary {
  totalScans: number;
  activeQrCodes: number;
  orderCount: number;
  orderRevenue: number;
  menuCount: number;
  itemCount: number;
}

interface QrStat {
  id: number;
  tableNumber: string | null;
  label: string | null;
  scanCount: number;
  isActive: boolean;
}

interface CategoryStat {
  name: string;
  itemCount: number;
}

interface DailyStat {
  date: string;
  count: number;
  revenue: number;
}

interface Order {
  id: number;
  tableNumber: string | null;
  status: string;
  totalAmount: string | number;
  createdAt: string;
}

interface Props {
  summary: Summary;
  qrCodes: QrStat[];
  categories: CategoryStat[];
  daily: DailyStat[];
  recentOrders: Order[];
}

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  PENDING:   { label: "Bekliyor",    cls: "bg-yellow-100 text-yellow-700" },
  CONFIRMED: { label: "Onaylandı",   cls: "bg-blue-100 text-blue-700" },
  PREPARING: { label: "Hazırlanıyor",cls: "bg-orange-100 text-orange-700" },
  READY:     { label: "Hazır",       cls: "bg-teal-100 text-teal-700" },
  DELIVERED: { label: "Teslim Edildi",cls:"bg-green-100 text-green-700" },
  CANCELLED: { label: "İptal",       cls: "bg-red-100 text-red-700" },
};

function StatCard({
  label,
  value,
  sub,
  color = "blue",
  icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  icon: React.ReactNode;
}) {
  const colors: Record<string, string> = {
    blue:   "bg-blue-50 text-blue-600",
    green:  "bg-green-50 text-green-600",
    purple: "bg-purple-50 text-purple-600",
    orange: "bg-orange-50 text-orange-600",
    teal:   "bg-teal-50 text-teal-600",
    pink:   "bg-pink-50 text-pink-600",
  };
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-500">{label}</span>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colors[color]}`}>
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

/** Basit bar chart — sadece CSS, harici kütüphane yok */
function BarChart({ data }: { data: DailyStat[] }) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  // Son 14 günü göster
  const slice = data.slice(-14);

  return (
    <div className="flex items-end gap-1 h-32">
      {slice.map((d) => {
        const h = Math.round((d.count / maxCount) * 100);
        const dateLabel = new Date(d.date + "T12:00:00").toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
        return (
          <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative">
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs rounded px-1.5 py-0.5 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              {dateLabel}: {d.count} sipariş
            </div>
            <div
              className="w-full rounded-t-sm bg-blue-500 hover:bg-blue-600 transition-colors"
              style={{ height: `${Math.max(h, 2)}%` }}
            />
            {slice.length <= 7 && (
              <span className="text-[10px] text-gray-400 truncate w-full text-center">
                {dateLabel.split(" ")[0]}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function AnalyticsClient({
  summary,
  qrCodes,
  categories,
  daily,
  recentOrders,
}: Props) {
  const maxScan = Math.max(...qrCodes.map((c) => c.scanCount), 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analitik</h1>
        <p className="text-sm text-gray-500 mt-1">Son 30 günün özeti</p>
      </div>

      {/* Stat kartları */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Toplam QR Tarama"
          value={summary.totalScans.toLocaleString("tr")}
          sub={`${summary.activeQrCodes} aktif kod`}
          color="blue"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>}
        />
        <StatCard
          label="Toplam Sipariş"
          value={summary.orderCount.toLocaleString("tr")}
          sub="son 30 gün"
          color="green"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
        />
        <StatCard
          label="Ciro"
          value={`₺${summary.orderRevenue.toLocaleString("tr", { minimumFractionDigits: 2 })}`}
          sub="son 30 gün"
          color="purple"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard
          label="Menü Sayısı"
          value={summary.menuCount}
          color="orange"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>}
        />
        <StatCard
          label="Toplam Ürün"
          value={summary.itemCount}
          color="teal"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>}
        />
        <StatCard
          label="Ortalama Sipariş"
          value={summary.orderCount > 0 ? `₺${(summary.orderRevenue / summary.orderCount).toFixed(2)}` : "—"}
          color="pink"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sipariş grafiği */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Günlük Sipariş (Son 14 Gün)</h2>
          {daily.some((d) => d.count > 0) ? (
            <BarChart data={daily} />
          ) : (
            <div className="h-32 flex items-center justify-center text-sm text-gray-400">
              Henüz sipariş yok
            </div>
          )}
        </div>

        {/* QR kod sıralaması */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="font-semibold text-gray-900 mb-4">QR Tarama Sıralaması</h2>
          {qrCodes.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">QR kod yok</p>
          ) : (
            <div className="space-y-3">
              {qrCodes.slice(0, 6).map((c) => (
                <div key={c.id}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-700 font-medium">
                      {c.tableNumber ? `Masa ${c.tableNumber}` : `#${c.id}`}
                      {c.label && <span className="text-gray-400 font-normal ml-1">— {c.label}</span>}
                    </span>
                    <span className="text-gray-500">{c.scanCount} tarama</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div
                      className="bg-blue-500 h-1.5 rounded-full"
                      style={{ width: `${(c.scanCount / maxScan) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Kategori ürün dağılımı */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Kategoriler</h2>
          {categories.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Kategori yok</p>
          ) : (
            <div className="space-y-2">
              {categories.map((c) => {
                const maxItems = Math.max(...categories.map((x) => x.itemCount), 1);
                return (
                  <div key={c.name} className="flex items-center gap-3">
                    <span className="text-sm text-gray-600 w-32 truncate shrink-0">{c.name}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-purple-400 h-2 rounded-full"
                        style={{ width: `${(c.itemCount / maxItems) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-500 w-8 text-right shrink-0">{c.itemCount}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Son siparişler */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Son Siparişler</h2>
          {recentOrders.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Sipariş yok</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentOrders.map((o) => {
                const st = STATUS_LABEL[o.status] ?? { label: o.status, cls: "bg-gray-100 text-gray-600" };
                return (
                  <div key={o.id} className="flex items-center justify-between py-2.5">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {o.tableNumber ? `Masa ${o.tableNumber}` : `#${o.id}`}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(o.createdAt).toLocaleString("tr-TR", {
                          day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${st.cls}`}>
                        {st.label}
                      </span>
                      <span className="text-sm font-semibold text-gray-900">
                        ₺{Number(o.totalAmount).toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
