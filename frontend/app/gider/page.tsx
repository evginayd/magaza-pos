"use client";

import { useEffect, useState } from "react";

const API = "http://localhost:5201";

const CATEGORIES = ["Yemek", "Su", "Mal Alımı", "Fatura", "Diğer"];

type ExpenseRow = {
  id: number;
  category: string;
  amount: number;
  note?: string | null;
};

const tl = (n: number) => "₺" + n.toLocaleString("tr-TR");

export default function GiderPage() {
  // ═══════════ BÖLGE 1: HAFIZA ═══════════
  const [amount, setAmount] = useState(""); // tutar kutusu (string — kural değişmedi)
  const [category, setCategory] = useState<string | null>(null); // seçili kategori
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false); // çift tık kilidi
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [todayExpenses, setTodayExpenses] = useState<ExpenseRow[]>([]); // bugünün listesi
  const [refreshKey, setRefreshKey] = useState(0); // listeyi tazeleme tetikleyicisi

  // ═══════════ BÖLGE 2: EYLEMLER ═══════════

  // Bugünün giderlerini çek. [refreshKey] sayesinde: kayıt sonrası k+1 → yeniden çalışır.
  useEffect(() => {
    let ignore = false;
    const today = new Date().toISOString().slice(0, 10); // iş günü = UTC günü

    fetch(`${API}/api/reports/daily?date=${today}`)
      .then((r) => {
        if (!r.ok) throw new Error(`API hatası: ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (!ignore) setTodayExpenses(data.expenses);
      })
      .catch(() => {
        if (!ignore) setTodayExpenses([]); // liste bonus bilgi; hatada sessizce boş kalsın
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
      const r = await fetch(`${API}/api/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parsed, // ← DTO'nun aynası: Amount
          category, // ← Category
          note: note.trim() || null, // ← Note (boşsa null)
          // date YOK: bugünün iş gününü sunucu basıyor
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
      setRefreshKey((k) => k + 1); // listeyi tazele
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Bağlantı hatası");
    } finally {
      setSaving(false);
    }
  }

  // ═══════════ BÖLGE 3: GÖRÜNÜM (panel yok — düz form) ═══════════
  return (
    <main className="min-h-screen bg-gray-100 p-4 text-gray-900">
      <h1 className="mb-4 text-2xl font-bold">Gider</h1>

      {/* tutar */}
      <input
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        inputMode="decimal"
        placeholder="Tutar (₺)"
        className="mb-4 w-full rounded-xl border-2 bg-white p-4 text-center text-4xl font-bold"
      />

      {/* kategori butonları — senin "loop lazım" dediğin yer */}
      <div className="mb-4 grid grid-cols-2 gap-3">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => {
              setCategory(c);
              setFormError(null);
            }}
            className={
              category === c
                ? "rounded-2xl bg-blue-600 p-5 text-xl font-bold text-white"
                : "rounded-2xl bg-white p-5 text-xl font-bold shadow"
            }
          >
            {c}
          </button>
        ))}
      </div>

      {/* not (opsiyonel) */}
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Not (isteğe bağlı)"
        className="mb-4 w-full rounded-xl border-2 bg-white p-4 text-lg"
      />

      {formError && <p className="mb-3 text-lg text-red-600">{formError}</p>}

      <button
        onClick={submitExpense}
        disabled={saving}
        className="w-full rounded-2xl bg-green-600 p-6 text-2xl font-bold text-white disabled:opacity-50"
      >
        KAYDET
      </button>

      {lastSaved && (
        <div className="mt-4 rounded-xl bg-green-100 p-4 text-lg font-semibold text-green-800">
          {lastSaved}
        </div>
      )}

      {/* bugünün giderleri */}
      <div className="mt-6 rounded-2xl bg-white p-5 shadow">
        <h2 className="mb-2 text-lg font-bold">Bugünün Giderleri</h2>
        {todayExpenses.length === 0 && (
          <p className="text-gray-500">Bugün gider girilmemiş.</p>
        )}
        {todayExpenses.map((e) => (
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
      </div>
    </main>
  );
}
