"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

const CATEGORIES = [
  { name: "Yemek", icon: "🍽️" },
  { name: "Su", icon: "💧" },
  { name: "Mal Alımı", icon: "🛍️" },
  { name: "Fatura", icon: "📄" },
  { name: "Diğer", icon: "•••" },
];

type ExpenseRow = {
  id: number;
  category: string;
  amount: number;
  note?: string | null;
};

const tl = (n: number) => "₺" + n.toLocaleString("tr-TR");

export default function GiderPage() {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [todayExpenses, setTodayExpenses] = useState<ExpenseRow[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    const today = new Date().toISOString().slice(0, 10);

    apiFetch(`/api/reports/daily?date=${today}`)
      .then((r) => {
        if (!r.ok) throw new Error(`API hatası: ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (!ignore) setTodayExpenses(data.expenses);
      })
      .catch(() => {
        if (!ignore) setTodayExpenses([]);
      });

    return () => {
      ignore = true;
    };
  }, [refreshKey]);

  async function submitExpense() {
    const parsed = Number(amount.replace(",", "."));
    if (!parsed || parsed <= 0) {
      setFormError("Geçerli bir tutar gir.");
      return;
    }
    if (!category) {
      setFormError("Bir kategori seç.");
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      const r = await apiFetch(`/api/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parsed,
          category,
          note: note.trim() || null,
        }),
      });
      if (!r.ok) {
        const body = await r.json().catch(() => null);
        throw new Error(body?.error ?? `Sunucu hatası: ${r.status}`);
      }
      setLastSaved(`${category} — ${tl(parsed)} kaydedildi ✓`);
      setAmount("");
      setCategory(null);
      setNote("");
      setRefreshKey((k) => k + 1);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Bağlantı hatası");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-md">
      <header className="rounded-b-3xl bg-gradient-to-br from-emerald-600 to-green-500 px-5 pb-10 pt-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Gider Ekle</h1>
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20 text-xl">
            👛
          </span>
        </div>
      </header>

      <div className="-mt-6 px-5">
        {/* tutar */}
        <div className="mb-4 rounded-3xl bg-white p-5 shadow-sm">
          <label className="mb-2 block text-sm font-semibold text-slate-500">
            Tutar (₺)
          </label>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            placeholder="0,00"
            className="w-full rounded-2xl bg-slate-100 p-5 text-center text-4xl font-bold outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* kategoriler */}
        <div className="mb-4 grid grid-cols-2 gap-3">
          {CATEGORIES.map((c, i) => (
            <button
              key={c.name}
              onClick={() => {
                setCategory(c.name);
                setFormError(null);
              }}
              className={`flex flex-col items-center gap-1 rounded-2xl p-5 font-bold shadow-sm ${
                i === CATEGORIES.length - 1 ? "col-span-2" : ""
              } ${
                category === c.name
                  ? "bg-emerald-600 text-white"
                  : "bg-white text-slate-700"
              }`}
            >
              <span className="text-2xl">{c.icon}</span>
              {c.name}
            </button>
          ))}
        </div>

        {/* not */}
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="💬  Not (isteğe bağlı)"
          className="mb-4 w-full rounded-2xl bg-white p-4 shadow-sm outline-none"
        />

        {formError && (
          <p className="mb-3 rounded-2xl bg-red-50 p-3 text-center font-semibold text-red-600">
            {formError}
          </p>
        )}

        <button
          onClick={submitExpense}
          disabled={saving}
          className="w-full rounded-2xl bg-emerald-600 p-5 text-xl font-bold tracking-wide text-white shadow-lg shadow-emerald-600/30 disabled:opacity-50"
        >
          KAYDET
        </button>

        {lastSaved && (
          <div className="mt-4 rounded-2xl bg-emerald-50 p-4 text-center font-semibold text-emerald-700">
            {lastSaved}
          </div>
        )}

        {/* bugünün giderleri */}
        <div className="mt-5 rounded-3xl bg-white p-5 shadow-sm">
          <p className="mb-2 font-bold text-slate-700">Bugünün Giderleri</p>
          {todayExpenses.length === 0 && (
            <p className="text-slate-400">Bugün gider girilmemiş.</p>
          )}
          {todayExpenses.map((e) => (
            <div
              key={e.id}
              className="flex items-center justify-between border-b border-slate-100 py-2"
            >
              <span className="text-slate-600">
                {e.category}
                {e.note && <span className="text-slate-400"> — {e.note}</span>}
              </span>
              <b>{tl(e.amount)}</b>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
