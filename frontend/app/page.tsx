"use client";

import { useEffect, useState } from "react";

const API = "http://localhost:5201";

type Label = {
  id: number;
  name: string;
  sortOrder: number;
  isActive: boolean;
  parentId: number | null;
};

type CartLine = {
  key: string;
  label: string;
  unitPrice: number;
  quantity: number;
};

const tl = (n: number) => "₺" + n.toLocaleString("tr-TR");

export default function SatisPage() {
  // ═══════════ BÖLGE 1: HAFIZA ═══════════
  const [labels, setLabels] = useState<Label[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [parent, setParent] = useState<Label | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [price, setPrice] = useState("");
  const [qty, setQty] = useState(1);

  const [cart, setCart] = useState<CartLine[]>([]);
  const [mixedOpen, setMixedOpen] = useState(false);
  const [cashInput, setCashInput] = useState("");

  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // ═══ TÜRETİLMİŞ DEĞERLER ═══
  const roots = labels.filter((l) => l.parentId === null);
  const visibleLabels = parent
    ? labels.filter((l) => l.parentId === parent.id)
    : roots;
  const cartTotal = cart.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);

  // ═══════════ BÖLGE 2: EYLEMLER ═══════════
  useEffect(() => {
    fetch(`${API}/api/labels`)
      .then((r) => {
        if (!r.ok) throw new Error(`API hatası: ${r.status}`);
        return r.json();
      })
      .then(setLabels)
      .catch((e) => setError(e.message));
  }, []);

  function onLabelClick(l: Label) {
    const hasChildren = labels.some((x) => x.parentId === l.id);
    if (hasChildren) {
      setParent(l);
      return;
    }
    setSelected(parent ? `${parent.name} - ${l.name}` : l.name);
    setPrice("");
    setQty(1);
    setFormError(null);
  }

  function addToCart() {
    if (!selected) return;
    const unitPrice = Number(price.replace(",", "."));
    if (!unitPrice || unitPrice <= 0) {
      setFormError("Geçerli bir fiyat gir.");
      return;
    }
    setCart((c) => [
      ...c,
      { key: crypto.randomUUID(), label: selected, unitPrice, quantity: qty },
    ]);
    setSelected(null);
    setParent(null);
    setLastSaved(null);
  }

  function removeLine(key: string) {
    setCart((c) => c.filter((l) => l.key !== key));
  }

  async function submitSale(cashAmount: number, cardAmount: number) {
    if (cart.length === 0) return;
    setSaving(true);
    setFormError(null);
    try {
      const r = await fetch(`${API}/api/sales`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cashAmount,
          cardAmount,
          items: cart.map((l) => ({
            label: l.label,
            unitPrice: l.unitPrice,
            quantity: l.quantity,
          })),
        }),
      });
      if (!r.ok) {
        const body = await r.json().catch(() => null);
        throw new Error(body?.error ?? `Sunucu hatası: ${r.status}`);
      }
      setLastSaved(`${cart.length} kalem · ${tl(cartTotal)} kaydedildi ✓`);
      setCart([]);
      setMixedOpen(false);
      setCashInput("");
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Bağlantı hatası");
    } finally {
      setSaving(false);
    }
  }

  function submitMixed() {
    const cash = Number(cashInput.replace(",", "."));
    if (isNaN(cash) || cash < 0 || cash > cartTotal) {
      setFormError(`Nakit tutar 0 ile ${tl(cartTotal)} arasında olmalı.`);
      return;
    }
    submitSale(cash, cartTotal - cash);
  }

  // ═══════════ BÖLGE 3: GÖRÜNÜM ═══════════
  if (error)
    return <p className="p-4 text-red-600">Bağlantı sorunu: {error}</p>;

  // ─── HAL A: Fiyat paneli açık → TAM EKRAN, başka hiçbir şey yok ───
  if (selected) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-white">
        <div className="mx-auto max-w-md p-5">
          <h2 className="mb-6 text-3xl font-bold">{selected}</h2>

          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            inputMode="decimal"
            placeholder="Fiyat (₺)"
            autoFocus
            className="mb-6 w-full rounded-2xl border-2 p-5 text-center text-5xl font-bold"
          />

          <div className="mb-6 flex items-center justify-center gap-8">
            <button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="h-16 w-16 rounded-full bg-gray-200 text-4xl font-bold"
            >
              −
            </button>
            <span className="w-16 text-center text-5xl font-bold">{qty}</span>
            <button
              onClick={() => setQty((q) => q + 1)}
              className="h-16 w-16 rounded-full bg-gray-200 text-4xl font-bold"
            >
              +
            </button>
          </div>

          {formError && (
            <p className="mb-4 text-center text-lg text-red-600">{formError}</p>
          )}

          <button
            onClick={addToCart}
            className="w-full rounded-2xl bg-blue-600 p-6 text-2xl font-bold text-white"
          >
            SEPETE EKLE
          </button>
          <button
            onClick={() => setSelected(null)}
            className="mt-3 w-full rounded-2xl bg-gray-200 p-4 text-xl font-semibold"
          >
            Vazgeç
          </button>
        </div>
      </div>
    );
  }

  // ─── HAL B: Normal ekran (etiketler + sepet) ───
  return (
    <main
      className={`mx-auto min-h-screen max-w-md bg-gray-100 p-4 text-gray-900 ${
        cart.length ? "pb-80" : ""
      }`}
    >
      <div className="mb-4 flex items-center gap-3">
        {parent && (
          <button
            onClick={() => setParent(null)}
            className="rounded-xl bg-white px-4 py-2 text-2xl shadow"
          >
            ←
          </button>
        )}
        <h1 className="text-2xl font-bold">{parent ? parent.name : "Satış"}</h1>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {visibleLabels.map((l) => (
          <button
            key={l.id}
            onClick={() => onLabelClick(l)}
            className="rounded-2xl bg-white p-6 text-xl font-bold shadow active:bg-blue-100"
          >
            {l.name}
            {labels.some((x) => x.parentId === l.id) && (
              <span className="block text-xs font-normal text-gray-400">
                çeşit seç →
              </span>
            )}
          </button>
        ))}
      </div>

      {lastSaved && cart.length === 0 && (
        <div className="mt-4 rounded-xl bg-green-100 p-4 text-lg font-semibold text-green-800">
          {lastSaved}
        </div>
      )}

      {/* Sepet — sadece dolu olduğunda, alt navigasyonun üstünde */}
      {cart.length > 0 && (
        <div className="fixed bottom-16 left-0 right-0 z-40 border-t bg-white">
          <div className="mx-auto max-w-md p-3">
            <div className="mb-2 max-h-32 overflow-y-auto">
              {cart.map((l) => (
                <div
                  key={l.key}
                  className="flex items-center justify-between border-b py-1.5 text-sm"
                >
                  <span className="truncate">
                    {l.label}
                    {l.quantity > 1 && (
                      <span className="text-gray-500"> × {l.quantity}</span>
                    )}
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <b>{tl(l.unitPrice * l.quantity)}</b>
                    <button
                      onClick={() => removeLine(l.key)}
                      className="rounded px-2 text-red-600"
                    >
                      ✕
                    </button>
                  </span>
                </div>
              ))}
            </div>

            <div className="mb-2 flex justify-between text-xl font-bold">
              <span>TOPLAM</span>
              <span>{tl(cartTotal)}</span>
            </div>

            {formError && (
              <p className="mb-2 text-sm text-red-600">{formError}</p>
            )}

            {!mixedOpen ? (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => submitSale(cartTotal, 0)}
                    disabled={saving}
                    className="rounded-xl bg-green-600 p-4 text-xl font-bold text-white disabled:opacity-50"
                  >
                    NAKİT
                  </button>
                  <button
                    onClick={() => submitSale(0, cartTotal)}
                    disabled={saving}
                    className="rounded-xl bg-blue-600 p-4 text-xl font-bold text-white disabled:opacity-50"
                  >
                    KART
                  </button>
                </div>
                <button
                  onClick={() => {
                    setMixedOpen(true);
                    setCashInput("");
                    setFormError(null);
                  }}
                  className="mt-1 w-full p-1 text-sm text-gray-500 underline"
                >
                  karma ödeme
                </button>
              </>
            ) : (
              <div>
                <input
                  value={cashInput}
                  onChange={(e) => setCashInput(e.target.value)}
                  inputMode="decimal"
                  placeholder="Nakit tutar (₺)"
                  autoFocus
                  className="mb-1 w-full rounded-xl border-2 p-3 text-center text-2xl font-bold"
                />
                <p className="mb-2 text-center text-sm text-gray-600">
                  Kart:{" "}
                  {tl(
                    Math.max(
                      0,
                      cartTotal - (Number(cashInput.replace(",", ".")) || 0),
                    ),
                  )}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setMixedOpen(false)}
                    className="rounded-xl bg-gray-200 p-3 text-lg font-semibold"
                  >
                    Vazgeç
                  </button>
                  <button
                    onClick={submitMixed}
                    disabled={saving}
                    className="rounded-xl bg-green-600 p-3 text-lg font-bold text-white disabled:opacity-50"
                  >
                    TAMAMLA
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
