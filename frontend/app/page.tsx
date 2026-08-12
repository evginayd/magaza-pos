"use client";

import { useEffect, useState } from "react";

const API = "http://localhost:5201";

type Label = { id: number; name: string; sortOrder: number; isActive: boolean };

export default function Home() {
  // ═══════════ BÖLGE 1: HAFIZA (state'ler) ═══════════
  const [labels, setLabels] = useState<Label[]>([]); // butonların listesi
  const [error, setError] = useState<string | null>(null); // sayfa açılış hatası

  const [selected, setSelected] = useState<Label | null>(null); // panel kimin için açık? (null = kapalı)
  const [price, setPrice] = useState(""); // fiyat kutusunun içeriği
  const [qty, setQty] = useState(1); // adet
  const [saving, setSaving] = useState(false); // kayıt sürüyor mu? (çift tık kilidi)
  const [lastSaved, setLastSaved] = useState<string | null>(null); // yeşil onay mesajı
  const [formError, setFormError] = useState<string | null>(null); // panel içi hata mesajı

  // ═══════════ BÖLGE 2: EYLEMLER (fonksiyonlar) ═══════════

  // Sayfa ilk açıldığında butonları API'den çek (Ders 6'dan aynen)
  useEffect(() => {
    fetch(`${API}/api/labels`)
      .then((r) => {
        if (!r.ok) throw new Error(`API hatası: ${r.status}`);
        return r.json();
      })
      .then(setLabels)
      .catch((e) => setError(e.message));
  }, []);

  // Bir etiket butonuna basılınca: paneli o etiket için aç, formu sıfırla
  function openPanel(l: Label) {
    setSelected(l);
    setPrice("");
    setQty(1);
    setFormError(null);
    setLastSaved(null);
  }

  // NAKİT ya da KART'a basılınca: doğrula, API'ye gönder
  async function submitSale(paymentMethod: "cash" | "card") {
    if (!selected) return;

    const unitPrice = Number(price.replace(",", ".")); // "700,50" yazana tolerans
    if (!unitPrice || unitPrice <= 0) {
      setFormError("Geçerli bir fiyat gir.");
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      const r = await fetch(`${API}/api/sales`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: selected.name,
          unitPrice,
          quantity: qty,
          paymentMethod,
        }),
      });
      if (!r.ok) {
        const body = await r.json().catch(() => null);
        throw new Error(body?.error ?? `Sunucu hatası: ${r.status}`);
      }
      setLastSaved(`${selected.name} × ${qty} kaydedildi ✓`);
      setSelected(null); // paneli kapat → ekran HAL 3'e geçer
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Bağlantı hatası");
    } finally {
      setSaving(false);
    }
  }

  // ═══════════ BÖLGE 3: GÖRÜNÜM (JSX) ═══════════

  if (error)
    return <p className="p-4 text-red-600">Bağlantı sorunu: {error}</p>;

  return (
    <main className="min-h-screen bg-gray-100 p-4 text-gray-900">
      <h1 className="mb-4 text-2xl font-bold">Satış</h1>

      {/* ── 3a: Buton ızgarası (her zaman görünür) ── */}
      <div className="grid grid-cols-2 gap-3">
        {labels.map((l) => (
          <button
            key={l.id}
            onClick={() => openPanel(l)}
            className="rounded-2xl bg-white p-6 text-2xl font-bold shadow active:bg-blue-100"
          >
            {l.name}
          </button>
        ))}
      </div>

      {/* ── 3b: Yeşil onay mesajı (sadece lastSaved doluysa) ── */}
      {lastSaved && (
        <div className="mt-4 rounded-xl bg-green-100 p-4 text-lg font-semibold text-green-800">
          {lastSaved}
        </div>
      )}

      {/* ── 3c: Satış paneli (sadece selected doluysa) ── */}
      {selected && (
        <div
          className="fixed inset-0 flex items-end bg-black/40"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full rounded-t-3xl bg-white p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 text-3xl font-bold">{selected.name}</h2>

            {/* fiyat kutusu */}
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              inputMode="decimal"
              placeholder="Fiyat (₺)"
              autoFocus
              className="mb-4 w-full rounded-xl border-2 p-4 text-center text-4xl font-bold"
            />

            {/* adet seçici:  −  1  +  */}
            <div className="mb-4 flex items-center justify-center gap-6">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="h-14 w-14 rounded-full bg-gray-200 text-3xl font-bold"
              >
                −
              </button>
              <span className="w-16 text-center text-4xl font-bold">{qty}</span>
              <button
                onClick={() => setQty((q) => q + 1)}
                className="h-14 w-14 rounded-full bg-gray-200 text-3xl font-bold"
              >
                +
              </button>
            </div>

            {/* panel içi hata mesajı */}
            {formError && (
              <p className="mb-3 text-lg text-red-600">{formError}</p>
            )}

            {/* ödeme butonları */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => submitSale("cash")}
                disabled={saving}
                className="rounded-2xl bg-green-600 p-6 text-2xl font-bold text-white disabled:opacity-50"
              >
                NAKİT
              </button>
              <button
                onClick={() => submitSale("card")}
                disabled={saving}
                className="rounded-2xl bg-blue-600 p-6 text-2xl font-bold text-white disabled:opacity-50"
              >
                KART
              </button>
            </div>

            {/* vazgeç */}
            <button
              onClick={() => setSelected(null)}
              className="mt-3 w-full rounded-2xl bg-gray-200 p-4 text-xl font-semibold"
            >
              Vazgeç
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
