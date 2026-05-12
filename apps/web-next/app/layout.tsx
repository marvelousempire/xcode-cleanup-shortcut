import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cleanup Hub · Next",
  description: "Cleanup Hub — Next.js surface (experimental, alongside the Vite app at /).",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="antialiased">
      <body className="bg-bg-1 text-fg">{children}</body>
    </html>
  );
}
