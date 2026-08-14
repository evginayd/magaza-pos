"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { API } from "@/lib/api";

type Label = {
  id: number;
  name: string;
  sortOrder: number;
  isActive: boolean;
  parentId: number | null;
};

export default function UrunlerPage() {
  // ═══ BÖLGE 1: HAFIZA ═══
  const [labels, setLabels] = useState<Label[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [openId, setOpenId] = useState<number | null>(null); // düzenlenen ürün
  const [newRoot, setNewRoot] = useState(""); // yeni ürün adı
  const [addingRoot, setAddingRoot] = useState(false); // "Yeni Ürün" formu açık mı
  const [editName, setEditName] = useState(""); // düzenleme ekranındaki isim
  const [newChild, setNewChild] = useState(""); // yeni çeşit adı
  const [busy, setBusy] = useState(false);

  // ═══ TÜRETİLMİŞ ═══
  const roots = labels.filter((l) => l.parentId === null);
  const open = labels.find((l) => l.id === openId) ?? null;
  const children = open ? labels.filter((l) => l.parentId === open.id) : [];

  // ═══ BÖLGE 2: EYLEMLER ═══
  useEffect(() => {
    let ignore = false;
    fetch(`${API}/api/labels`)
      .then((r) => {
        if (!r.ok) throw new Error(`API hatası: ${r.status}`);
        return r.json();
      })
      .then((d) => {
        if (!ignore) {
          setLabels(d);
          setError(null);
        }
      })
      .catch((e) => {
        if (!ignore) setError(e.message);
      });
    return () => {
      ignore = true;
    };
  }, [refreshKey]);

  // Tüm yazma işlemleri aynı kalıptan geçsin: hata yakalama tek yerde.
  async function send(url: string, method: string, body?: unknown) {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!r.ok) {
        const b = await r.json().catch(() => null);
        throw new Error(b?.error ?? `Sunucu hatası: ${r.status}`);
      }
      setRefreshKey((k) => k + 1);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bağlantı hatası");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function addRoot() {
    if (!newRoot.trim()) return;
    if (await send(`${API}/api/labels`, "POST", { name: newRoot.trim() })) {
      setNewRoot("");
      setAddingRoot(false);
    }
  }

  async function addChild() {
    if (!newChild.trim() || !open) return;
    if (
      await send(`${API}/api/labels`, "POST", {
        name: newChild.trim(),
        parentId: open.id,
      })
    ) {
      setNewChild("");
    }
  }

  async function rename() {
    if (!open || !editName.trim() || editName.trim() === open.name) return;
    await send(`${API}/api/labels/${open.id}`, "PUT", {
      name: editName.trim(),
    });
  }

  async function removeChild(id: number, name: string) {
    if (!confirm(`"${name}" çeşidi listeden kalkacak. Emin misin?`)) return;
    await send(`${API}/api/labels/${id}`, "DELETE");
  }

  async function removeRoot() {
    if (!open) return;
    if (
      !confirm(
        `"${open.name}" ve tüm çeşitleri listeden kalkacak. Geçmiş satışlar etkilenmez. Emin misin?`
      )
    )
      return;
    if (await send(`${API}/api/labels/${open.id}`, "DELETE")) {
      setOpenId(null);
    }
  }

  // ═══ BÖLGE 3: GÖRÜNÜM ═══

  // ── HAL A: bir ürünü düzenleme ekranı ──
  if (open) {
    return (
      <main className="mx-auto max-w-md">
        <header className="rounded-b-3xl bg-gradient-to-br from-emerald-600 to-green-500 px-5 pb-10 pt-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setOpenId(null)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 text-2xl text-white"
            >
              ←
            </button>
            <h1 className="truncate text-2xl font-bold text-white">
              {open.name}
            </h1>
          </div>
        </header>

        <div className="-mt-6 px-5">
          {error && (
            <p className="mb-3 rounded-2xl bg-red-50 p-4 text-red-700">
              {error}
            </p>
          )}

          {/* isim değiştir */}
          <div className="mb-4 rounded-3xl bg-white p-5 shadow-sm">
            <label className="mb-2 block text-sm font-semibold text-slate-500">
              Ürün adı
            </label>
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="mb-3 w-full rounded-2xl bg-slate-100 p-4 text-lg font-bold outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              onClick={rename}
              disabled={busy || !editName.trim() || editName.trim() === open.name}
              className="w-full rounded-2xl bg-emerald-600 p-3 font-bold text-white disabled:opacity-40"
            >
              İsmi Kaydet
            </button>
          </div>

          {/* çeşitler */}
          <div className="mb-4 rounded-3xl bg-white p-5 shadow-sm">
            <p className="mb-3 font-bold text-slate-700">
              Çeşitler ({children.length})
            </p>

            {children.length === 0 && (
              <p className="mb-3 text-sm text-slate-400">
                Çeşit yok. Bu ürüne satış ekranından tek dokunuşla fiyat
                girilir.
              </p>
            )}

            {children.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between border-b border-slate-100 py-2.5"
              >
                <span className="truncate">{c.name}</span>
                <button
                  onClick={() => removeChild(c.id, c.name)}
                  disabled={busy}
                  className="shrink-0 rounded-lg px-3 py-1 text-sm font-semibold text-red-600"
                >
                  Sil
                </button>
              </div>
            ))}

            <div className="mt-4 flex gap-2">
              <input
                value={newChild}
                onChange={(e) => setNewChild(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addChild()}
                placeholder="Yeni çeşit (örn. Yakalı)"
                className="min-w-0 flex-1 rounded-2xl bg-slate-100 p-3 outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                onClick={addChild}
                disabled={busy || !newChild.trim()}
                className="shrink-0 rounded-2xl bg-emerald-600 px-5 font-bold text-white disabled:opacity-40"
              >
                Ekle
              </button>
            </div>
          </div>

          {/* sil */}
          <button
            onClick={removeRoot}
            disabled={busy}
            className="mb-4 w-full rounded-2xl bg-red-50 p-4 font-bold text-red-600"
          >
            Bu ürünü sil
          </button>
        </div>
      </main>
    );
  }

  // ── HAL B: ürün listesi ──
  return (
    <main className="mx-auto max-w-md">
      <header className="rounded-b-3xl bg-gradient-to-br from-emerald-600 to-green-500 px-5 pb-10 pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20 text-2xl text-white"
            >
              ←
            </Link>
            <h1 className="text-2xl font-bold text-white">Ürünler</h1>
          </div>
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20 text-xl">
            🏷️
          </span>
        </div>
      </header>

      <div className="-mt-6 px-5">
        {error && (
          <p className="mb-3 rounded-2xl bg-red-50 p-4 text-red-700">{error}</p>
        )}

        <div className="space-y-3">
          {roots.map((l) => {
            const count = labels.filter((x) => x.parentId === l.id).length;
            return (
              <button
                key={l.id}
                onClick={() => {
                  setOpenId(l.id);
                  setEditName(l.name);
                  setNewChild("");
                  setError(null);
                }}
                className="flex w-full items-center gap-4 rounded-2xl bg-white p-4 text-left shadow-sm active:bg-emerald-50"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-lg font-bold">
                    {l.name}
                  </span>
                  <span className="block text-sm text-slate-400">
                    {count > 0 ? `${count} çeşit` : "Çeşit yok"}
                  </span>
                </span>
                <span className="text-2xl text-emerald-600">›</span>
              </button>
            );
          })}
        </div>

        {/* yeni ürün */}
        {addingRoot ? (
          <div className="mt-3 rounded-2xl bg-white p-4 shadow-sm">
            <input
              value={newRoot}
              onChange={(e) => setNewRoot(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addRoot()}
              placeholder="Ürün adı (örn. Tişört)"
              autoFocus
              className="mb-3 w-full rounded-2xl bg-slate-100 p-4 text-lg font-bold outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setAddingRoot(false);
                  setNewRoot("");
                  setError(null);
                }}
                className="rounded-2xl bg-slate-100 p-3 font-semibold text-slate-600"
              >
                Vazgeç
              </button>
              <button
                onClick={addRoot}
                disabled={busy || !newRoot.trim()}
                className="rounded-2xl bg-emerald-600 p-3 font-bold text-white disabled:opacity-40"
              >
                Ekle
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAddingRoot(true)}
            className="mt-3 w-full rounded-2xl border-2 border-dashed border-emerald-300 bg-white/60 p-4 text-lg font-bold text-emerald-700"
          >
            + Yeni Ürün Ekle
          </button>
        )}

        <p className="mt-4 px-2 text-sm text-slate-400">
          Ürün silmek geçmiş satışları etkilemez — satışlarda ürünün o günkü
          adı saklanır.
        </p>
      </div>
    </main>
  );
}
