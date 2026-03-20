import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import AddCustomerForm from "@/components/dashboard/AddCustomerForm";

type SearchParams = Promise<{ page?: string; search?: string; sortBy?: string }>;

export default async function CustomersPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getSession();
  if (!session) return null;

  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? "1"));
  const search = sp.search ?? "";
  const sortBy = sp.sortBy ?? "totalPoints";
  const pageSize = 20;

  const where = {
    restaurantId: session.id,
    ...(search
      ? {
          OR: [
            { phone: { contains: search } },
            { name: { contains: search } },
          ],
        }
      : {}),
  };

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { [sortBy]: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        totalPoints: true,
        isActive: true,
        createdAt: true,
        _count: { select: { transactions: true } },
      },
    }),
    prisma.customer.count({ where }),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Müşteriler</h2>
          <p className="text-gray-500 mt-1">
            {total.toLocaleString("tr-TR")} kayıtlı müşteri
          </p>
        </div>
        <AddCustomerForm />
      </div>

      {/* Arama ve Filtre */}
      <form method="GET" className="mb-6 flex gap-3">
        <input
          type="text"
          name="search"
          defaultValue={search}
          placeholder="Ad veya telefon ara..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          name="sortBy"
          defaultValue={sortBy}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="totalPoints">Puana Göre</option>
          <option value="createdAt">Kayıt Tarihine Göre</option>
          <option value="name">Ada Göre</option>
        </select>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          Ara
        </button>
      </form>

      {/* Tablo */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Müşteri</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Telefon</th>
                <th className="text-right py-3 px-4 text-gray-500 font-medium">Puan</th>
                <th className="text-right py-3 px-4 text-gray-500 font-medium">İşlem</th>
                <th className="text-center py-3 px-4 text-gray-500 font-medium">Durum</th>
                <th className="text-right py-3 px-4 text-gray-500 font-medium">Kayıt</th>
                <th className="text-center py-3 px-4 text-gray-500 font-medium">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    {search ? "Arama sonucu bulunamadı." : "Henüz müşteri yok."}
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <p className="font-medium text-gray-900">{c.name || "İsimsiz"}</p>
                      {c.email && <p className="text-gray-400 text-xs">{c.email}</p>}
                    </td>
                    <td className="py-3 px-4 text-gray-600">{c.phone}</td>
                    <td className="py-3 px-4 text-right">
                      <span className="font-bold text-yellow-600">
                        {c.totalPoints.toLocaleString("tr-TR")}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-gray-500">
                      {c._count.transactions}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        c.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                      }`}>
                        {c.isActive ? "Aktif" : "Pasif"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-gray-400">
                      {new Date(c.createdAt).toLocaleDateString("tr-TR")}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Link
                        href={`/dashboard/loyalty/customers/${c.id}`}
                        className="text-blue-600 hover:underline text-xs font-medium"
                      >
                        Detay
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Sayfalama */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Sayfa {page} / {totalPages}
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  href={`?page=${page - 1}&search=${search}&sortBy=${sortBy}`}
                  className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50"
                >
                  Önceki
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={`?page=${page + 1}&search=${search}&sortBy=${sortBy}`}
                  className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50"
                >
                  Sonraki
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
