import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { poppins } from "@/lib/fonts";
import { TRIAL_DAYS } from "@/lib/pricing";

interface HowItWorksProps {
  // "home" = resumo na Home, CTA leva ao detalhe (/produto).
  // "detailed" = página /produto, CTA leva aos planos (/planos).
  variant?: "home" | "detailed";
}

export function HowItWorks({ variant = "detailed" }: HowItWorksProps = {}) {
  const isHome = variant === "home";
  const cta = isHome
    ? { href: "/produto", label: "Ver como funciona em detalhes" }
    : { href: "/planos", label: "Ver planos e preços" };

  return (
    <Section padding="xl" className="bg-black">
      <Container>
        <div className="text-center mb-20">
          <p className="text-xs font-semibold tracking-widest uppercase text-[#00D4FF] mb-6">
            Como funciona
          </p>
          <h2
            className={`${poppins.className} mb-4`}
            style={{
              fontSize: "clamp(32px, 5vw, 56px)",
              fontWeight: 400,
              letterSpacing: "0.05em",
              color: "var(--livo-cream)",
            }}
          >
            Simples assim.
          </h2>
          <p className="text-lg text-[#A1A1AA] max-w-lg mx-auto leading-relaxed">
            Do cadastro ao primeiro agendamento em menos de 10 minutos.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <div
            className="rounded-2xl p-8 relative overflow-hidden"
            style={{ background: "#0A0A0A", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <p
              className="text-sm font-black mb-5"
              style={{ fontFamily: "var(--font-mono)", color: "var(--livo-cream)" }}
            >
              01
            </p>
            <h3
              className="text-xl mb-3"
              style={{ fontWeight: 600, letterSpacing: "-0.3px", color: "var(--livo-cream)" }}
            >
              Cadastra sua barbearia
            </h3>
            <p className="text-sm text-[#A1A1AA] leading-relaxed mb-5">
              Em menos de 5 minutos você configura seu perfil, adiciona seus
              serviços, preços e profissionais. Sem suporte técnico.
            </p>
            <span
              className="text-xs font-semibold"
              style={{ fontFamily: "var(--font-mono)", color: "var(--livo-cream)" }}
            >
              Configuração em 5 minutos
            </span>
          </div>

          <div className="bg-[#212121] border border-white/5 rounded-2xl p-8 relative overflow-hidden">
            <p
              className="text-sm font-black text-[#00D4FF] mb-5"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              02
            </p>
            <h3
              className="text-xl mb-3"
              style={{ fontWeight: 600, letterSpacing: "-0.3px", color: "var(--livo-cream)" }}
            >
              Compartilha o link
            </h3>
            <p className="text-sm text-[#A1A1AA] leading-relaxed mb-5">
              Você recebe uma página personalizada com sua logo e cores. Coloca
              o link na bio do Instagram. Seus clientes já podem agendar.
            </p>
            <span
              className="text-xs font-semibold text-[#00D4FF]"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              livobarber.com.br/sua-barbearia
            </span>
          </div>

          <div className="bg-[#212121] border border-white/5 rounded-2xl p-8 relative overflow-hidden">
            <p
              className="text-sm font-black text-[#00D4A0] mb-5"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              03
            </p>
            <h3
              className="text-xl mb-3"
              style={{ fontWeight: 600, letterSpacing: "-0.3px", color: "var(--livo-cream)" }}
            >
              O Livo trabalha por você
            </h3>
            <p className="text-sm text-[#A1A1AA] leading-relaxed mb-5">
              Confirmações, lembretes, financeiro, análise de clientes e IA.
              Tudo automático enquanto você corta cabelo.
            </p>
            <span
              className="text-xs font-semibold text-[#00D4A0]"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              Automação 24 horas por dia
            </span>
          </div>
        </div>

        <div
          className="text-center rounded-2xl p-10"
          style={{ border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)" }}
        >
          <p
            className="text-xl font-bold mb-2"
            style={{ letterSpacing: "-0.3px", color: "var(--livo-cream)" }}
          >
            Pronto para profissionalizar sua barbearia?
          </p>
          <p className="text-sm text-[#52525B] mb-6">
            Entre agora e comece grátis — de {TRIAL_DAYS.start} a {TRIAL_DAYS.pro}{" "}
            dias, conforme o plano.
          </p>
          <a
            href={cta.href}
            className="inline-flex items-center gap-2 px-8 py-4 font-bold text-base rounded-xl no-underline hover:-translate-y-0.5 transition-all duration-200"
            style={{
              background: "linear-gradient(180deg, #E43B49, #C62E3C)",
              color: "#FFFFFF",
              boxShadow: "0 8px 24px rgba(198,46,60,0.35)",
            }}
          >
            {cta.label}
          </a>
        </div>
      </Container>
    </Section>
  );
}
