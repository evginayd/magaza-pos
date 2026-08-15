// Ortam değişkeni varsa onu kullan, yoksa yerel geliştirme adresi
export const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5201";

const STORAGE_KEY = "magaza_key";

// localStorage sadece tarayıcıda var; sunucuda çizilirken (SSR) yok.
export const getKey = () =>
  typeof window === "undefined" ? null : localStorage.getItem(STORAGE_KEY);

export const setKey = (k: string) => localStorage.setItem(STORAGE_KEY, k);

export const clearKey = () => localStorage.removeItem(STORAGE_KEY);

/**
 * Tüm API çağrıları buradan geçer:
 *  - şifreyi X-Api-Key başlığına ekler
 *  - 401 gelirse kayıtlı şifreyi siler ve giriş ekranına döner
 * Kullanım: apiFetch("/api/sales", { method: "POST", body: ... })
 */
export async function apiFetch(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  const key = getKey();
  if (key) headers.set("X-Api-Key", key);

  const res = await fetch(`${API}${path}`, { ...init, headers });

  if (res.status === 401) {
    clearKey();
    window.location.reload();
  }

  return res;
}
