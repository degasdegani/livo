// ============================================================
// LIVO — Features Section
// Apresenta as 6 funcionalidades principais do sistema
// Anima quando entra no viewport (scroll-triggered)
// ============================================================

"use client";

import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";

// Dados das funcionalidades
const FEATURES = [
  {
    icon: "📅",
    title: "Agenda inteligente",
    description:
      "Clientes agendam sozinhos 24h por dia. Sem WhatsApp, sem ligação, sem confusão. Visão semanal completa com drag-and-drop.",
    color: "#FF2D55",
    tag: "Core",
  },
  {
    icon: "💬",
    title: "WhatsApp automático",
    description:
      "Confirmação imediata e lembrete 2 horas antes de cada agendamento. Zero no-show. Zero esquecimento. Zero trabalho manual.",
    color: "#00D4A0",
    tag: "Automação",
  },
  {
    icon: "💰",
    title: "Financeiro completo",
    description:
      "Receita do dia, semana e mês. Extrato por método de pagamento. Ticket médio automático. Sem planilha. Nunca mais.",
    color: "#00D4FF",
    tag: "Gestão",
  },
  {
    icon: "👥",
    title: "CRM de clientes",
    description:
      "Ficha completa de cada cliente: histórico, serviço favorito, total gasto, observações. Segmentação automática em VIP, novos e inativos.",
    color: "#7C3AED",
    tag: "CRM",
  },
  {
    icon: "✦",
    title: "Inteligência Artificial",
    description:
      "IA que analisa seu negócio, identifica oportunidades, envia campanhas automáticas e projeta sua receita dos próximos 7 dias.",
    color: "#FFB020",
    tag: "IA",
  },
  {
    icon: "💳",
    title: "Planos mensais",
    description:
      "Seu cliente contrata pacotes de corte direto no app. PIX e cartão integrados. Receita recorrente e previsível todo mês.",
    color: "#FF2D55",
    tag: "Receita",
  },
] as const;

export function Features() {
  const titleRef = useRef<HTMLDivElement>(null);
  const titleInView = useInView(titleRef, { once: true, margin: "-100px" });

  return (
    <Section id="funcionalidades" padding="xl">
      <Container>
        {/* Header da seção */}
        <div ref={titleRef} className="text-center mb-16">
          {/* Label */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={titleInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="mb-6"
          >
            <span
              className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase"
              style={{ color: "#FF2D55" }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: 24,
                  height: 1,
                  background: "#FF2D55",
                }}
              />
              Funcionalidades
              <span
                style={{
                  display: "inline-block",
                  width: 24,
                  height: 1,
                  background: "#FF2D55",
                }}
              />
            </span>
          </motion.div>

          {/* Título */}
          <motion.h2
            initial={{ opacity: 0, y: 24 }}
            animate={titleInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.1 }}
            className="font-black tracking-tight"
            style={{
              fontSize: "clamp(32px, 5vw, 56px)",
              letterSpacing: "-2px",
              lineHeight: 1.08,
              marginBottom: "16px",
            }}
          >
            <span
              style={{
                background:
                  "linear-gradient(180deg, #FFFFFF, rgba(255,255,255,0.7))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Tudo que sua barbearia{" "}
            </span>
            <span
              style={{
                background: "linear-gradient(135deg, #FF2D55, #FF6B7A)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              precisa.
            </span>
          </motion.h2>

          {/* Subtítulo */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={titleInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.2 }}
            style={{
              fontSize: "18px",
              color: "#A1A1AA",
              maxWidth: "560px",
              margin: "0 auto",
              lineHeight: 1.7,
            }}
          >
            Não é mais um sistema. É o único sistema que sua barbearia vai
            precisar.
          </motion.p>
        </div>

        {/* Grid de features */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "1px",
            background: "rgba(255,255,255,0.04)",
            borderRadius: "20px",
            border: "1px solid rgba(255,255,255,0.04)",
            overflow: "hidden",
          }}
        >
          {FEATURES.map((feature, i) => (
            <FeatureCard key={feature.title} feature={feature} index={i} />
          ))}
        </div>
      </Container>
    </Section>
  );
}

// ── Card individual de feature ────────────────────────────────
function FeatureCard({
  feature,
  index,
}: {
  feature: (typeof FEATURES)[number];
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, ease: "easeOut", delay: (index % 3) * 0.1 }}
      style={{
        background: "#0A0A0A",
        padding: "32px",
        position: "relative",
        overflow: "hidden",
        cursor: "default",
      }}
      whileHover={{ background: "#0D0D0D" }}
    >
      {/* Glow de fundo ao hover */}
      <div
        style={{
          position: "absolute",
          top: -40,
          right: -40,
          width: 120,
          height: 120,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${feature.color}15, transparent 70%)`,
          pointerEvents: "none",
        }}
      />

      {/* Tag */}
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "3px 10px",
          borderRadius: "100px",
          background: `${feature.color}10`,
          border: `1px solid ${feature.color}25`,
          fontSize: "10px",
          fontWeight: 700,
          color: feature.color,
          letterSpacing: "1px",
          textTransform: "uppercase",
          marginBottom: "20px",
        }}
      >
        {feature.tag}
      </div>

      {/* Ícone */}
      <div
        style={{
          fontSize: "28px",
          marginBottom: "16px",
          display: "block",
        }}
      >
        {feature.icon}
      </div>

      {/* Título */}
      <h3
        style={{
          fontSize: "18px",
          fontWeight: 800,
          color: "#FFFFFF",
          letterSpacing: "-0.3px",
          marginBottom: "10px",
        }}
      >
        {feature.title}
      </h3>

      {/* Descrição */}
      <p
        style={{
          fontSize: "14px",
          color: "#A1A1AA",
          lineHeight: 1.7,
        }}
      >
        {feature.description}
      </p>
    </motion.div>
  );
}
