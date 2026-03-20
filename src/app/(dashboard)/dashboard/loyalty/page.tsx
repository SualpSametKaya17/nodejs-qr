import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import LoyaltyProgramForm from "@/components/dashboard/LoyaltyProgramForm";
import Link from "next/link";

export default async function LoyaltyPage() {
  const session = await getSession();
  if (!session) return null;

  let program = await prisma.loyaltyProgram.findUnique({
    where: { restaurantId: session.id },
  });

  if (!program) {
    program = await prisma.loyaltyProgram.create({
      data: { restaurantId: session.id },
    });
  }

  const [totalCustomers, activeCustomers, recentTransactions, topCustomers] = await Promise.all([
    prisma.customer.count({ where: { restaurantId: session.id } }),
    prisma.customer.count({ where: { restaurantId: session.id, isActive: true } }),
    prisma.loyaltyTransaction.findMany({
      where: { restaurantId: session.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { customer: { select: { name: true, phone: true } } },
    }),
    prisma.customer.findMany({
      where: { restaurantId: session.id, isActive: true },
      orderBy: { totalPoints: "desc" },
      take: 5,
      select: { id: true, name: true, phone: true, totalPoints: true },
    }),
  ]);

  const typeLabels: Record<string, string> = {
    EARN: "Puan Kazanma",
    REDEEM: "Puan Kullanma",
    MANUAL_ADD: "Manuel Ekleme",
    MANUAL_SUB: "Manuel Çıkarma",
    WELCOME: "Hoş Geldin Bonusu",
    EXPIRE: "Süre Doldu",
  };

  const typeColors: Record<string, string> = {
    EARN: "text-green-600 bg-green-50",
    REDEEM: "text-red-600 bg-red-50",
    MANUAL_ADD: "text-blue-600 bg-blue-50",
    MANUAL_SUB: "text-orange-600 bg-orange-50",
    WELCOME: "text-purple-600 bg-purple-50",
    EXPIRE: "text-gray-600 bg-gray-50",
  };

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Sadakat Programı</h2>
        <p className="text-gray-500 mt-1">Program ayarları ve istatistikler</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500">Toplam Müşteri</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{totalCustomers.toLocaleString("tr-TR")}</p>
          <p className="text-sm text-gray-400 mt-1">{activeCustomers} aktif</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500">Program Durumu</p>
          <p className="text-3xl font-bold mt-1">
            <span className={program.isActive ? "text-green-600" : "text-gray-400"}>
              {program.isActive ? "Aktif" : "Pasif"}
            </span>
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {program.pointsPerUnit} puan / sipariş birimi
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500">Min. Kullanım Eşiği</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            {program.minimumRedeemPoints.toLocaleString("tr-TR")}
          </p>
          <p className="text-sm text-gray-400 mt-1">puan</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Program Ayarları */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Program Ayarları</h3>
          <LoyaltyProgramForm program={program} />
        </div>

        {/* En Çok Puana Sahip Müşteriler */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">En İyi Müşteriler</h3>
            <Link
              href="/dashboard/loyalty/customers"
              className="text-sm text-blue-600 hover:underline"
            >
              Tümünü gör
            </Link>
          </div>
          {topCustomers.length === 0 ? (
            <p className="text-gray-400 text-sm">Henüz müşteri yok.</p>
          ) : (
            <div className="space-y-3">
              {topCustomers.map((c, i) => (
                <Link
                  key={c.id}
                  href={`/dashboard/loyalty/customers/${c.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <span className="text-lg font-bold text-gray-300 w-6">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{c.name || "İsimsiz"}</p>
                    <p className="text-sm text-gray-500">{c.phone}</p>
                  </div>
                  <span className="font-bold text-yellow-600">{c.totalPoints.toLocaleString("tr-TR")} puan</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Son İşlemler */}
      <div className="mt-6 bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Son İşlemler</h3>
        {recentTransactions.length === 0 ? (
          <p className="text-gray-400 text-sm">Henüz işlem yok.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Müşteri</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">İşlem</th>
                  <th className="text-right py-2 px-3 text-gray-500 font-medium">Puan</th>
                  <th className="text-right py-2 px-3 text-gray-500 font-medium">Tarih</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.map((t) => (
                  <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 px-3">
                      <p className="font-medium text-gray-900">{t.customer.name || "İsimsiz"}</p>
                      <p className="text-gray-400">{t.customer.phone}</p>
                    </td>
                    <td className="py-2 px-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${typeColors[t.type] ?? "text-gray-600 bg-gray-50"}`}>
                        {typeLabels[t.type] ?? t.type}
                      </span>
                      {t.description && (
                        <p className="text-gray-400 text-xs mt-0.5">{t.description}</p>
                      )}
                    </td>
                    <td className={`py-2 px-3 text-right font-semibold ${t.points > 0 ? "text-green-600" : "text-red-600"}`}>
                      {t.points > 0 ? "+" : ""}{t.points}
                    </td>
                    <td className="py-2 px-3 text-right text-gray-400">
                      {new Date(t.createdAt).toLocaleDateString("tr-TR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
