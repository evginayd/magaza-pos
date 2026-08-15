"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

type ByLabel = { label: string; quantity: number; revenue: number };

// Grafikteki tek bir çubuk (ay modunda bir gün, yıl modunda bir ay)
type Series = { label: string; cash: number; card: number; total: number };

// İki farklı API cevabını TEK bir şekle indirgiyoruz: ekran tek yol biliyor.
type Report = {
  key: string; // "2026-08" veya "2026" — bayat veri kontrolü için
  cashTotal: number;
  cardTotal: number;
  salesTotal: number;
  itemCount: number;
  byLabel: ByLabel[];
  series: Series[];
  expensesTotal: number;
  net: number;
};

const tl = (n: number) => "₺" + n.toLocaleString("tr-TR");

const MONTHS_SHORT = [
  "Oca", "Şub", "Mar", "Nis", "May", "Haz",
  "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara",
];

const trMonth = (m: string) =>
  new Date(m + "-01T00:00:00").toLocaleDateString("tr-TR", {
    month: "long",
    year: "numeric",
  });

export default function AnalizPage() {
  // ═══ BÖLGE 1: HAFIZA ═══
  const [mode, setMode] = useState<"month" | "year">("month");
  const [month, setMonth] = useState(() =>
    new Date().toISOString().slice(0, 7)
  );
  const [year, setYear] = useState(() => new Date().getUTCFullYear());

  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Şu an hangi dönemi görüyoruz?
  const periodKey = mode === "month" ? month : String(year);

  // ═══ BÖLGE 2: EYLEMLER ═══
  useEffect(() => {
    let ignore = false;

    const url =
      mode === "month"
        ? `/api/reports/monthly?month=${month}`
        : `/api/reports/yearly?year=${year}`;

    apiFetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`API hatası: ${r.status}`);
        return r.json();
      })
      .then((d) => {
        if (ignore) return;

        // Normalleştirme: byDay / byMonth → tek "series" dizisi
        const series: Series[] =
          mode === "month"
            ? d.byDay.map((x: { date: string; cash: number; card: number; total: number }) => ({
                label: x.date.slice(8, 10),
                cash: x.cash,
                card: x.card,
                total: x.total,
              }))
            : d.byMonth.map((x: { month: number; cash: number; card: number; total: number }) => ({
                label: MONTHS_SHORT[x.month - 1],
                cash: x.cash,
                card: x.card,
                total: x.total,
              }));

        setReport({
          key: mode === "month" ? d.month : String(d.year),
          cashTotal: d.cashTotal,
          cardTotal: d.cardTotal,
          salesTotal: d.salesTotal,
          itemCount: d.itemCount,
          byLabel: d.byLabel,
          series,
          expensesTotal: d.expensesTotal,
          net: d.net,
        });
        setError(null);
      })
      .catch((e) => {
        if (!ignore) setError(e.message);
      });

    return () => {
      ignore = true;
    };
  }, [mode, month, year]);

  const loading = !error && report?.key !== periodKey;

  // Grafik ölçeği (|| 1 → sıfıra bölmeyi engeller)
  const maxBar = Math.max(...(report?.series.map((s) => s.total) ?? [0]), 1);
  const maxRevenue = Math.max(
    ...(report?.byLabel.map((l) => l.revenue) ?? [0]),
    1
  );

  // ═══ BÖLGE 3: GÖRÜNÜM ═══
  return (
    <main className="mx-auto max-w-md">
      <header className="rounded-b-3xl bg-gradient-to-br from-emerald-600 to-green-500 px-5 pb-10 pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/rapor"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20 text-2xl text-white"
            >
              ←
            </Link>
            <h1 className="text-2xl font-bold text-white">
              {mode === "month" ? "Aylık Rapor" : "Yıllık Rapor"}
            </h1>
          </div>
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20 text-xl">
            📈
          </span>
        </div>
      </header>

      <div className="-mt-6 px-5">
        {/* Ay / Yıl geçişi */}
        <div className="mb-3 flex gap-1 rounded-2xl bg-white p-1 shadow-sm">
          {(["month", "year"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 rounded-xl py-2.5 font-bold ${
                mode === m
                  ? "bg-emerald-600 text-white"
                  : "text-slate-500"
              }`}
            >
              {m === "month" ? "Ay" : "Yıl"}
            </button>
          ))}
        </div>

        {/* dönem seçici */}
        {mode === "month" ? (
          <div className="mb-4 flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
            <span className="text-xl">🗓️</span>
            <span className="flex-1 font-bold capitalize">{trMonth(month)}</span>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-8 cursor-pointer text-transparent outline-none"
            />
          </div>
        ) : (
          <div className="mb-4 flex items-center gap-3 rounded-2xl bg-white p-2 shadow-sm">
            <button
              onClick={() => setYear((y) => y - 1)}
              className="h-11 w-11 rounded-xl bg-slate-100 text-2xl font-bold text-slate-600"
            >
              ‹
            </button>
            <span className="flex-1 text-center text-xl font-bold">{year}</span>
            <button
              onClick={() => setYear((y) => y + 1)}
              className="h-11 w-11 rounded-xl bg-slate-100 text-2xl font-bold text-slate-600"
            >
              ›
            </button>
          </div>
        )}

        {error && (
          <p className="rounded-2xl bg-red-50 p-4 text-red-700">Hata: {error}</p>
        )}
        {loading && <p className="p-4 text-slate-400">Yükleniyor...</p>}

        {report && !loading && (
          <>
            {/* toplam ciro */}
            <div className="mb-3 rounded-3xl bg-white p-5 text-center shadow-sm">
              <p className="text-sm font-semibold text-slate-500">
                {mode === "month" ? "Aylık Ciro" : "Yıllık Ciro"}
              </p>
              <p className="text-4xl font-bold text-emerald-600">
                {tl(report.salesTotal)}
              </p>
              <p className="mt-1 text-sm text-slate-400">
                {report.itemCount} parça satıldı
              </p>
            </div>

            {/* dört kutu */}
            <div className="mb-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold text-slate-500">💵 Nakit</p>
                <p className="text-xl font-bold">{tl(report.cashTotal)}</p>
              </div>
              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold text-slate-500">💳 Kart</p>
                <p className="text-xl font-bold">{tl(report.cardTotal)}</p>
              </div>
              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold text-slate-500">👛 Gider</p>
                <p className="text-xl font-bold text-red-600">
                  {tl(report.expensesTotal)}
                </p>
              </div>
              <div className="rounded-2xl bg-emerald-600 p-4 shadow-sm">
                <p className="text-xs font-semibold text-emerald-100">
                  📊 Net Kalan
                </p>
                <p className="text-xl font-bold text-white">{tl(report.net)}</p>
              </div>
            </div>

            {/* ciro grafiği */}
            <div className="mb-4 rounded-3xl bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <p className="font-bold text-slate-700">
                  {mode === "month" ? "Günlük Ciro" : "Aylık Ciro"}
                </p>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    Nakit
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-800" />
                    Kart
                  </span>
                </div>
              </div>

              {report.series.length === 0 ? (
                <p className="text-slate-400">Bu dönemde satış yok.</p>
              ) : (
                <div className="flex h-44 items-end gap-1 overflow-x-auto">
                  {report.series.map((s) => (
                    <div
                      key={s.label}
                      title={`${s.label}: ${tl(s.total)}`}
                      className="flex h-full min-w-[18px] flex-1 flex-col items-center gap-1"
                    >
                      <div className="flex w-full flex-1 flex-col justify-end overflow-hidden rounded-t-md">
                        <div
                          className="w-full bg-slate-800"
                          style={{ height: `${(s.card / maxBar) * 100}%` }}
                        />
                        <div
                          className="w-full bg-emerald-500"
                          style={{ height: `${(s.cash / maxBar) * 100}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-semibold text-slate-400">
                        {s.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ürün bazlı tablo */}
            <div className="mb-4 overflow-hidden rounded-3xl bg-white shadow-sm">
              <p className="border-b border-slate-100 p-5 font-bold text-slate-700">
                {mode === "month" ? "Ürün Bazlı Satış" : "En Çok Satanlar"}
              </p>

              {report.byLabel.length === 0 && (
                <p className="p-5 text-slate-400">Bu dönemde satış yok.</p>
              )}

              {report.byLabel.length > 0 && (
                <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2 text-xs font-bold text-slate-400">
                  <span className="flex-1">Ürün</span>
                  <span className="w-14 text-right">Adet</span>
                  <span className="w-20 text-right">Ciro</span>
                </div>
              )}

              {report.byLabel.map((l, i) => (
                <div
                  key={l.label}
                  className="relative border-b border-slate-100 px-4 py-3"
                >
                  {/* arkadaki oransal çubuk */}
                  <div
                    className="absolute inset-y-0 left-0 bg-emerald-50"
                    style={{ width: `${(l.revenue / maxRevenue) * 100}%` }}
                  />
                  <div className="relative flex items-center gap-2 text-sm">
                    <span className="min-w-0 flex-1 truncate font-semibold text-slate-700">
                      {mode === "year" && i < 3 && (
                        <span className="mr-1">
                          {["🥇", "🥈", "🥉"][i]}
                        </span>
                      )}
                      {l.label}
                    </span>
                    <span className="w-14 text-right text-slate-500">
                      {l.quantity} ad.
                    </span>
                    <span className="w-20 text-right font-bold">
                      {tl(l.revenue)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
