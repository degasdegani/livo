// ============================================================
// LIVO — Landing Page (Home enxuta)
// Home resumida: Hero + prova social (3 passos) + 4 features + resumo de
// planos + Embaixadores. O conteúdo completo vive em /produto e /planos.
// ============================================================

import { Embaixadores } from "@/components/landing/embaixadores";
import { Features } from "@/components/landing/features";
import { Footer } from "@/components/landing/footer";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Navbar } from "@/components/landing/navbar";
import { Plans } from "@/components/landing/plans";

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <Hero />
      {/* 3 passos como prova social; detalhe completo em /produto */}
      <HowItWorks variant="home" />
      {/* 4 primeiras funcionalidades; todas em /produto */}
      <Features limit={4} moreHref="/produto" />
      {/* Resumo Start + Pro; comparativo completo em /planos */}
      <Plans variant="summary" />
      {/* Embaixadores permanece na Home por ora (id="embaixadores") */}
      <Embaixadores />
      <Footer />
    </>
  );
}
