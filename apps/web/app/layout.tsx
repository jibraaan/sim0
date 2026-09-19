import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import "./globals.css";

const archivo = Archivo({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-archivo" });

export const metadata: Metadata = {
  title: "Sim0",
  description: "Simulate zero data debt",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Intentionally bare - the dashboard's sidebar chrome lives in (app)/layout.tsx so
  // the public landing/login routes render full-bleed instead of inside the app shell.
  return (
    <html lang="en" className={archivo.variable}>
      <body className="font-sans antialiased bg-paper text-ink">{children}</body>
    </html>
  );
}
