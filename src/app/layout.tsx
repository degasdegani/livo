import type { Metadata } from "next";
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
    "inteligência artificial",
  ],
  authors: [{ name: "Livo", url: "https://livo.com.br" }],
  creator: "Livo",
  metadataBase: new URL("https://livo.com.br"),
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "https://livo.com.br",
    title: "Livo — Gestão inteligente para barbearias",
    description:
      "Sistema premium de agendamento e gestão para barbearias com inteligência artificial integrada.",
    siteName: "Livo",
  },
  twitter: {
    card: "summary_large_image",
    title: "Livo — Gestão inteligente para barbearias",
    description:
      "Sistema premium de agendamento e gestão para barbearias com inteligência artificial integrada.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark" suppressHydrationWarning>
      <head>
        {/* Satoshi — fonte premium principal do Livo (Fontshare) */}
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
          min-h-screen
          bg-background
          text-foreground
          antialiased
        `}
      >
        {children}
      </body>
    </html>
  );
}
