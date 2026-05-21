import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";

const PERKS = [
  {
    icon: "💰",
    title: "Comissao recorrente",
    desc: "20% MRR no 1 ano, 10% no 2. Pago mensalmente.",
  },
  {
    icon: "🏆",
    title: "Territorio exclusivo",
    desc: "Voce e o unico representante da sua regiao.",
  },
  {
    icon: "🛠",
    title: "Suporte total",
    desc: "Treinamento, material de vendas e suporte direto.",
  },
  {
    icon: "🚀",
    title: "Crescimento conjunto",
    desc: "Livo cresce, sua renda cresce junto.",
  },
] as const;

export function Partnership() {
  return (
    <Section id="parceria" padding="xl">
      <Container>
        <div
          className="relative rounded-3xl text-center overflow-hidden"
          style={{
            background: "linear-gradient(180deg,#0A0408,#050306)",
            border: "1px solid rgba(255,45,85,0.18)",
            padding: "80px 48px",
            boxShadow: "0 0 80px rgba(255,45,85,0.06)",
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
                "radial-gradient(circle,rgba(255,45,85,0.08),transparent 70%)",
              pointerEvents: "none",
            }}
          />

          <div className="relative">
            <div
              className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase px-4 py-2 rounded-full mb-8"
              style={{
                color: "#FF2D55",
                background: "rgba(255,45,85,0.06)",
                border: "1px solid rgba(255,45,85,0.2)",
              }}
            >
              ✦ Programa de Parceiros · Ribeirao Preto
            </div>

            <h2
              className="font-black text-white mb-5"
              style={{
                fontSize: "clamp(36px,6vw,64px)",
                letterSpacing: "-2px",
                lineHeight: 1.05,
              }}
            >
              Leve o Livo para as maiores
              <br />
              barbearias da regiao.
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
              Selecionamos parceiros estrategicos para representar o Livo. Se
              voce conhece o mercado local, essa conversa e para voce.
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
                  <div className="text-2xl mb-3">{perk.icon}</div>
                  <p className="font-bold text-white text-sm mb-1">
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
                href="https://wa.me/5516999999999"
                className="inline-flex items-center gap-2 px-8 py-4 text-white font-bold text-base rounded-xl transition-all duration-200 hover:opacity-90"
                style={{
                  background: "#FF2D55",
                  textDecoration: "none",
                  boxShadow: "0 8px 32px rgba(255,45,85,0.3)",
                }}
              >
                ✦ Quero ser parceiro
              </a>

              <a
                href="#produto"
                className="inline-flex items-center gap-2 px-8 py-4 text-white font-bold text-base rounded-xl transition-all duration-200 hover:opacity-80"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.1)",
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
