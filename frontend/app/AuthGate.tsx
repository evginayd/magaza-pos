"use client";

import { useEffect, useState } from "react";
import { API, getKey, setKey } from "@/lib/api";

/**
 * Uygulamanın kapısı: kayıtlı şifre yoksa giriş ekranı gösterir.
 * Şifre localStorage'da saklandığı için giriş ÖMÜRDE BİR KEZ yapılır;
 * tarayıcı/telefon kapansa da kalır.
 */
export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState(false);
  const [ready, setReady] = useState(false); // localStorage okundu mu?

  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // localStorage'a ancak tarayıcıda erişilebilir → effect içinde okuyoruz
  useEffect(() => {
    setAuthed(!!getKey());
    setReady(true);
  }, []);

  async function login() {
    const value = password.trim();
    if (!value) return;

    setBusy(true);
    setError(null);
    try {
      // Şifreyi kaydetmeden ÖNCE doğrula: yanlışsa kaydetmeyelim
      const r = await fetch(`${API}/api/auth/check`, {
        headers: { "X-Api-Key": value },
      });
      if (r.status === 401) {
        setError("Şifre hatalı.");
        return;
      }
      if (!r.ok) throw new Error(`Sunucu hatası: ${r.status}`);

      setKey(value);
      setAuthed(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bağlantı hatası");
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return null; // ilk anlık boşluk: yanıp sönme olmasın
  if (authed) return <>{children}</>;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-600 text-4xl">
          🛍️
        </div>
        <h1 className="text-2xl font-bold">Mağaza</h1>
        <p className="text-slate-500">Devam etmek için şifreyi girin</p>
      </div>

      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && login()}
        placeholder="Şifre"
        autoFocus
        className="mb-3 w-full rounded-2xl bg-white p-5 text-center text-xl font-bold shadow-sm outline-none focus:ring-2 focus:ring-emerald-500"
      />

      {error && (
        <p className="mb-3 rounded-2xl bg-red-50 p-3 text-center font-semibold text-red-600">
          {error}
        </p>
      )}

      <button
        onClick={login}
        disabled={busy || !password.trim()}
        className="w-full rounded-2xl bg-emerald-600 p-5 text-xl font-bold text-white shadow-lg shadow-emerald-600/30 disabled:opacity-40"
      >
        {busy ? "Kontrol ediliyor..." : "GİRİŞ"}
      </button>

      <p className="mt-6 text-center text-sm text-slate-400">
        Şifre bu cihazda saklanır, bir daha sorulmaz.
      </p>
    </main>
  );
}
