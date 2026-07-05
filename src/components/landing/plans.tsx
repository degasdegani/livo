import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { Check, X } from "lucide-react";

const PLANS = [
  {
    name: "Livo Start",
    price: "Trial",
    originalPrice: undefined,
    desc: "Para o barbeiro solo que está digitalizando o negócio.",
    featured: false,
    cta: "Começar grátis — 30 dias",
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
    price: "197",
    originalPrice: undefined,
    desc: "Para barbearias estabelecidas que querem crescer.",
    featured: true,
    cta: "Começar grátis — 30 dias",
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
    price: "Em breve",
    originalPrice: undefined,
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

export function Plans() {
  return (
    <Section id="planos" padding="xl">
      <Container>
        <div className="text-center mb-16">
          <p
            className="text-xs font-semibold tracking-widest uppercase mb-4"
            style={{ color: "#FF2D55" }}
          >
            Planos e preços
          </p>
          <h2
            className="font-black text-white mb-4"
            style={{ fontSize: "clamp(32px,5vw,56px)", letterSpacing: "-2px" }}
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
            30 dias grátis para testar. Cancele quando quiser.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className="rounded-2xl p-8 flex flex-col relative"
              style={{
                background: plan.featured
                  ? "linear-gradient(160deg,#1A0608,#0F0308)"
                  : "#212121",
                border: plan.featured
                  ? "1px solid rgba(255,45,85,0.3)"
                  : "1px solid rgba(255,255,255,0.06)",
                boxShadow: plan.featured
                  ? "0 0 60px rgba(255,45,85,0.08)"
                  : "none",
              }}
            >
              {plan.featured && (
                <span
                  className="absolute top-6 right-6 font-black rounded-full px-3 py-1 text-white"
                  style={{
                    background: "#FF2D55",
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
                  color: plan.featured ? "#FF2D55" : "#52525B",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {plan.name}
              </p>

              {plan.originalPrice && (
                <div className="mb-1">
                  <span
                    style={{
                      color: "#52525B",
                      fontSize: "16px",
                      textDecoration: "line-through",
                    }}
                  >
                    R$ {plan.originalPrice}
                  </span>
                  <span
                    className="ml-2 font-bold rounded-full px-2 py-0.5"
                    style={{
                      background: "rgba(255,45,85,0.15)",
                      color: "#FF2D55",
                      fontSize: "11px",
                    }}
                  >
                    OFERTA
                  </span>
                </div>
              )}

              <div className="flex items-baseline gap-1 mb-3">
                {plan.price !== "Trial" && plan.price !== "Em breve" && (
                  <span
                    style={{
                      color: "#A1A1AA",
                      fontSize: "22px",
                      fontWeight: 600,
                    }}
                  >
                    R$
                  </span>
                )}
                <span
                  className="font-black"
                  style={{
                    fontSize: plan.price === "Trial" || plan.price === "Em breve" ? "32px" : "56px",
                    letterSpacing: "-2px",
                    color: plan.featured ? "#FF2D55" : "#FFFFFF",
                    lineHeight: 1,
                  }}
                >
                  {plan.price}
                </span>
                {plan.price !== "Trial" && plan.price !== "Em breve" && (
                  <span style={{ color: "#52525B", fontSize: "14px" }}>/mês</span>
                )}
              </div>

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
                    ? "rgba(255,45,85,0.2)"
                    : "rgba(255,255,255,0.06)",
                }}
              />

              <ul className="flex flex-col gap-3 mb-8 flex-1">
                {plan.features.map((feat) => (
                  <li
                    key={feat.text}
                    className="flex items-center gap-3 text-sm"
                  >
                    {feat.ok ? (
                      <Check
                        size={14}
                        style={{ color: "#00D4A0", flexShrink: 0 }}
                      />
                    ) : (
                      <X
                        size={14}
                        style={{ color: "#3F3F46", flexShrink: 0 }}
                      />
                    )}
                    <span style={{ color: feat.ok ? "#A1A1AA" : "#3F3F46" }}>
                      {feat.text}
                    </span>
                  </li>
                ))}
              </ul>

              <a
                href={"ctaHref" in plan ? plan.ctaHref : "/onboarding"}
                className="block text-center py-3 rounded-xl font-bold text-sm text-white transition-all duration-200 hover:opacity-90"
                style={{
                  background: plan.featured
                    ? "#FF2D55"
                    : "rgba(255,255,255,0.04)",
                  border: plan.featured
                    ? "none"
                    : "1px solid rgba(255,255,255,0.1)",
                  textDecoration: "none",
                  boxShadow: plan.featured
                    ? "0 8px 24px rgba(255,45,85,0.3)"
                    : "none",
                }}
              >
                {plan.cta}
              </a>
            </div>
          ))}
        </div>

        <p className="text-center text-xs mt-8" style={{ color: "#3F3F46" }}>
          Sem cartão de crédito · Cancele quando quiser · Suporte em português
        </p>
      </Container>
    </Section>
  );
}
