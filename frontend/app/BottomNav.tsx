"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Satış", icon: "🛍️" },
  { href: "/rapor", label: "Gün Sonu", icon: "📊" },
  { href: "/gider", label: "Gider", icon: "👛" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-md">
        {TABS.map((t) => {
          const active = pathname === t.href;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-bold ${
                active ? "text-emerald-600" : "text-slate-400"
              }`}
            >
              <span
                className={`text-xl ${active ? "" : "opacity-50 grayscale"}`}
              >
                {t.icon}
              </span>
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
