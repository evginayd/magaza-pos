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

// 700 → "₺700"  |  1234.5 → "₺1.234,50"
const tl = (n: number) => "₺" + n.toLocaleString("tr-TR");

export default function RaporPage() {
  // ═══ BÖLGE 1: HAFIZA ═══
  // İş günü = UTC günü kararımız sayesinde bugünün tarihi = UTC tarihi.
  // toISOString hep UTC verir → gece 01:00'de bile doğru iş gününü gösterir.
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [report, setReport] = useState<DailyReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ═══ BÖLGE 2: EYLEMLER ═══
  // Dikkat: dizide [date] var → "date HER DEĞİŞTİĞİNDE yeniden çalış"
  // ═══ BÖLGE 2: EYLEMLER ═══
  useEffect(() => {
    let ignore = false; // eski turun cevabı geç gelirse çöpe atmak için bayrak

    fetch(`${API}/api/reports/daily?date=${date}`)
      .then((r) => {
        if (!r.ok) throw new Error(`API hatası: ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (!ignore) {
          setReport(data);
          setError(null);
        }
      })
      .catch((e) => {
        if (!ignore) setError(e.message);
      });

    return () => {
      ignore = true; // temizlik: date değişti → bu turun cevabı artık geçersiz
    };
  }, [date]);

  // "Yükleniyor" bilgisi state DEĞİL, türetilmiş değer:
  const loading = !error && report?.date !== date;

  // ═══ BÖLGE 3: GÖRÜNÜM ═══
  return (
    <main className="min-h-screen bg-gray-100 p-4 text-gray-900">
      <h1 className="mb-4 text-2xl font-bold">Gün Sonu</h1>

      {/* tarih seçici */}
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

          {/* Defter sayfasının alt kısmı: giderler */}
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

          {/* Defterde OLMAYAN hediye: kasa mutabakat sayısı */}
          <div className="rounded-2xl bg-amber-100 p-5 text-center shadow">
            <p className="text-lg">Kasada olması gereken nakit</p>
            <p className="text-4xl font-bold">{tl(report.expectedCash)}</p>
          </div>
        </>
      )}
    </main>
  );
}
