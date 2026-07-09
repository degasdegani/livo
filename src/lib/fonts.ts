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
