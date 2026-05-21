// ============================================================
// LIVO — Landing Page
// Página principal de marketing do produto
// Monta todos os componentes da landing em ordem
// ============================================================

import { AISection } from "@/components/landing/ai-section";
import { Features } from "@/components/landing/features";
import { Footer } from "@/components/landing/footer";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Navbar } from "@/components/landing/navbar";
import { Partnership } from "@/components/landing/partnership";
import { Plans } from "@/components/landing/plans";

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <Hero />
      <Features />
      <HowItWorks />
      <AISection />
      <Plans />
      <Partnership />
      <Footer />
    </>
  );
}
