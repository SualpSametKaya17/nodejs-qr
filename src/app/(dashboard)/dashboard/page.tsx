import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) return null;

  const [customerCount, totalPoints, transactionCount, program] = await Promise.all([
    prisma.customer.count({ where: { restaurantId: session.id } }),
    prisma.customer.aggregate({
      where: { restaurantId: session.id },
      _sum: { totalPoints: true },
    }),
    prisma.loyaltyTransaction.count({ where: { restaurantId: session.id } }),
    prisma.loyaltyProgram.findUnique({ where: { restaurantId: session.id } }),
  ]);

  const stats = [
    {
      label: "Kayıtlı Müşteri",
      value: customerCount.toLocaleString("tr-TR"),
      href: "/dashboard/loyalty/customers",
      color: "blue",
      icon: "👥",
    },
    {
      label: "Toplam Dağıtılan Puan",
      value: (totalPoints._sum.totalPoints ?? 0).toLocaleString("tr-TR"),
      href: "/dashboard/loyalty",
      color: "yellow",
      icon: "⭐",
    },
    {
      label: "Toplam İşlem",
      value: transactionCount.toLocaleString("tr-TR"),
      href: "/dashboard/loyalty",
      color: "green",
      icon: "📋",
    },
    {
      label: "Program Durumu",
      value: program?.isActive ? "Aktif" : program ? "Pasif" : "Kurulmadı",
      href: "/dashboard/loyalty",
      color: program?.isActive ? "green" : "gray",
      icon: "🔧",
    },
  ];

  const colorMap: Record<string, string> = {
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    yellow: "bg-yellow-50 text-yellow-700 border-yellow-100",
    green: "bg-green-50 text-green-700 border-green-100",
    gray: "bg-gray-50 text-gray-600 border-gray-100",
  };

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Genel Bakış</h2>
        <p className="text-gray-500 mt-1">Sadakat programınızın özet istatistikleri</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className={`block rounded-xl border p-6 hover:shadow-md transition-shadow ${colorMap[stat.color]}`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">{stat.icon}</span>
            </div>
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-sm mt-1 opacity-75">{stat.label}</p>
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Hızlı Erişim</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            href="/dashboard/loyalty"
            className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
          >
            <span className="text-xl">⚙️</span>
            <div>
              <p className="font-medium text-gray-900">Program Ayarları</p>
              <p className="text-sm text-gray-500">Puan kurallarını düzenle</p>
            </div>
          </Link>
          <Link
            href="/dashboard/loyalty/customers"
            className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
          >
            <span className="text-xl">👤</span>
            <div>
              <p className="font-medium text-gray-900">Müşteri Ekle</p>
              <p className="text-sm text-gray-500">Yeni müşteri kaydet</p>
            </div>
          </Link>
          <Link
            href="/dashboard/loyalty/customers"
            className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
          >
            <span className="text-xl">🎯</span>
            <div>
              <p className="font-medium text-gray-900">Puan Düzenle</p>
              <p className="text-sm text-gray-500">Müşteri puanlarını yönet</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
