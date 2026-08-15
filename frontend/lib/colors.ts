/**
 * Ürün grubu renkleri.
 * DİKKAT: Tailwind sınıfları TAM METİN olarak yazılmalı — `bg-${x}-500` gibi
 * birleştirmeler derleme sırasında bulunamaz ve renk hiç uygulanmaz.
 */
export type ColorKey = "bordo" | "turuncu" | "yesil" | "mavi" | "mor";

type Theme = {
  label: string;
  stripe: string; // kartın sol kenarındaki şerit
  circle: string; // simge dairesi
  dot: string; // yönetim ekranındaki seçim noktası
};

export const COLORS: Record<ColorKey, Theme> = {
  bordo: {
    label: "Bordo",
    stripe: "bg-rose-900",
    circle: "bg-rose-100",
    dot: "bg-rose-900",
  },
  turuncu: {
    label: "Turuncu",
    stripe: "bg-orange-500",
    circle: "bg-orange-100",
    dot: "bg-orange-500",
  },
  yesil: {
    label: "Yeşil",
    stripe: "bg-emerald-600",
    circle: "bg-emerald-100",
    dot: "bg-emerald-600",
  },
  mavi: {
    label: "Mavi",
    stripe: "bg-blue-600",
    circle: "bg-blue-100",
    dot: "bg-blue-600",
  },
  mor: {
    label: "Mor",
    stripe: "bg-purple-600",
    circle: "bg-purple-100",
    dot: "bg-purple-600",
  },
};

const DEFAULT: Theme = {
  label: "Varsayılan",
  stripe: "bg-transparent",
  circle: "bg-emerald-50",
  dot: "bg-slate-300",
};

export const themeOf = (color?: string | null): Theme =>
  (color && COLORS[color as ColorKey]) || DEFAULT;
