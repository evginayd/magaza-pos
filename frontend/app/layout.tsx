import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mağaza",
  description: "Mağaza satış defteri",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body className="pb-24">
        {/* alt çubuk içeriği örtmesin diye boşluk */}
        {children}

        {/* Alt sekme çubuğu — her sayfada görünür */}
        <nav className="fixed bottom-0 left-0 right-0 grid grid-cols-3 border-t bg-white">
          <Link href="/" className="p-4 text-center text-xl font-semibold">
            🛒 Satış
          </Link>
          <Link href="/rapor" className="p-4 text-center text-xl font-semibold">
            📊 Gün Sonu
          </Link>
          <Link href="/gider" className="p-4 text-center text-xl font-semibold">
            💸 Gider
          </Link>
        </nav>
      </body>
    </html>
  );
}
