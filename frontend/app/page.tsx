"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { themeOf } from "@/lib/colors";

type Label = {
  id: number;
  name: string;
  sortOrder: number;
  isActive: boolean;
  parentId: number | null;
  price: number | null; // sabit fiyat; null = satışta sorulur
  isPinned: boolean;
  color: string | null;
};

// Fiyat paneli neyi satıyor? (ad + varsa sabit fiyat)
type Picked = { name: string; price: number | null };

type CartLine = {
  key: string;
  label: string;
  unitPrice: number;
  quantity: number;
};

const tl = (n: number) => "₺" + n.toLocaleString("tr-TR");

// Etiket adına göre simge (bulamazsa genel etiket simgesi)
const ICONS: Record<string, string> = {
  Pantolon: "👖",
  Gömlek: "👔",
  Tişört: "👕",
  Takım: "🤵",
  Valiz: "🧳",
  Elbise: "👗",
  Etek: "👗",
  Mont: "🧥",
  Ceket: "🧥",
  Çorap: "🧦",
  Ayakkabı: "👟",
  Kazak: "🧶",
  Şort: "🩳",
};
const iconFor = (name: string) => ICONS[name] ?? "🏷️";

export default function SatisPage() {
  // ═══ BÖLGE 1: HAFIZA ═══
  const [labels, setLabels] = useState<Label[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [parent, setParent] = useState<Label | null>(null);
  const [selected, setSelected] = useState<Picked | null>(null);
  const [price, setPrice] = useState("");
  const [qty, setQty] = useState(1);

  const [cart, setCart] = useState<CartLine[]>([]);
  const [mixedOpen, setMixedOpen] = useState(false);
  const [cashInput, setCashInput] = useState("");

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Son kaydedilen fiş: "geri al" için id'sini ve satırlarını saklıyoruz
  const [lastSale, setLastSale] = useState<{
    id: number;
    lines: CartLine[];
    total: number;
  } | null>(null);

  const [summary, setSummary] = useState<{
    expectedCash: number;
    itemCount: number;
    total: number;
  } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // ═══ TÜRETİLMİŞ DEĞERLER ═══
  const roots = labels.filter((l) => l.parentId === null);
  const visibleLabels = parent
    ? labels.filter((l) => l.parentId === parent.id)
    : roots;
  const cartTotal = cart.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);

  // ═══ BÖLGE 2: EYLEMLER ═══
  useEffect(() => {
    apiFetch(`/api/labels`)
      .then((r) => {
        if (!r.ok) throw new Error(`API hatası: ${r.status}`);
        return r.json();
      })
      .then(setLabels)
      .catch((e) => setError(e.message));
  }, []);

  // Bugünkü özet (satış sonrası tazelenir)
  useEffect(() => {
    let ignore = false;
    const today = new Date().toISOString().slice(0, 10);
    apiFetch(`/api/reports/daily?date=${today}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!ignore && d)
          setSummary({
            expectedCash: d.expectedCash,
            itemCount: d.itemCount,
            total: d.total,
          });
      })
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, [refreshKey]);

  function onLabelClick(l: Label) {
    if (labels.some((x) => x.parentId === l.id)) {
      setParent(l);
      return;
    }
    setSelected({
      name: parent ? `${parent.name} - ${l.name}` : l.name,
      price: l.price,
    });
    setPrice("");
    setQty(1);
    setFormError(null);
  }

  function addToCart() {
    if (!selected) return;

    // Sabit fiyatlı ürünse fiyat sorulmadı; kutudan değil üründen alınır.
    const unitPrice = selected.price ?? Number(price.replace(",", "."));
    if (!unitPrice || unitPrice <= 0) {
      setFormError("Geçerli bir fiyat gir.");
      return;
    }
    setCart((c) => {
      // Aynı ürün + aynı fiyat zaten sepetteyse yeni satır açma, adedini artır
      const i = c.findIndex(
        (l) => l.label === selected.name && l.unitPrice === unitPrice
      );
      if (i === -1) {
        return [
          ...c,
          {
            key: crypto.randomUUID(),
            label: selected.name,
            unitPrice,
            quantity: qty,
          },
        ];
      }
      return c.map((l, idx) =>
        idx === i ? { ...l, quantity: l.quantity + qty } : l
      );
    });
    setSelected(null);
    setParent(null);
    setLastSale(null);
  }

  function removeLine(key: string) {
    setCart((c) => c.filter((l) => l.key !== key));
  }

  // Sepetteki satırın adedini değiştir; 0'a inerse satır silinir
  function changeQty(key: string, delta: number) {
    setCart((c) =>
      c
        .map((l) =>
          l.key === key ? { ...l, quantity: l.quantity + delta } : l
        )
        .filter((l) => l.quantity > 0)
    );
  }

  async function submitSale(cashAmount: number, cardAmount: number) {
    if (cart.length === 0) return;
    setSaving(true);
    setFormError(null);
    try {
      const r = await apiFetch(`/api/sales`, {
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
      // Oluşan fişin id'sini sakla ki "geri al" çalışabilsin
      const created = await r.json().catch(() => null);
      setLastSale(
        created?.id
          ? { id: created.id, lines: cart, total: cartTotal }
          : null
      );
      setCart([]);
      setMixedOpen(false);
      setCashInput("");
      setRefreshKey((k) => k + 1);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Bağlantı hatası");
    } finally {
      setSaving(false);
    }
  }

  // Son fişi sil ve sepeti geri getir — yanlış kaydı anında düzeltmek için
  async function undoLastSale() {
    if (!lastSale) return;
    setSaving(true);
    setFormError(null);
    try {
      const r = await apiFetch(`/api/sales/${lastSale.id}`, {
        method: "DELETE",
      });
      if (!r.ok) throw new Error(`Geri alınamadı: ${r.status}`);
      setCart(lastSale.lines);
      setLastSale(null);
      setRefreshKey((k) => k + 1);
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

  // ═══ BÖLGE 3: GÖRÜNÜM ═══
  if (error)
    return (
      <div className="mx-auto max-w-md p-6">
        <div className="rounded-2xl bg-red-50 p-5 text-red-700">
          Bağlantı sorunu: {error}
        </div>
      </div>
    );

  // ── HAL A: fiyat ekranı (tam ekran) ──
  if (selected) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-100">
        <header className="rounded-b-3xl bg-gradient-to-br from-emerald-600 to-green-500 px-5 pb-10 pt-6">
          <div className="mx-auto flex max-w-md items-center justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <button
                onClick={() => setSelected(null)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 text-2xl text-white"
              >
                ←
              </button>
              <h2 className="truncate text-2xl font-bold text-white">
                {selected.name}
              </h2>
            </div>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 text-xl">
              🛍️
            </span>
          </div>
        </header>

        <div className="mx-auto -mt-6 max-w-md px-5">
          <div className="rounded-3xl bg-white p-5 shadow-sm">
            {selected.price != null ? (
              // Sabit fiyatlı ürün: fiyat sorulmaz, sadece gösterilir
              <div className="mb-6 rounded-2xl bg-emerald-50 p-5 text-center">
                <p className="text-sm font-semibold text-emerald-700">Fiyat</p>
                <p className="text-4xl font-bold text-emerald-700">
                  {tl(selected.price)}
                </p>
              </div>
            ) : (
              <>
                <label className="mb-2 block text-sm font-semibold text-slate-500">
                  Fiyat (₺)
                </label>
                <input
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  inputMode="decimal"
                  placeholder="0,00"
                  autoFocus
                  className="mb-6 w-full rounded-2xl bg-slate-100 p-5 text-center text-4xl font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </>
            )}

            <label className="mb-2 block text-sm font-semibold text-slate-500">
              Adet
            </label>
            <div className="flex items-center justify-center gap-8">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="h-14 w-14 rounded-2xl bg-slate-100 text-3xl font-bold text-slate-600"
              >
                −
              </button>
              <span className="w-16 text-center text-4xl font-bold">{qty}</span>
              <button
                onClick={() => setQty((q) => q + 1)}
                className="h-14 w-14 rounded-2xl bg-slate-100 text-3xl font-bold text-slate-600"
              >
                +
              </button>
            </div>
          </div>

          {formError && (
            <p className="mt-4 rounded-2xl bg-red-50 p-4 text-center font-semibold text-red-600">
              {formError}
            </p>
          )}

          <button
            onClick={addToCart}
            className="mt-5 w-full rounded-2xl bg-emerald-600 p-5 text-xl font-bold tracking-wide text-white shadow-lg shadow-emerald-600/30 active:bg-emerald-700"
          >
            SEPETE EKLE
          </button>
          <button
            onClick={() => setSelected(null)}
            className="mt-3 w-full rounded-2xl bg-white p-4 text-lg font-semibold text-slate-500"
          >
            Vazgeç
          </button>
        </div>
      </div>
    );
  }

  // ── HAL B: ana ekran ──
  return (
    <main className={`mx-auto max-w-md ${cart.length ? "pb-72" : ""}`}>
      {/* başlık */}
      <header className="rounded-b-3xl bg-gradient-to-br from-emerald-600 to-green-500 px-5 pb-10 pt-6">
        <div className="flex items-center justify-between">
          <div className="flex min-w-0 items-center gap-3">
            {parent && (
              <button
                onClick={() => setParent(null)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 text-2xl text-white"
              >
                ←
              </button>
            )}
            <h1 className="truncate text-2xl font-bold text-white">
              {parent ? parent.name : "Satış Ekle"}
            </h1>
          </div>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 text-xl">
            🛍️
          </span>
        </div>
      </header>

      <div className="-mt-6 px-5">
        {/* ürün listesi */}
        <div className="space-y-3">
          {visibleLabels.map((l) => {
            const hasKids = labels.some((x) => x.parentId === l.id);
            // Alt listedeyken kökün rengi devam etsin
            const theme = themeOf(parent ? parent.color : l.color);
            return (
              <button
                key={l.id}
                onClick={() => onLabelClick(l)}
                className="flex w-full items-stretch overflow-hidden rounded-2xl bg-white text-left shadow-sm active:bg-slate-50"
              >
                <span className={`w-2 shrink-0 ${theme.stripe}`} />
                <span className="flex flex-1 items-center gap-4 p-4">
                  <span
                    className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-3xl ${theme.circle}`}
                  >
                    {iconFor(parent ? parent.name : l.name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-lg font-bold">
                      {l.isPinned && !parent && "📌 "}
                      {l.name}
                    </span>
                    <span className="block text-sm text-slate-400">
                      {hasKids
                        ? "Çeşit seç"
                        : l.price != null
                          ? tl(l.price)
                          : "Satış kaydet"}
                    </span>
                  </span>
                  <span className="text-2xl text-slate-300">›</span>
                </span>
              </button>
            );
          })}
        </div>

        {/* ürün yönetimi — sadece kök listede */}
        {!parent && (
          <Link
            href="/urunler"
            className="mt-3 block rounded-2xl border-2 border-dashed border-emerald-300 bg-white/60 p-4 text-center text-lg font-bold text-emerald-700"
          >
            + Ürün Ekle / Düzenle
          </Link>
        )}

        {lastSale && cart.length === 0 && (
          <div className="mt-4 flex items-center gap-3 rounded-2xl bg-emerald-50 p-4">
            <span className="flex-1 font-semibold text-emerald-700">
              {lastSale.lines.length} kalem · {tl(lastSale.total)} kaydedildi ✓
            </span>
            <button
              onClick={undoLastSale}
              disabled={saving}
              className="shrink-0 rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-600 shadow-sm disabled:opacity-40"
            >
              ↩ Geri al
            </button>
          </div>
        )}

        {/* bugünkü özet */}
        {!parent && summary && (
          <div className="mt-6 rounded-3xl bg-emerald-50/70 p-5">
            <p className="mb-4 text-center font-bold text-slate-700">
              Bugünkü Özet
            </p>
            <div className="grid grid-cols-3 text-center">
              <div>
                <p className="text-2xl">💵</p>
                <p className="text-lg font-bold">{tl(summary.expectedCash)}</p>
                <p className="text-xs text-slate-500">Kasa Nakit</p>
              </div>
              <div>
                <p className="text-2xl">🛒</p>
                <p className="text-lg font-bold">{summary.itemCount}</p>
                <p className="text-xs text-slate-500">Satılan Parça</p>
              </div>
              <div>
                <p className="text-2xl">🧾</p>
                <p className="text-lg font-bold">{tl(summary.total)}</p>
                <p className="text-xs text-slate-500">Toplam Tutar</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* sepet */}
      {cart.length > 0 && (
        <div className="fixed bottom-16 left-0 right-0 z-40">
          <div className="mx-auto max-w-md rounded-t-3xl bg-white p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-bold text-slate-500">
                Sepet ({cart.length})
              </span>
              <span className="text-2xl font-bold text-emerald-600">
                {tl(cartTotal)}
              </span>
            </div>

            <div className="mb-3 max-h-36 overflow-y-auto">
              {cart.map((l) => (
                <div
                  key={l.key}
                  className="flex items-center gap-2 border-b border-slate-100 py-2 text-sm"
                >
                  {/* adet kontrolü: − 2 + */}
                  <span className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => changeQty(l.key, -1)}
                      className="h-7 w-7 rounded-lg bg-slate-100 text-lg font-bold leading-none text-slate-600"
                    >
                      −
                    </button>
                    <span className="w-5 text-center font-bold">
                      {l.quantity}
                    </span>
                    <button
                      onClick={() => changeQty(l.key, 1)}
                      className="h-7 w-7 rounded-lg bg-slate-100 text-lg font-bold leading-none text-slate-600"
                    >
                      +
                    </button>
                  </span>

                  <span className="min-w-0 flex-1 truncate">{l.label}</span>

                  <b className="shrink-0">{tl(l.unitPrice * l.quantity)}</b>
                  <button
                    onClick={() => removeLine(l.key)}
                    className="shrink-0 text-red-500"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            {formError && (
              <p className="mb-2 text-sm font-semibold text-red-600">
                {formError}
              </p>
            )}

            {!mixedOpen ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => submitSale(cartTotal, 0)}
                    disabled={saving}
                    className="rounded-2xl bg-emerald-600 p-4 text-lg font-bold text-white shadow-lg shadow-emerald-600/30 disabled:opacity-50"
                  >
                    NAKİT
                  </button>
                  <button
                    onClick={() => submitSale(0, cartTotal)}
                    disabled={saving}
                    className="rounded-2xl bg-slate-800 p-4 text-lg font-bold text-white disabled:opacity-50"
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
                  className="mt-2 w-full p-1 text-sm font-semibold text-slate-400"
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
                  className="mb-1 w-full rounded-2xl bg-slate-100 p-3 text-center text-2xl font-bold outline-none"
                />
                <p className="mb-2 text-center text-sm text-slate-500">
                  Kart:{" "}
                  {tl(
                    Math.max(
                      0,
                      cartTotal - (Number(cashInput.replace(",", ".")) || 0),
                    ),
                  )}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setMixedOpen(false)}
                    className="rounded-2xl bg-slate-100 p-3 font-semibold text-slate-600"
                  >
                    Vazgeç
                  </button>
                  <button
                    onClick={submitMixed}
                    disabled={saving}
                    className="rounded-2xl bg-emerald-600 p-3 font-bold text-white disabled:opacity-50"
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
