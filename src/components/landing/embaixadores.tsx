// Seção de Embaixadores (substitui o antigo "Programa de Parceiros").
// Estrutura adaptada de partnership.tsx (removido).
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { poppins } from "@/lib/fonts";
import Image from "next/image";

const EMBAIXADORES_WHATSAPP_NUMBER = "5516992813674";
const EMBAIXADORES_WHATSAPP_MESSAGE =
  "Olá! Vi o Programa de Embaixadores da LIVO e quero saber como faço parte. Pode me passar mais detalhes?";
const EMBAIXADORES_WHATSAPP_URL = `https://wa.me/${EMBAIXADORES_WHATSAPP_NUMBER}?text=${encodeURIComponent(EMBAIXADORES_WHATSAPP_MESSAGE)}`;

export function Embaixadores() {
  return (
    <Section id="embaixadores" padding="xl" className="bg-black">
      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Imagem */}
          <div
            className="relative rounded-3xl overflow-hidden"
            style={{
              aspectRatio: "4 / 5",
              background: "rgba(138,100,37,0.06)",
              border: "1px solid rgba(138,100,37,0.25)",
            }}
          >
            <Image
              src="/embaixadores-tx.png"
              alt="TX Barbearia, Embaixador Oficial LIVO Barber"
              fill
              className="object-cover"
            />
          </div>

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
              TX Barbearia — Embaixador Oficial LIVO Barber.
            </h2>

            <p
              style={{
                color: "#A1A1AA",
                fontSize: "18px",
                lineHeight: 1.7,
                marginBottom: "40px",
                maxWidth: "480px",
              }}
            >
              Embaixador Oficial é o título de quem representa a LIVO com
              autoridade — acesso a conteúdos, mentorias e benefícios
              exclusivos. TX Barbearia carrega esse título hoje.
              Selecionamos barbearias de referência para representar a LIVO
              em suas regiões — se você lidera uma barbearia de peso na sua
              cidade, essa conversa é pra você.
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
