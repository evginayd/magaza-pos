import type { Metadata, Viewport } from "next";
import "./globals.css";
import BottomNav from "./BottomNav";
import AuthGate from "./AuthGate";

export const metadata: Metadata = {
  title: "Mağaza",
  description: "Mağaza satış defteri",
  appleWebApp: { capable: true, title: "Mağaza", statusBarStyle: "default" },
};

// Telefonun durum çubuğu yeşil başlıkla aynı renkte olsun
export const viewport: Viewport = {
  themeColor: "#059669",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body className="bg-slate-100 pb-20 text-slate-900">
        <AuthGate>
          {children}
          <BottomNav />
        </AuthGate>
      </body>
    </html>
  );
}
