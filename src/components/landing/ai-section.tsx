import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { poppins } from "@/lib/fonts";
import { Lightbulb, MessageCircle, Sparkles, Target, TrendingUp } from "lucide-react";

const CHAT = [
  { role: "client", text: "Quero agendar um corte pra sábado de manhã" },
  {
    role: "ai",
    text: "Oi Lucas! Sábado às 09:00 com Carlos está livre. Confirmo?",
  },
  { role: "client", text: "Prefiro o Rafael" },
  { role: "ai", text: "Rafael tem às 09:30. Confirmo?" },
  { role: "client", text: "Sim!" },
  {
    role: "ai",
    text: "Confirmado! Corte Social com Rafael — Sáb 22/03 às 09:30.",
  },
] as const;

const AI_FEATURES = [
  {
    icon: Sparkles,
    title: "Insights automáticos",
    desc: "Identifica horários ociosos, clientes em risco e oportunidades de receita sem você pedir.",
  },
  {
    icon: TrendingUp,
    title: "Previsão de receita",
    desc: "Projeta o faturamento dos próximos 7 dias com base em histórico e agendamentos confirmados.",
  },
  {
    icon: Target,
    title: "Campanhas inteligentes",
    desc: "Segmenta clientes e envia mensagens personalizadas no momento certo. Totalmente automático.",
  },
  {
    icon: MessageCircle,
    title: "Agendamento por chat",
    desc: "Cliente conversa no WhatsApp e a IA agenda em linguagem natural — 24h por dia.",
  },
] as const;

export function AISection() {
  return (
    <Section id="ia" padding="xl" className="bg-black">
      <Container>
        <div className="text-center mb-16">
          <p
            className="text-xs font-semibold tracking-widest uppercase mb-4"
            style={{ color: "#7C3AED" }}
          >
            Inteligencia Artificial
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
            A IA trabalha enquanto{" "}
            <span style={{ color: "#7C3AED" }}>você corta.</span>
          </h2>
          <p
            style={{
              color: "#A1A1AA",
              fontSize: "18px",
              maxWidth: "520px",
              margin: "0 auto",
              lineHeight: 1.7,
            }}
          >
            Motor Claude API integrado ao núcleo do sistema. Conhece cada
            cliente, cada padrão, cada oportunidade.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="flex flex-col gap-4">
            {AI_FEATURES.map((feat) => (
              <div
                key={feat.title}
                className="flex gap-4 p-5 rounded-xl"
                style={{
                  background: "rgba(124,58,237,0.04)",
                  border: "1px solid rgba(124,58,237,0.1)",
                }}
              >
                <div
                  className="flex items-center justify-center rounded-xl shrink-0"
                  style={{
                    width: 40,
                    height: 40,
                    background: "rgba(124,58,237,0.1)",
                  }}
                >
                  <feat.icon size={20} strokeWidth={1.5} color="var(--livo-gold-solid)" />
                </div>
                <div>
                  <p
                    className="font-bold mb-1 text-sm"
                    style={{ color: "var(--livo-cream)" }}
                  >
                    {feat.title}
                  </p>
                  <p
                    style={{
                      fontSize: "13px",
                      color: "#A1A1AA",
                      lineHeight: 1.6,
                    }}
                  >
                    {feat.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: "linear-gradient(160deg,#0A0814,#050308)",
              border: "1px solid rgba(124,58,237,0.2)",
            }}
          >
            <div
              className="flex items-center gap-3 p-4"
              style={{
                borderBottom: "1px solid rgba(124,58,237,0.1)",
                background: "rgba(124,58,237,0.04)",
              }}
            >
              <div
                className="flex items-center justify-center rounded-full"
                style={{
                  width: 36,
                  height: 36,
                  background: "linear-gradient(135deg,#7C3AED,#00D4FF)",
                }}
              >
                <Sparkles size={16} strokeWidth={1.5} color="var(--livo-cream)" />
              </div>
              <div>
                <p className="font-bold text-sm" style={{ color: "var(--livo-cream)" }}>Assistente Livo</p>
                <p className="text-xs" style={{ color: "#00D4A0" }}>
                  ● Online agora
                </p>
              </div>
              <div
                className="ml-auto text-xs font-bold px-3 py-1 rounded-full"
                style={{
                  background: "rgba(124,58,237,0.1)",
                  color: "#7C3AED",
                  border: "1px solid rgba(124,58,237,0.2)",
                }}
              >
                Claude AI
              </div>
            </div>

            <div className="p-5 flex flex-col gap-3">
              {CHAT.map((msg, i) => (
                <div
                  key={i}
                  className={msg.role === "client" ? "self-start" : "self-end"}
                  style={{ maxWidth: "80%" }}
                >
                  {msg.role === "ai" && (
                    <p
                      className="text-right mb-1"
                      style={{
                        fontSize: "9px",
                        color: "#7C3AED",
                        letterSpacing: "1px",
                      }}
                    >
                      LIVO IA
                    </p>
                  )}
                  <div
                    className="px-4 py-2"
                    style={{
                      fontSize: "13px",
                      lineHeight: 1.5,
                      color: "var(--livo-cream)",
                      background:
                        msg.role === "client"
                          ? "rgba(138,100,37,0.12)"
                          : "rgba(124,58,237,0.1)",
                      border:
                        msg.role === "client"
                          ? "1px solid rgba(138,100,37,0.25)"
                          : "1px solid rgba(124,58,237,0.2)",
                      borderRadius:
                        msg.role === "client"
                          ? "4px 16px 16px 16px"
                          : "16px 4px 16px 16px",
                    }}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>

            <div
              className="mx-5 mb-5 p-3 rounded-xl flex gap-2"
              style={{
                background: "rgba(124,58,237,0.05)",
                border: "1px solid rgba(124,58,237,0.1)",
                fontSize: "12px",
                color: "#A1A1AA",
              }}
            >
              <span className="flex items-center">
                <Lightbulb size={16} strokeWidth={1.5} color="var(--livo-gold-solid)" />
              </span>
              <span>
                <strong style={{ color: "var(--livo-cream)" }}>Insight:</strong> Lucas não
                aparecia há 19 dias. A IA detectou e enviou sugestão no momento
                certo.
              </span>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
