import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/dashboard/StatCard";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await requireSession();

  const [menuCount, qrCount, orderStats, recentOrders] = await Promise.all([
    prisma.menu.count({ where: { restaurantId: session.id, isActive: true } }),
    prisma.qrCode.count({ where: { restaurantId: session.id, isActive: true } }),
    prisma.order.groupBy({
      by: ["status"],
      where: { restaurantId: session.id },
      _count: true,
    }),
    prisma.order.findMany({
      where: { restaurantId: session.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        tableNumber: true,
        status: true,
        totalAmount: true,
        createdAt: true,
      },
    }),
  ]);

  const totalOrders = orderStats.reduce((sum, s) => sum + s._count, 0);
  const pendingOrders = orderStats.find((s) => s.status === "PENDING")?._count ?? 0;

  const STATUS_LABEL: Record<string, string> = {
    PENDING: "Bekliyor",
    CONFIRMED: "Onaylandı",
    PREPARING: "Hazırlanıyor",
    READY: "Hazır",
    DELIVERED: "Teslim Edildi",
    CANCELLED: "İptal",
  };

  const STATUS_COLOR: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-700",
    CONFIRMED: "bg-blue-100 text-blue-700",
    PREPARING: "bg-orange-100 text-orange-700",
    READY: "bg-green-100 text-green-700",
    DELIVERED: "bg-gray-100 text-gray-600",
    CANCELLED: "bg-red-100 text-red-600",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Genel Bakış</h1>
        <p className="text-sm text-gray-500 mt-1">Hoş geldiniz, {session.name}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Aktif Menü"
          value={menuCount}
          description="Yayında olan menüler"
          color="blue"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
        />
        <StatCard
          title="QR Kod"
          value={qrCount}
          description="Aktif QR kodlar"
          color="purple"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
          }
        />
        <StatCard
          title="Toplam Sipariş"
          value={totalOrders}
          description="Tüm siparişler"
          color="green"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          }
        />
        <StatCard
          title="Bekleyen Sipariş"
          value={pendingOrders}
          description="Yanıt bekliyor"
          color="orange"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* Hızlı erişim */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/dashboard/menu"
          className="bg-white border border-gray-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-sm transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 group-hover:bg-blue-100 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-gray-900">Menüye Ürün Ekle</p>
              <p className="text-sm text-gray-500">Kategori ve ürün yönetimi</p>
            </div>
          </div>
        </Link>

        <Link
          href="/dashboard/qr-codes"
          className="bg-white border border-gray-200 rounded-xl p-5 hover:border-purple-300 hover:shadow-sm transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center text-purple-600 group-hover:bg-purple-100 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-gray-900">QR Kod Oluştur</p>
              <p className="text-sm text-gray-500">Masa için QR kod üret</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Son siparişler */}
      <div className="bg-white border border-gray-200 rounded-xl">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Son Siparişler</h2>
          <Link href="/dashboard/orders" className="text-sm text-blue-600 hover:underline">
            Tümünü gör
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div className="px-5 py-10 text-center text-gray-400 text-sm">
            Henüz sipariş yok.
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {recentOrders.map((order) => (
              <div key={order.id} className="px-4 sm:px-5 py-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm text-gray-500 shrink-0">#{order.id}</span>
                  <span className="text-sm text-gray-700 truncate">
                    {order.tableNumber ? `Masa ${order.tableNumber}` : "Masa belirtilmedi"}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[order.status]}`}>
                    {STATUS_LABEL[order.status]}
                  </span>
                  <span className="text-sm font-medium text-gray-900">
                    ₺{Number(order.totalAmount).toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
