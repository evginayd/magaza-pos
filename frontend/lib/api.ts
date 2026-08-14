// Ortam değişkeni varsa onu kullan, yoksa yerel geliştirme adresi
export const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5201";
