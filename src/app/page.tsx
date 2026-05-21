// ============================================================
// LIVO — Landing Page
// Página principal de marketing do produto
// Monta todos os componentes da landing em ordem
// ============================================================

import { Features } from "@/components/landing/features";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Navbar } from "@/components/landing/navbar";

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <Hero />
      <Features />
      <HowItWorks />
    </>
  );
}
