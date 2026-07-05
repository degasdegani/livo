// ============================================================
// LIVO — Página /produto
// Lar real do conteúdo de produto (corrige a armadilha de âncora em que
// id="produto" apontava para "Como funciona"): funcionalidades completas,
// IA e o passo a passo detalhado.
// ============================================================

import { AISection } from "@/components/landing/ai-section";
import { Features } from "@/components/landing/features";
import { Footer } from "@/components/landing/footer";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Navbar } from "@/components/landing/navbar";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Produto — LIVO",
  description:
    "Conheça o LIVO por dentro: agenda inteligente, financeiro, CRM, comandas, IA e mais. Tudo que a sua barbearia precisa em um só sistema.",
};

export default function ProdutoPage() {
  return (
    <>
      <Navbar />
      {/* Todas as 6 funcionalidades */}
      <Features />
      {/* IA integrada (id="ia" — alvo de /produto#ia) */}
      <AISection />
      {/* Passo a passo detalhado; CTA leva aos planos */}
      <HowItWorks variant="detailed" />
      <Footer />
    </>
  );
}
