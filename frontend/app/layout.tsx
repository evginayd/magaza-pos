import type { Metadata } from "next";
import "./globals.css";
import BottomNav from "./BottomNav";

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
      <body className="bg-slate-100 pb-20 text-slate-900">
        {children}
        <BottomNav />
      </body>
    </html>
  );
}
