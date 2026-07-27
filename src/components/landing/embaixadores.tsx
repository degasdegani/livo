// Seção de Embaixadores (substitui o antigo "Programa de Parceiros").
// Estrutura adaptada de partnership.tsx (removido).
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { poppins } from "@/lib/fonts";

const EMBAIXADORES_WHATSAPP_NUMBER = "5516992813674";
const EMBAIXADORES_WHATSAPP_MESSAGE =
  "Olá! Vi a oferta de Embaixador Oficial da LIVO (R$169,90 vitalício) e quero saber como faço parte. Pode me passar mais detalhes?";
const EMBAIXADORES_WHATSAPP_URL = `https://wa.me/${EMBAIXADORES_WHATSAPP_NUMBER}?text=${encodeURIComponent(EMBAIXADORES_WHATSAPP_MESSAGE)}`;

export function Embaixadores() {
  return (
    <Section id="embaixadores" padding="xl" className="bg-black">
      <Container>
        <div className="flex flex-col items-center text-center max-w-2xl mx-auto">
          {/* Texto */}
          <div>
            <div
              className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase px-4 py-2 rounded-full mb-8"
              style={{
                color: "var(--livo-gold-bright)",
                background: "rgba(138,100,37,0.08)",
                border: "1px solid rgba(138,100,37,0.3)",
              }}
            >
              Embaixadores Livo
            </div>

            <h2
              className={poppins.className}
              style={{
                fontSize: "clamp(32px,5vw,56px)",
                fontWeight: 400,
                letterSpacing: "0.05em",
                lineHeight: 1.1,
                marginBottom: "20px",
                color: "var(--livo-cream)",
              }}
            >
              Seja Embaixador Oficial LIVO Barber.
            </h2>

            <p
              style={{
                color: "#A1A1AA",
                fontSize: "18px",
                lineHeight: 1.7,
                marginBottom: "40px",
              }}
            >
              Pague uma única vez R$ 169,90 e tenha acesso vitalício a todas
              as novidades e atualizações do LIVO Barber. Além disso,
              participe do nosso plano de indicações: a cada barbearia que
              você indicar e fechar contrato conosco, você ganha um mês
              grátis.
            </p>

            <a
              href={EMBAIXADORES_WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-4 font-bold text-base rounded-xl transition-all duration-200 hover:opacity-90"
              style={{
                background: "var(--livo-gold-solid)",
                color: "var(--livo-cream)",
                textDecoration: "none",
                boxShadow: "0 8px 32px rgba(138,100,37,0.35)",
              }}
            >
              Quero ser Embaixador
            </a>
          </div>
        </div>
      </Container>
    </Section>
  );
}
