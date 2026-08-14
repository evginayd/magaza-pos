"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { API } from "@/lib/api";

type ExpenseRow = {
  id: number;
  category: string;
  amount: number;
  note?: string | null;
};

type DailyReport = {
  date: string;
  cashTotal: number;
  cardTotal: number;
  total: number;
  itemCount: number;
  expenses: ExpenseRow[];
  expensesTotal: number;
  expectedCash: number;
};

type SaleItemRow = {
  id: number;
  label: string;
  unitPrice: number;
  quantity: number;
};

type SaleRow = {
  id: number;
  soldAt: string;
  cashAmount: number;
  cardAmount: number;
  items: SaleItemRow[];
};

const tl = (n: number) => "₺" + n.toLocaleString("tr-TR");

// Fişin kalemlerini nakit/kart olarak böler.
// Kural: sırayla önce nakit dolar, taşan kısım karta geçer.
// (Tamamı nakit / tamamı kart fişler de bu kuralın özel hali olur.)
function splitPayment(sale: SaleRow) {
  let cashLeft = sale.cashAmount;
  return sale.items.map((it) => {
    const lineTotal = it.unitPrice * it.quantity;
    const cash = Math.min(cashLeft, lineTotal);
    cashLeft -= cash;
    return { ...it, cash, card: lineTotal - cash };
  });
}

const trDate = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

