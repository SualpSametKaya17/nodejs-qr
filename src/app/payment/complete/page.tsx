import { verifyResultToken } from "@/lib/payten";
import Link from "next/link";

interface Props {
  searchParams: Promise<{
    orderId?: string;
    status?: string;
    token?: string;
    msg?: string;
  }>;
}

export default async function PaymentCompletePage({ searchParams }: Props) {
  const { orderId, status, token, msg } = await searchParams;

  const oid = parseInt(orderId ?? "0", 10);
  const isSuccess = status === "success";

  // Token doğrulama
  const valid =
    oid > 0 &&
    token &&
    verifyResultToken(oid, status ?? "", token);

  if (!valid) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-3xl w-full max-w-sm p-8 text-center space-y-4 shadow-lg">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto text-3xl">
            ❌
          </div>
          <h2 className="text-xl font-bold text-gray-900">Geçersiz İstek</h2>
          <p className="text-sm text-gray-500">Bu sayfa geçerli bir ödeme sonucuna ait değil.</p>
          <Link href="/" className="block w-full py-3 rounded-2xl bg-gray-800 text-white text-sm font-semibold">
            Ana Sayfa
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl w-full max-w-sm p-8 text-center space-y-5 shadow-lg">
        {isSuccess ? (
          <>
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto text-4xl">
              ✅
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900">Ödeme Başarılı!</h2>
              <p className="text-sm text-gray-500 mt-1">
                #{oid} numaralı siparişiniz onaylandı.
              </p>
            </div>
            <div className="bg-green-50 rounded-2xl px-4 py-4 text-sm text-green-700 space-y-1">
              <p className="font-semibold">Siparişiniz alındı</p>
              <p className="text-xs text-green-600">
                Ödemeniz tahsil edildi ve siparişiniz hazırlanmaya başladı.
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto text-4xl">
              ❌
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900">Ödeme Başarısız</h2>
              <p className="text-sm text-gray-500 mt-1">
                #{oid} numaralı sipariş tamamlanamadı.
              </p>
            </div>
            {msg && (
              <div className="bg-red-50 rounded-2xl px-4 py-3 text-sm text-red-600">
                {decodeURIComponent(msg)}
              </div>
            )}
            <p className="text-xs text-gray-400">
              Kartınızdan herhangi bir tutar çekilmedi. Lütfen tekrar deneyin.
            </p>
          </>
        )}

        <div className="pt-2 space-y-2">
          <Link
            href="/"
            className="block w-full py-3.5 rounded-2xl bg-gray-900 text-white text-sm font-bold"
          >
            Ana Sayfaya Dön
          </Link>
          {!isSuccess && (
            <button
              onClick={() => window.history.back()}
              className="block w-full py-3 rounded-2xl border border-gray-200 text-gray-600 text-sm font-medium"
            >
              Geri Dön
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
