"use client";

import { useEffect, useState } from "react";

const API = "http://localhost:5201";

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

// Fiş ve kalemleri (API'den geldiği şekil)
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

export default function RaporPage() {
  // ═══ BÖLGE 1: HAFIZA ═══
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [report, setReport] = useState<DailyReport | null>(null);
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0); // silme sonrası tazeleme

  // ═══ BÖLGE 2: EYLEMLER ═══
  useEffect(() => {
    let ignore = false;

    // Promise.all: iki istek AYNI ANDA gider, ikisi de bitince devam eder
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
      setRefreshKey((k) => k + 1); // hem tablo hem toplamlar tazelensin
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bağlantı hatası");
    }
  }

  const loading = !error && report?.date !== date;

  // ═══ BÖLGE 3: GÖRÜNÜM ═══
  return (
    <main className="mx-auto min-h-screen max-w-md bg-gray-100 p-4 text-gray-900">
      <h1 className="mb-4 text-2xl font-bold">Gün Sonu</h1>

      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="mb-4 w-full rounded-xl border-2 bg-white p-4 text-xl"
      />

      {error && <p className="text-red-600">Hata: {error}</p>}
      {loading && <p className="text-gray-500">Yükleniyor...</p>}

      {report && (
        <>
          {/* Defter sayfasının üst kısmı */}
          <div className="mb-4 rounded-2xl bg-white p-5 shadow">
            <div className="flex justify-between border-b py-3 text-xl">
              <span>NAKİT</span> <b>{tl(report.cashTotal)}</b>
            </div>
            <div className="flex justify-between border-b py-3 text-xl">
              <span>KART</span> <b>{tl(report.cardTotal)}</b>
            </div>
            <div className="flex justify-between py-3 text-2xl font-bold">
              <span>TOPLAM</span> <span>{tl(report.total)}</span>
            </div>
            <p className="text-right text-gray-500">{report.itemCount} parça</p>
          </div>

          {/* Giderler */}
          <div className="mb-4 rounded-2xl bg-white p-5 shadow">
            <h2 className="mb-2 text-lg font-bold">Giderler</h2>
            {report.expenses.length === 0 && (
              <p className="text-gray-500">Bugün gider girilmemiş.</p>
            )}
            {report.expenses.map((e) => (
              <div
                key={e.id}
                className="flex justify-between border-b py-2 text-lg"
              >
                <span>
                  {e.category}
                  {e.note && <span className="text-gray-400"> — {e.note}</span>}
                </span>
                <b>{tl(e.amount)}</b>
              </div>
            ))}
            <div className="flex justify-between pt-3 text-lg font-bold">
              <span>Gider Toplamı</span> <span>{tl(report.expensesTotal)}</span>
            </div>
          </div>

          {/* Kasa mutabakatı */}
          <div className="mb-4 rounded-2xl bg-amber-100 p-5 text-center shadow">
            <p className="text-lg">Kasada olması gereken nakit</p>
            <p className="text-4xl font-bold">{tl(report.expectedCash)}</p>
          </div>

          {/* ─── YENİ: satılan ürünler tablosu ─── */}
          <div className="mb-4 overflow-hidden rounded-2xl bg-white shadow">
            <h2 className="border-b p-4 text-lg font-bold">Satılan Ürünler</h2>

            {sales.length === 0 && (
              <p className="p-4 text-gray-500">Bu gün satış yok.</p>
            )}

            {/* DIŞ map: fişler — renk tonu burada belirlenir */}
            {sales.map((s, i) => (
              <div
                key={s.id}
                className={i % 2 === 0 ? "bg-white" : "bg-sky-50"}
              >
                {/* İÇ map: o fişin kalemleri */}
                {s.items.map((it, j) => (
                  <div
                    key={it.id}
                    className="flex items-center justify-between border-b px-4 py-2"
                  >
                    <span className="truncate">
                      {it.label}
                      {it.quantity > 1 && (
                        <span className="text-gray-500"> × {it.quantity}</span>
                      )}
                    </span>
                    <span className="flex shrink-0 items-center gap-3">
                      <b>{tl(it.unitPrice * it.quantity)}</b>
                      {/* silme butonu sadece fişin İLK satırında */}
                      {j === 0 ? (
                        <button
                          onClick={() => deleteSale(s.id)}
                          className="w-6 text-red-600"
                          title="Bu satışın tamamını sil"
                        >
                          ✕
                        </button>
                      ) : (
                        <span className="w-6" />
                      )}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