export default function RaporPage() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [report, setReport] = useState<DailyReport | null>(null);
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let ignore = false;

    Promise.all([
      fetch(`${API}/api/reports/daily?date=${date}`).then((r) => {
        if (!r.ok) throw new Error(`API hatası: ${r.status}`);
        return r.json();
      }),
      fetch(`${API}/api/sales?date=${date}`).then((r) => {
        if (!r.ok) throw new Error(`API hatası: ${r.status}`);
        return r.json();
      }),
    ])
      .then(([rep, sls]) => {
        if (!ignore) {
          setReport(rep);
          setSales(sls);
          setError(null);
        }
      })
      .catch((e) => {
        if (!ignore) setError(e.message);
      });

    return () => {
      ignore = true;
    };
  }, [date, refreshKey]);

  async function deleteSale(id: number) {
    if (!confirm("Bu satışın tamamı silinecek. Emin misin?")) return;
    try {
      const r = await fetch(`${API}/api/sales/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error(`Silinemedi: ${r.status}`);
      setRefreshKey((k) => k + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bağlantı hatası");
    }
  }

  const loading = !error && report?.date !== date;

  return (
    <main className="mx-auto max-w-md">
      {/* yeşil başlık */}
      <header className="rounded-b-3xl bg-gradient-to-br from-emerald-600 to-green-500 px-5 pb-10 pt-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Gün Sonu</h1>
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20 text-xl">
            📅
          </span>
        </div>
      </header>

      <div className="-mt-6 px-5">
        {/* tarih */}
        <div className="mb-4 flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
          <span className="text-xl">📅</span>
          <span className="flex-1 font-bold">{trDate(date)}</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-8 cursor-pointer text-transparent outline-none"
          />
        </div>

        {/* aylık rapor sayfasına giriş */}
        <Link
          href="/analiz"
          className="mb-4 flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm active:bg-emerald-50"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-xl">
            📈
          </span>
          <span className="flex-1">
            <span className="block font-bold">Aylık Rapor</span>
            <span className="block text-sm text-slate-400">
              Ürün bazlı satış ve grafikler
            </span>
          </span>
          <span className="text-2xl text-emerald-600">›</span>
        </Link>

        {error && (
          <p className="rounded-2xl bg-red-50 p-4 text-red-700">
            Hata: {error}
          </p>
        )}
        {loading && <p className="p-4 text-slate-400">Yükleniyor...</p>}

        {report && (
          <>
            {/* ödeme şekli */}
            <div className="mb-4 rounded-3xl bg-white p-5 shadow-sm">
              <p className="mb-3 font-bold text-slate-700">Ödeme Şekli</p>
              <div className="flex items-center justify-between py-2">
                <span className="flex items-center gap-3 text-slate-600">
                  <span className="text-xl">💵</span> Nakit
                </span>
                <b className="text-lg">{tl(report.cashTotal)}</b>
              </div>
              <div className="flex items-center justify-between border-b border-dashed py-2 pb-4">
                <span className="flex items-center gap-3 text-slate-600">
                  <span className="text-xl">💳</span> Kart
                </span>
                <b className="text-lg">{tl(report.cardTotal)}</b>
              </div>
              <div className="flex items-center justify-between pt-4">
                <span className="text-xl font-bold text-emerald-600">
                  Toplam
                </span>
                <span className="text-2xl font-bold text-emerald-600">
                  {tl(report.total)}
                </span>
              </div>
              <p className="text-right text-sm text-slate-400">
                {report.itemCount} parça
              </p>
            </div>

            {/* giderler */}
            <div className="mb-4 rounded-3xl bg-white p-5 shadow-sm">
              <p className="mb-3 font-bold text-slate-700">Giderler</p>
              {report.expenses.length === 0 && (
                <p className="text-slate-400">Bugün gider girilmemiş.</p>
              )}
              {report.expenses.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between border-b border-slate-100 py-2"
                >
                  <span className="text-slate-600">
                    {e.category}
                    {e.note && (
                      <span className="text-slate-400"> — {e.note}</span>
                    )}
                  </span>
                  <b>{tl(e.amount)}</b>
                </div>
              ))}
              <div className="flex justify-between pt-3 font-bold">
                <span>Gider Toplamı</span>
                <span>{tl(report.expensesTotal)}</span>
              </div>
            </div>

            {/* kasa */}
            <div className="mb-4 rounded-3xl bg-amber-100 p-5 text-center">
              <p className="flex items-center justify-center gap-2 text-slate-700">
                <span className="text-xl">💰</span> Kasada olması gereken nakit
              </p>
              <p className="mt-1 text-4xl font-bold">
                {tl(report.expectedCash)}
              </p>
            </div>

            {/* satılan ürünler */}
            <div className="mb-4 overflow-hidden rounded-3xl bg-white shadow-sm">
              <p className="border-b border-slate-100 p-5 font-bold text-slate-700">
                Satılan Ürünler
              </p>

              {sales.length === 0 && (
                <p className="p-5 text-slate-400">Bu gün satış yok.</p>
              )}

              {sales.length > 0 && (
                <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2 text-xs font-bold text-slate-400">
                  <span className="flex-1">Ürün</span>
                  <span className="w-[70px] text-right">Nakit</span>
                  <span className="w-[70px] text-right">Kart</span>
                  <span className="w-4" />
                </div>
              )}

              {sales.map((s, i) => (
                <div
                  key={s.id}
                  className={i % 2 === 0 ? "bg-white" : "bg-emerald-50/60"}
                >
                  {splitPayment(s).map((it, j) => (
                    <div
                      key={it.id}
                      className="flex items-center gap-2 border-b border-slate-100 px-4 py-2.5 text-sm"
                    >
                      <span className="min-w-0 flex-1 truncate text-slate-700">
                        {it.label}
                        {it.quantity > 1 && (
                          <span className="text-slate-400">
                            {" "}
                            × {it.quantity}
                          </span>
                        )}
                      </span>
                      <span className="w-[70px] text-right font-bold text-emerald-600">
                        {it.cash > 0 ? (
                          tl(it.cash)
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </span>
                      <span className="w-[70px] text-right font-bold text-slate-800">
                        {it.card > 0 ? (
                          tl(it.card)
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </span>
                      {j === 0 ? (
                        <button
                          onClick={() => deleteSale(s.id)}
                          className="w-4 shrink-0 text-red-500"
                          title="Bu satışın tamamını sil"
                        >
                          ✕
                        </button>
                      ) : (
                        <span className="w-4 shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
