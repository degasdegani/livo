import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { poppins } from "@/lib/fonts";
import { SUPPORT_WHATSAPP_URL } from "@/lib/support";
import { Rocket, Trophy, Wallet, Wrench } from "lucide-react";

const PERKS = [
  {
    icon: Wallet,
    title: "Comissão recorrente",
    desc: "20% MRR no 1º ano, 10% no 2º. Pago mensalmente.",
  },
  {
    icon: Trophy,
    title: "Território exclusivo",
    desc: "Você é o único representante da sua região.",
  },
  {
    icon: Wrench,
    title: "Suporte total",
    desc: "Treinamento, material de vendas e suporte direto.",
  },
  {
    icon: Rocket,
    title: "Crescimento conjunto",
    desc: "Livo cresce, sua renda cresce junto.",
  },
] as const;

export function Partnership() {
  return (
    <Section id="parceria" padding="xl" className="bg-black">
      <Container>
        <div
          className="relative rounded-3xl text-center overflow-hidden"
          style={{
            // Dourado-escuro de marca (LIVO-032-A), sobre fundo preto puro.
            background: "linear-gradient(180deg, rgba(85,62,32,0.28), #000000)",
            border: "1px solid rgba(138,100,37,0.3)",
            padding: "80px 48px",
            boxShadow: "0 0 80px rgba(138,100,37,0.08)",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "-200px",
              left: "50%",
              transform: "translateX(-50%)",
              width: "500px",
              height: "500px",
              borderRadius: "50%",
              background:
                "radial-gradient(circle,rgba(138,100,37,0.12),transparent 70%)",
              pointerEvents: "none",
            }}
          />

          <div className="relative">
            <div
              className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase px-4 py-2 rounded-full mb-8"
              style={{
                color: "var(--livo-gold-bright)",
                background: "rgba(138,100,37,0.08)",
                border: "1px solid rgba(138,100,37,0.3)",
              }}
            >
              ✦ Programa de Parceiros
            </div>

            <h2
              className={`${poppins.className} mb-5`}
              style={{
                fontSize: "clamp(36px,6vw,64px)",
                fontWeight: 400,
                letterSpacing: "0.05em",
                lineHeight: 1.05,
                color: "var(--livo-cream)",
              }}
            >
              Leve o Livo para as maiores
              <br />
              barbearias da sua região.
            </h2>

            <p
              style={{
                color: "#A1A1AA",
                fontSize: "18px",
                maxWidth: "560px",
                margin: "0 auto 48px",
                lineHeight: 1.7,
              }}
            >
              Selecionamos parceiros estratégicos para representar o Livo. Se
              você conhece o mercado local, essa conversa é para você.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
              {PERKS.map((perk) => (
                <div
                  key={perk.title}
                  className="rounded-2xl p-5"
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <div className="mb-3">
                    <perk.icon size={28} strokeWidth={1.5} color="var(--livo-gold-solid)" />
                  </div>
                  <p
                    className="font-bold text-sm mb-1"
                    style={{ color: "var(--livo-cream)" }}
                  >
                    {perk.title}
                  </p>
                  <p
                    className="text-xs leading-relaxed"
                    style={{ color: "#52525B" }}
                  >
                    {perk.desc}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-4 justify-center">
              <a
                href={SUPPORT_WHATSAPP_URL}
                className="inline-flex items-center gap-2 px-8 py-4 font-bold text-base rounded-xl transition-all duration-200 hover:opacity-90"
                style={{
                  background: "var(--livo-gold-solid)",
                  color: "var(--livo-cream)",
                  textDecoration: "none",
                  boxShadow: "0 8px 32px rgba(138,100,37,0.35)",
                }}
              >
                ✦ Quero ser parceiro
              </a>

              <a
                href="/produto"
                className="inline-flex items-center gap-2 px-8 py-4 font-bold text-base rounded-xl transition-all duration-200 hover:opacity-80"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "var(--livo-cream)",
                  textDecoration: "none",
                }}
              >
                Ver o sistema completo
              </a>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
