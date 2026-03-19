import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "QR Menü",
  description: "Dijital QR menü yönetim sistemi",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
