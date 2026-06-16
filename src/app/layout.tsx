// src/app/layout.tsx
import { ToastProvider } from "@/components/ui/toast";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LIVO — O sistema operacional da barbearia moderna",
  description:
    "Gerencie sua barbearia com agenda, PDV, comissões e muito mais. Experimente grátis por 30 dias.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        style={{ transition: "background-color 150ms ease, color 150ms ease" }}
      >
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
