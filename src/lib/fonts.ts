// LIVO-032-A — Fonte do site institucional (livobarber.com.br).
// Poppins via next/font/google (self-hosted no build, sem CDN externo).
// Uso exclusivo em src/components/landing/**, /produto e /planos.
// NÃO usar no dashboard — telas logadas mantêm a fonte Satoshi (globals.css).
import { Poppins } from "next/font/google";

export const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-poppins",
  display: "swap",
});

// LIVO-061 — Fonte do fluxo público de agendamento (livobarber.com.br/[slug]/**).
// Inter Tight via next/font/google (self-hosted no build, sem CDN externo).
// Uso exclusivo em src/app/[slug]/**. NÃO usar no dashboard (Satoshi) nem no
// institucional (Poppins) — mesmo princípio de isolamento por contexto visual.
import { Inter_Tight } from "next/font/google";

export const interTight = Inter_Tight({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-inter-tight",
  display: "swap",
});
