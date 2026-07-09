import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { poppins } from "@/lib/fonts";
import { PLAN_PRICING, TRIAL_DAYS } from "@/lib/pricing";
import { Check, X } from "lucide-react";

// Formata reais no padrão pt-BR (59.9 -> "59,90"; 1839.9 -> "1.839,90").
const brl = (v: number) =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type PlanCard = {
  name: string;
  // "money" mostra "R$ <valor> /mês"; "soon" mostra "Em breve".
  priceType: "money" | "soon";
  price: string;
  annualNote?: string;
  desc: string;
  featured: boolean;
  cta: string;
  ctaHref: string;
  features: { text: string; ok: boolean }[];
};

// Fonte de preço/trial: PLAN_PRICING + TRIAL_DAYS (fonte única, sem hardcode).
const PLANS: PlanCard[] = [
  {
    name: "Livo Start",
    priceType: "money",
    price: brl(PLAN_PRICING.start.monthly), // 59,90
    desc: "Para o barbeiro solo que está digitalizando o negócio.",
    featured: false,
    cta: `Começar grátis — ${TRIAL_DAYS.start} dias`,
    ctaHref: "/onboarding",
    features: [
      { text: "1 profissional", ok: true },
      { text: "Agendamentos ilimitados", ok: true },
      { text: "Página pública personalizada", ok: true },
      { text: "Confirmação por e-mail", ok: true },
      { text: "Dashboard básico", ok: true },
      { text: "CRM de clientes", ok: false },
      { text: "Comandas e estoque", ok: false },
      { text: "Relatórios financeiros", ok: false },
      { text: "Lívia IA", ok: false },
    ],
  },
  {
    name: "Livo Pro",
    priceType: "money",
    price: brl(PLAN_PRICING.pro.monthly), // 169,90
    annualNote: PLAN_PRICING.pro.yearly
      ? `ou R$ ${brl(PLAN_PRICING.pro.yearly)}/ano`
      : undefined, // 1.839,90/ano
    desc: "Para barbearias estabelecidas que querem crescer.",
    featured: true,
    cta: `Começar grátis — ${TRIAL_DAYS.pro} dias`,
    ctaHref: "/onboarding",
    features: [
      { text: "Até 3 profissionais", ok: true },
      { text: "Agendamentos ilimitados", ok: true },
      { text: "CRM de clientes completo", ok: true },
      { text: "Comandas e controle de estoque", ok: true },
      { text: "Relatórios financeiros", ok: true },
      { text: "Comissões por barbeiro", ok: true },
      { text: "Lívia IA — assistente inteligente", ok: true },
      { text: "Suporte via WhatsApp", ok: true },
      { text: "Pagamento online integrado", ok: false },
    ],
  },
  {
    name: "Livo Prime",
    priceType: "soon",
    price: "Em breve",
    desc: "Para barbearias premium com máximo em IA e automação.",
    featured: false,
    cta: "Entrar na lista de espera",
    ctaHref: "/vip",
    features: [
      { text: "Profissionais ilimitados", ok: true },
      { text: "Tudo do Pro", ok: true },
      { text: "WhatsApp automático", ok: true },
      { text: "Lembretes automáticos", ok: true },
      { text: "Relatórios PDF e Excel", ok: true },
      { text: "Campanhas automáticas", ok: true },
      { text: "Assistente IA no WhatsApp", ok: true },
      { text: "PWA no celular", ok: true },
      { text: "Pagamento online integrado", ok: true },
    ],
  },
];

interface PlansProps {
  // "full" = 3 cards (Start + Pro + Prime), usado em /planos.
  // "summary" = 2 cards (Start + Pro) + CTA para o comparativo, usado na Home.
  variant?: "full" | "summary";
}

