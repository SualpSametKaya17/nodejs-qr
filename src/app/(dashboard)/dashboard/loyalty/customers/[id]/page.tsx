import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import AdjustPointsForm from "@/components/dashboard/AdjustPointsForm";

type Params = { params: Promise<{ id: string }> };

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

export default async function CustomerDetailPage({ params }: Params) {
  const session = await getSession();
  if (!session) return null;

  const { id } = await params;
  const customerId = Number(id);

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, restaurantId: session.id },
    include: {
      transactions: {
        orderBy: { createdAt: "desc" },
        take: 50,
      },
      _count: { select: { orders: true, transactions: true } },
    },
  });

  if (!customer) notFound();

  return (
    <div>
      {/* Başlık */}
      <div className="mb-6 flex items-center gap-4">
        <Link
          href="/dashboard/loyalty/customers"
          className="text-gray-400 hover:text-gray-600 text-sm"
        >
          ← Müşterilere Dön
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sol Kolon: Müşteri Bilgileri + Puan Ayarı */}
        <div className="space-y-6">
          {/* Profil Kartı */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">👤</span>
              </div>
              <h2 className="text-xl font-bold text-gray-900">{customer.name || "İsimsiz"}</h2>
              <p className="text-gray-500">{customer.phone}</p>
              {customer.email && <p className="text-gray-400 text-sm">{customer.email}</p>}
            </div>

            <div className="border-t border-gray-100 pt-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Durum</span>
                <span className={`font-medium ${customer.isActive ? "text-green-600" : "text-gray-400"}`}>
                  {customer.isActive ? "Aktif" : "Pasif"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Kayıt Tarihi</span>
                <span className="text-gray-700">
                  {new Date(customer.createdAt).toLocaleDateString("tr-TR")}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Toplam Sipariş</span>
                <span className="text-gray-700">{customer._count.orders}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Toplam İşlem</span>
                <span className="text-gray-700">{customer._count.transactions}</span>
              </div>
            </div>
          </div>

          {/* Puan Kartı */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
            <p className="text-sm text-yellow-600 font-medium mb-1">Mevcut Puan</p>
            <p className="text-4xl font-bold text-yellow-700">
              {customer.totalPoints.toLocaleString("tr-TR")}
            </p>
            <p className="text-xs text-yellow-500 mt-1">puan</p>
          </div>

          {/* Puan Düzenleme */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Puan Düzenle</h3>
            <AdjustPointsForm
              customerId={customer.id}
              currentPoints={customer.totalPoints}
            />
          </div>
        </div>

        {/* Sağ Kolon: İşlem Geçmişi */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              İşlem Geçmişi
              <span className="text-sm text-gray-400 font-normal ml-2">
                (Son 50 işlem)
              </span>
            </h3>

            {customer.transactions.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p className="text-3xl mb-2">📋</p>
                <p>Henüz işlem yok.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {customer.transactions.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-start gap-3 p-3 rounded-lg border border-gray-50 hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${typeColors[t.type] ?? "text-gray-600 bg-gray-50"}`}>
                          {typeLabels[t.type] ?? t.type}
                        </span>
                      </div>
                      {t.description && (
                        <p className="text-sm text-gray-500">{t.description}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(t.createdAt).toLocaleString("tr-TR")}
                      </p>
                    </div>
                    <span className={`text-lg font-bold ${t.points > 0 ? "text-green-600" : "text-red-600"}`}>
                      {t.points > 0 ? "+" : ""}{t.points}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
