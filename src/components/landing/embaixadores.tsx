// LIVO-031 — Seção de Embaixadores (substitui o antigo "Programa de Parceiros").
// Esqueleto pronto para receber conteúdo definitivo (imagem + copy + link
// de contato). Estrutura adaptada de partnership.tsx (removido).
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { poppins } from "@/lib/fonts";

// TODO: substituir pelo número/link de WhatsApp definitivo dos Embaixadores
// quando o Edu passar a copy final — LIVO-031
const EMBAIXADORES_WHATSAPP_URL = "https://wa.me/5511999999999";

export function Embaixadores() {
  return (
    <Section id="embaixadores" padding="xl" className="bg-black">
      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Imagem — placeholder até o arquivo final chegar */}
          <div
            className="relative rounded-3xl overflow-hidden flex items-center justify-center"
            style={{
              aspectRatio: "4 / 5",
              background: "rgba(138,100,37,0.06)",
              border: "1px solid rgba(138,100,37,0.25)",
            }}
          >
            {/* TODO: substituir este placeholder por <Image src="/images/embaixadores.jpg" alt="..." fill /> — LIVO-031 */}
            <span
              className="text-xs font-semibold tracking-widest uppercase"
              style={{ color: "var(--livo-gold-solid)" }}
            >
              Imagem em breve
            </span>
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
              {/* TODO: aguardando copy final do Edu — LIVO-031 */}
              Título provisório — Embaixadores Livo.
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
              {/* TODO: aguardando copy final do Edu — LIVO-031 */}
              Texto provisório descrevendo o programa de Embaixadores Livo.
              Este conteúdo será substituído pela copy definitiva.
            </p>

            {/* CTA estilo wa.me — link/texto placeholder */}
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
              {/* TODO: aguardando copy final do Edu — LIVO-031 */}
              Quero ser Embaixador
            </a>
          </div>
        </div>
      </Container>
    </Section>
  );
}