export function Plans({ variant = "full" }: PlansProps) {
  const isSummary = variant === "summary";
  // Resumo da Home mostra só Start + Pro (sem Prime).
  const plans = isSummary
    ? PLANS.filter((p) => p.name !== "Livo Prime")
    : PLANS;

  return (
    <Section id={isSummary ? undefined : "planos"} padding="xl" className="bg-black">
      <Container>
        <div className="text-center mb-16">
          <p
            className="text-xs font-semibold tracking-widest uppercase mb-4"
            style={{ color: "var(--livo-gold-bright)" }}
          >
            Planos e preços
          </p>
          <h2
            className={`${poppins.className} mb-4`}
            style={{
              fontSize: "clamp(32px,5vw,56px)",
              fontWeight: 400,
              letterSpacing: "0.05em",
              color: "var(--livo-cream)",
            }}
          >
            Sem surpresas. Sem letra miúda.
          </h2>
          <p
            style={{
              color: "#A1A1AA",
              fontSize: "18px",
              maxWidth: "460px",
              margin: "0 auto",
              lineHeight: 1.7,
            }}
          >
            Teste grátis de {TRIAL_DAYS.start} a {TRIAL_DAYS.pro} dias, conforme o
            plano. Cancele quando quiser.
          </p>
        </div>

        <div
          className={
            isSummary
              ? "grid grid-cols-1 md:grid-cols-2 gap-5 max-w-3xl mx-auto"
              : "grid grid-cols-1 md:grid-cols-3 gap-5"
          }
        >
          {plans.map((plan) => (
            <div
              key={plan.name}
              className="rounded-2xl p-8 flex flex-col relative"
              style={{
                background: plan.featured
                  ? "linear-gradient(160deg, rgba(85,62,32,0.35), #000000)"
                  : "#0A0A0A",
                border: plan.featured
                  ? "1px solid rgba(138,100,37,0.4)"
                  : "1px solid rgba(255,255,255,0.06)",
                boxShadow: plan.featured
                  ? "0 0 60px rgba(138,100,37,0.1)"
                  : "none",
              }}
            >
              {plan.featured && (
                <span
                  className="absolute top-6 right-6 font-black rounded-full px-3 py-1"
                  style={{
                    background: "var(--livo-gold-solid)",
                    color: "var(--livo-cream)",
                    fontSize: "9px",
                    letterSpacing: "2px",
                  }}
                >
                  POPULAR
                </span>
              )}

              <p
                className="text-xs font-bold tracking-widest uppercase mb-3"
                style={{
                  color: plan.featured ? "var(--livo-gold-bright)" : "#52525B",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {plan.name}
              </p>

              <div className="flex items-baseline gap-1 mb-1">
                {plan.priceType === "money" && (
                  <span
                    style={{ color: "#A1A1AA", fontSize: "22px", fontWeight: 600 }}
                  >
                    R$
                  </span>
                )}
                <span
                  className="font-black"
                  style={{
                    fontSize: plan.priceType === "soon" ? "32px" : "56px",
                    letterSpacing: "-2px",
                    color: plan.featured ? "var(--livo-gold-bright)" : "var(--livo-cream)",
                    lineHeight: 1,
                  }}
                >
                  {plan.price}
                </span>
                {plan.priceType === "money" && (
                  <span style={{ color: "#52525B", fontSize: "14px" }}>/mês</span>
                )}
              </div>

              {/* Nota de preço anual (Pro) — altura reservada p/ alinhar cards */}
              <p
                className="mb-3 text-xs"
                style={{ color: "#52525B", minHeight: "16px" }}
              >
                {plan.annualNote ?? ""}
              </p>

              <p
                className="text-sm leading-relaxed mb-6"
                style={{ color: "#A1A1AA" }}
              >
                {plan.desc}
              </p>

              <div
                className="mb-6"
                style={{
                  height: "1px",
                  background: plan.featured
                    ? "rgba(138,100,37,0.3)"
                    : "rgba(255,255,255,0.06)",
                }}
              />

              <ul className="flex flex-col gap-3 mb-8 flex-1">
                {plan.features.map((feat) => (
                  <li key={feat.text} className="flex items-center gap-3 text-sm">
                    {feat.ok ? (
                      <Check size={14} style={{ color: "#00D4A0", flexShrink: 0 }} />
                    ) : (
                      <X size={14} style={{ color: "#3F3F46", flexShrink: 0 }} />
                    )}
                    <span style={{ color: feat.ok ? "#A1A1AA" : "#3F3F46" }}>
                      {feat.text}
                    </span>
                  </li>
                ))}
              </ul>

              <a
                href={plan.ctaHref}
                className="block text-center py-3 rounded-xl font-bold text-sm transition-all duration-200 hover:opacity-90"
                style={{
                  background: plan.featured ? "var(--livo-gold-solid)" : "rgba(255,255,255,0.04)",
                  border: plan.featured ? "none" : "1px solid rgba(255,255,255,0.1)",
                  color: "var(--livo-cream)",
                  textDecoration: "none",
                  boxShadow: plan.featured
                    ? "0 8px 24px rgba(138,100,37,0.35)"
                    : "none",
                }}
              >
                {plan.cta}
              </a>
            </div>
          ))}
        </div>

        {isSummary ? (
          <div className="text-center mt-10">
            <a
              href="/planos"
              className="inline-flex items-center gap-2 px-8 py-4 font-bold text-base rounded-xl transition-all duration-200 hover:opacity-80"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "var(--livo-cream)",
                textDecoration: "none",
              }}
            >
              Ver comparativo completo →
            </a>
          </div>
        ) : (
          <p className="text-center text-xs mt-8" style={{ color: "#3F3F46" }}>
            Sem cartão de crédito · Cancele quando quiser · Suporte em português
          </p>
        )}
      </Container>
    </Section>
  );
}
