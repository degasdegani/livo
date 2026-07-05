// ============================================================
// LIVO — Página /planos
// Comparativo completo de planos (Start, Pro, Prime) com preços e trials
// reais vindos de PLAN_PRICING + TRIAL_DAYS.
// ============================================================

import { Footer } from "@/components/landing/footer";
import { Navbar } from "@/components/landing/navbar";
import { Plans } from "@/components/landing/plans";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Planos e preços — LIVO",
  description:
    "Start a partir de R$ 59,90/mês e Pro por R$ 169,90/mês. Teste grátis de 7 a 15 dias, conforme o plano. Sem surpresas, sem letra miúda.",
};

export default function PlanosPage() {
  return (
    <>
      <Navbar />
      {/* Comparativo completo: 3 cards */}
      <Plans variant="full" />
      <Footer />
    </>
  );
}
