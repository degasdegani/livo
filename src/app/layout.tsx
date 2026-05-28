// ============================================================
// LIVO — Root Layout
// Envolve toda a aplicação com o SessionProvider do Auth.js
// ============================================================

import { auth } from "@/auth";
import type { Metadata } from "next";
import { SessionProvider } from "next-auth/react";
import { Instrument_Serif, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "500", "600"],
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
  weight: ["400"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: {
    default: "Livo — Gestão inteligente para barbearias",
    template: "%s | Livo",
  },
  description:
    "Sistema premium de agendamento e gestão para barbearias com inteligência artificial integrada.",
  keywords: [
    "barbearia",
    "agendamento",
    "gestão",
    "sistema",
    "software",
    "SaaS",
  ],
  authors: [{ name: "Livo", url: "https://livobarber.com.br" }],
  creator: "Livo",
  metadataBase: new URL("https://livobarber.com.br"),
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "https://livobarber.com.br",
    title: "Livo — Gestão inteligente para barbearias",
    description: "Sistema premium de agendamento e gestão para barbearias.",
    siteName: "Livo",
  },
  robots: { index: true, follow: true },
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Pega a sessão atual no servidor para passar ao SessionProvider
  // Evita flash de conteúdo não autenticado
  const session = await auth();

  return (
    <html lang="pt-BR" className="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link
          href="https://api.fontshare.com/v2/css?f[]=satoshi@300,400,500,600,700,800,900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={`
          ${inter.variable}
          ${jetbrainsMono.variable}
          ${instrumentSerif.variable}
          min-h-screen bg-background text-foreground antialiased
        `}
      >
        {/* SessionProvider torna a sessão acessível em toda a aplicação */}
        <SessionProvider session={session}>{children}</SessionProvider>
      </body>
    </html>
  );
}
