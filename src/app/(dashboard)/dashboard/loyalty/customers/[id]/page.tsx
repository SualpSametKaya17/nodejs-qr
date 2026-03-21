import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

const TYPE_LABELS: Record<string, string> = {
  earn: "Puan Kazanıldı",
  redeem: "Puan Kullanıldı",
  adjust: "Manuel Düzeltme",
  expire: "Süre Doldu",
};

const TYPE_COLORS: Record<string, string> = {
  earn: "text-green-600",
  redeem: "text-red-500",
  adjust: "text-blue-500",
  expire: "text-gray-400",
};

export default async function CustomerDetailPage({ params }: Props) {
  const session = await requireSession();
  const { id } = await params;
  const customerId = parseInt(id, 10);

  if (isNaN(customerId)) notFound();

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
    <div className="p-6 space-y-6">
      {/* Geri dön */}
      <div>
        <Link
          href="/dashboard/loyalty"
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Sadakat Programı
        </Link>
      </div>

      {/* Müşteri bilgileri */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {customer.name ?? "İsimsiz Müşteri"}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">{customer.phone}</p>
            {customer.email && (
              <p className="text-sm text-gray-500">{customer.email}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-blue-600">
              {customer.points.toLocaleString("tr-TR")}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">mevcut puan</p>
          </div>
        </div>

        {/* İstatistikler */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-100">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider">
              Sipariş
            </p>
            <p className="text-xl font-semibold text-gray-900 mt-0.5">
              {customer._count.orders}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider">
              İşlem
            </p>
            <p className="text-xl font-semibold text-gray-900 mt-0.5">
              {customer._count.transactions}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider">
              Top. Harcama
            </p>
            <p className="text-xl font-semibold text-gray-900 mt-0.5">
              {Number(customer.totalSpent).toLocaleString("tr-TR", {
                style: "currency",
                currency: "TRY",
              })}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider">
              Kayıt Tarihi
            </p>
            <p className="text-sm font-medium text-gray-900 mt-0.5">
              {new Date(customer.createdAt).toLocaleDateString("tr-TR")}
            </p>
          </div>
        </div>
      </div>

      {/* İşlem geçmişi */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Puan Geçmişi</h2>
        </div>
        {customer.transactions.length === 0 ? (
          <div className="px-6 py-10 text-center text-gray-400 text-sm">
            Henüz puan işlemi yok.
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {customer.transactions.map((tx) => (
              <li
                key={tx.id}
                className="flex items-center justify-between px-6 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {TYPE_LABELS[tx.type] ?? tx.type}
                  </p>
                  {tx.description && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {tx.description}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(tx.createdAt).toLocaleString("tr-TR")}
                  </p>
                </div>
                <span
                  className={`text-sm font-semibold ${
                    TYPE_COLORS[tx.type] ?? "text-gray-600"
                  }`}
                >
                  {tx.points > 0 ? "+" : ""}
                  {tx.points.toLocaleString("tr-TR")} puan
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
