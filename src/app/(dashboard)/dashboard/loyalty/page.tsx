import { requireSession } from "@/lib/session";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ restaurantId?: string }>;
}

async function getEffectiveId(
  sessionId: number,
  role: string,
  searchParams: { restaurantId?: string }
) {
  if (role !== "superadmin") return sessionId;
  if (searchParams.restaurantId)
    return parseInt(searchParams.restaurantId, 10);
  const cookieStore = await cookies();
  const c = cookieStore.get("superadmin_target_restaurant")?.value;
  return c && !isNaN(parseInt(c, 10)) ? parseInt(c, 10) : sessionId;
}

const SEGMENT_LABELS: Record<string, string> = {
  new: "Yeni",
  regular: "Düzenli",
  vip: "VIP",
  inactive: "Pasif",
};

const SEGMENT_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  regular: "bg-green-100 text-green-700",
  vip: "bg-purple-100 text-purple-700",
  inactive: "bg-gray-100 text-gray-500",
};

export default async function LoyaltyPage({ searchParams }: Props) {
  const session = await requireSession();
  const sp = await searchParams;
  const restaurantId = await getEffectiveId(session.id, session.role, sp);

  const [restaurant, customers] = await Promise.all([
    prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { loyaltyEnabled: true, pointsPerTL: true, pointValueTL: true },
    }),
    prisma.customer.findMany({
      where: { restaurantId, isActive: true },
      orderBy: { points: "desc" },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        points: true,
        totalSpent: true,
        orderCount: true,
        segment: true,
        createdAt: true,
      },
    }),
  ]);

  const totalPoints = customers.reduce((s, c) => s + c.points, 0);
  const totalCustomers = customers.length;
  const avgPoints =
    totalCustomers > 0 ? Math.round(totalPoints / totalCustomers) : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Başlık */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Sadakat Programı</h1>
        <p className="text-sm text-gray-500 mt-1">
          Müşteri puanlarını ve sadakat geçmişini yönetin
        </p>
      </div>

      {/* Sadakat kapalıysa uyarı */}
      {!restaurant?.loyaltyEnabled && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
          <svg
            className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
            />
          </svg>
          <div>
            <p className="text-sm font-medium text-yellow-800">
              Sadakat programı kapalı
            </p>
            <p className="text-xs text-yellow-600 mt-0.5">
              Müşterilerin puan kazanması için{" "}
              <Link
                href="/dashboard/settings"
                className="underline font-medium"
              >
                Ayarlar
              </Link>{" "}
              sayfasından sadakat programını etkinleştirin.
            </p>
          </div>
        </div>
      )}

      {/* Özet kartlar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
            Toplam Müşteri
          </p>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            {totalCustomers}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
            Toplam Puan
          </p>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            {totalPoints.toLocaleString("tr-TR")}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
            Ortalama Puan
          </p>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            {avgPoints.toLocaleString("tr-TR")}
          </p>
        </div>
      </div>

      {/* Müşteri listesi */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Müşteriler</h2>
        </div>
        {customers.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-400 text-sm">
            Henüz kayıtlı müşteri yok.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-3 text-left font-medium">Müşteri</th>
                  <th className="px-6 py-3 text-left font-medium">Telefon</th>
                  <th className="px-6 py-3 text-right font-medium">Puan</th>
                  <th className="px-6 py-3 text-right font-medium">Sipariş</th>
                  <th className="px-6 py-3 text-right font-medium">
                    Top. Harcama
                  </th>
                  <th className="px-6 py-3 text-left font-medium">Segment</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {customers.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-3">
                      <div className="font-medium text-gray-900">
                        {c.name ?? "—"}
                      </div>
                      {c.email && (
                        <div className="text-xs text-gray-400">{c.email}</div>
                      )}
                    </td>
                    <td className="px-6 py-3 text-gray-600">{c.phone}</td>
                    <td className="px-6 py-3 text-right font-semibold text-gray-900">
                      {c.points.toLocaleString("tr-TR")}
                    </td>
                    <td className="px-6 py-3 text-right text-gray-600">
                      {c.orderCount}
                    </td>
                    <td className="px-6 py-3 text-right text-gray-600">
                      {Number(c.totalSpent).toLocaleString("tr-TR", {
                        style: "currency",
                        currency: "TRY",
                      })}
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          SEGMENT_COLORS[c.segment] ?? "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {SEGMENT_LABELS[c.segment] ?? c.segment}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <Link
                        href={`/dashboard/loyalty/customers/${c.id}`}
                        className="text-blue-600 hover:underline text-xs font-medium"
                      >
                        Detay
                      </Link>
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
