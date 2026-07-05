// ============================================================
// LIVO — Hero Section
// Primeira dobra da landing page
// Contém: headline, subheadline, CTAs, stats e mockup do sistema
// ============================================================

"use client";

import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { TRIAL_DAYS } from "@/lib/pricing";
import { motion } from "framer-motion";

// Dados dos stats do hero
const STATS = [
  { value: "Zero", label: "planilhas", accent: false },
  { value: "24/7", label: "agenda online", accent: true },
  { value: "IA", label: "integrada", accent: false },
  { value: "100%", label: "mobile-first", accent: true },
] as const;

// Dados dos agendamentos do mockup
const MOCK_APPOINTMENTS = [
  {
    time: "09:00",
    name: "Lucas Ferreira",
    service: "Corte Social",
    status: "done",
    barber: "Carlos",
  },
  {
    time: "10:30",
    name: "Gabriel Souza",
    service: "Corte + Barba",
    status: "current",
    barber: "Carlos",
  },
  {
    time: "11:00",
    name: "Matheus Lima",
    service: "Degradê",
    status: "next",
    barber: "Rafael",
  },
  {
    time: "14:00",
    name: "Eduardo Santos",
    service: "Corte Social",
    status: "waiting",
    barber: "Diego",
  },
  {
    time: "15:30",
    name: "João Victor",
    service: "Barba",
    status: "waiting",
    barber: "Carlos",
  },
] as const;

// Cores de status de agendamento
const STATUS_COLORS = {
  done: "#00D4A0",
  current: "#FF2D55",
  next: "#FFB020",
  waiting: "#3F3F46",
} as const;

export function Hero() {
  return (
    <section
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden pt-16"
      style={{ backgroundColor: "#191919" }}
    >
      {/* Grade de fundo */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
          `,
          backgroundSize: "80px 80px",
          maskImage:
            "radial-gradient(ellipse 80% 70% at 50% 40%, black 40%, transparent 90%)",
        }}
      />

      {/* Orbs de luz */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          width: 800,
          height: 800,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(255,45,85,0.07) 0%, transparent 70%)",
          filter: "blur(80px)",
          top: "-200px",
          left: "-200px",
        }}
        animate={{ x: [0, 40, 0], y: [0, -30, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute pointer-events-none"
        style={{
          width: 600,
          height: 600,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(0,212,255,0.05) 0%, transparent 70%)",
          filter: "blur(80px)",
          bottom: "-100px",
          right: "-100px",
        }}
        animate={{ x: [0, -40, 0], y: [0, 40, 0] }}
        transition={{
          duration: 14,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 5,
        }}
      />

      <Container className="relative z-10">
        <div className="flex flex-col items-center text-center gap-8">
          {/* Badge eyebrow */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.1 }}
          >
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold tracking-widest uppercase"
              style={{
                background: "rgba(255,45,85,0.06)",
                border: "1px solid rgba(255,45,85,0.2)",
                color: "#FF2D55",
              }}
            >
              <motion.span
                style={{
                  display: "inline-block",
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#FF2D55",
                  boxShadow: "0 0 10px #FF2D55",
                }}
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
              Plataforma de gestão para barbearias · 2026
            </div>
          </motion.div>

          {/* Headline principal */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
          >
            <h1
              className="font-black leading-none tracking-tight"
              style={{
                fontSize: "clamp(48px, 8vw, 96px)",
                letterSpacing: "-3px",
              }}
            >
              <span
                style={{
                  display: "block",
                  background:
                    "linear-gradient(180deg, #FFFFFF 0%, rgba(255,255,255,0.65) 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Sua barbearia
              </span>
              <span
                style={{
                  display: "block",
                  background:
                    "linear-gradient(135deg, #FF2D55 0%, #FF6B7A 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                no próximo nível.
              </span>
            </h1>
          </motion.div>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.35 }}
            style={{
              fontSize: "clamp(16px, 2vw, 20px)",
              color: "#A1A1AA",
              maxWidth: "600px",
              lineHeight: 1.7,
              fontWeight: 400,
            }}
          >
            Sistema completo de agendamento, gestão e inteligência artificial.
            Substitui o WhatsApp, a planilha e o caderno — de uma vez por todas.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.5 }}
            className="flex flex-wrap gap-4 justify-center"
          >
            <a href="/onboarding">
              <Button variant="primary" size="xl">
                Começar grátis por {TRIAL_DAYS.start} dias
              </Button>
            </a>
            <a href="/produto">
              <Button variant="secondary" size="xl">
                Ver demonstração →
              </Button>
            </a>
          </motion.div>

          {/* Texto de garantia */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.65 }}
            style={{ fontSize: "12px", color: "#52525B" }}
          >
            Sem cartão de crédito · Cancele quando quiser · Suporte em português
          </motion.p>

          {/* Mockup do sistema */}
          <motion.div
            initial={{ opacity: 0, y: 48, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.8 }}
            className="w-full mt-8"
            style={{ maxWidth: "900px" }}
          >
            {/* Container do mockup com brilho nas bordas */}
            <div
              style={{
                position: "relative",
                borderRadius: "20px",
                padding: "1px",
                background:
                  "linear-gradient(135deg, rgba(255,45,85,0.3) 0%, rgba(255,255,255,0.05) 50%, rgba(0,212,255,0.2) 100%)",
              }}
            >
              <div
                style={{
                  borderRadius: "19px",
                  background: "#212121",
                  overflow: "hidden",
                  boxShadow:
                    "0 40px 120px rgba(0,0,0,0.8), 0 0 60px rgba(255,45,85,0.05)",
                }}
              >
                {/* Barra superior do mockup (simulando browser/app) */}
                <div
                  style={{
                    background: "#080808",
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                    padding: "12px 20px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  {["#FF5F57", "#FEBC2E", "#28C840"].map((color) => (
                    <div
                      key={color}
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        background: color,
                      }}
                    />
                  ))}
                  <div
                    style={{
                      flex: 1,
                      marginLeft: 12,
                      background: "#141414",
                      borderRadius: "6px",
                      padding: "5px 12px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <span style={{ color: "#00D4A0", fontSize: "11px" }}>
                      🔒
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "11px",
                        color: "#52525B",
                      }}
                    >
                      app.livobarber.com.br/dashboard
                    </span>
                  </div>
                </div>

                {/* Conteúdo do dashboard simulado */}
                <div style={{ display: "flex", height: "400px" }}>
                  {/* Sidebar */}
                  <div
                    style={{
                      width: "200px",
                      background: "#060606",
                      borderRight: "1px solid rgba(255,255,255,0.05)",
                      padding: "20px 12px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                      flexShrink: 0,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "0 8px 16px",
                        marginBottom: "8px",
                        borderBottom: "1px solid rgba(255,255,255,0.05)",
                      }}
                    >
                      <div
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: "7px",
                          background: "#FF2D55",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "11px",
                          fontWeight: 900,
                          color: "#fff",
                        }}
                      >
                        L
                      </div>
                      <span
                        style={{
                          fontSize: "13px",
                          fontWeight: 800,
                          color: "#fff",
                        }}
                      >
                        Livo
                      </span>
                    </div>

                    {[
                      { icon: "◼", label: "Dashboard", active: true },
                      { icon: "📅", label: "Agendamentos", active: false },
                      { icon: "👥", label: "Clientes", active: false },
                      { icon: "💰", label: "Financeiro", active: false },
                      { icon: "✦", label: "IA Livo", active: false },
                    ].map((item) => (
                      <div
                        key={item.label}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          padding: "8px 10px",
                          borderRadius: "8px",
                          background: item.active
                            ? "rgba(255,45,85,0.08)"
                            : "transparent",
                          color: item.active ? "#FF2D55" : "#52525B",
                          fontSize: "12px",
                          fontWeight: item.active ? 600 : 500,
                          cursor: "pointer",
                          position: "relative",
                        }}
                      >
                        {item.active && (
                          <div
                            style={{
                              position: "absolute",
                              left: -12,
                              top: "50%",
                              transform: "translateY(-50%)",
                              width: 3,
                              height: 16,
                              background: "#FF2D55",
                              borderRadius: "0 2px 2px 0",
                              boxShadow: "0 0 8px rgba(255,45,85,0.5)",
                            }}
                          />
                        )}
                        <span style={{ fontSize: "13px" }}>{item.icon}</span>
                        {item.label}
                      </div>
                    ))}
                  </div>

                  {/* Conteúdo principal do dashboard */}
                  <div
                    style={{ flex: 1, padding: "20px", overflowY: "hidden" }}
                  >
                    <div style={{ marginBottom: "16px" }}>
                      <div
                        style={{
                          fontSize: "18px",
                          fontWeight: 800,
                          color: "#fff",
                        }}
                      >
                        Bom dia, João ✦
                      </div>
                      <div
                        style={{
                          fontSize: "11px",
                          color: "#52525B",
                          marginTop: "2px",
                        }}
                      >
                        Hoje você tem 5 atendimentos agendados
                      </div>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3, 1fr)",
                        gap: "10px",
                        marginBottom: "16px",
                      }}
                    >
                      {[
                        { label: "HOJE", value: "12", color: "#FF2D55" },
                        { label: "RECEITA", value: "R$480", color: "#00D4A0" },
                        {
                          label: "TICKET MÉDIO",
                          value: "R$40",
                          color: "#00D4FF",
                        },
                      ].map((kpi) => (
                        <div
                          key={kpi.label}
                          style={{
                            background: "#262626",
                            border: "1px solid rgba(255,255,255,0.05)",
                            borderRadius: "10px",
                            padding: "12px",
                          }}
                        >
                          <div
                            style={{
                              fontSize: "9px",
                              color: "#52525B",
                              letterSpacing: "1.5px",
                              textTransform: "uppercase",
                              fontWeight: 600,
                              marginBottom: "6px",
                            }}
                          >
                            {kpi.label}
                          </div>
                          <div
                            style={{
                              fontSize: "20px",
                              fontWeight: 800,
                              color: kpi.color,
                              letterSpacing: "-0.5px",
                            }}
                          >
                            {kpi.value}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div
                      style={{
                        background: "#262626",
                        border: "1px solid rgba(255,255,255,0.05)",
                        borderRadius: "10px",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          padding: "10px 14px",
                          borderBottom: "1px solid rgba(255,255,255,0.05)",
                          fontSize: "11px",
                          fontWeight: 700,
                          color: "#fff",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span>Agenda de hoje</span>
                        <span
                          style={{
                            fontSize: "9px",
                            padding: "2px 8px",
                            borderRadius: "100px",
                            background: "rgba(0,212,160,0.1)",
                            color: "#00D4A0",
                            fontFamily: "var(--font-mono)",
                          }}
                        >
                          5 confirmados
                        </span>
                      </div>

                      {MOCK_APPOINTMENTS.map((appt) => (
                        <div
                          key={`${appt.time}-${appt.name}`}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            padding: "10px 14px",
                            borderBottom: "1px solid rgba(255,255,255,0.03)",
                            background:
                              appt.status === "current"
                                ? "linear-gradient(90deg, rgba(255,45,85,0.06), transparent)"
                                : "transparent",
                          }}
                        >
                          <span
                            style={{
                              fontFamily: "var(--font-mono)",
                              fontSize: "10px",
                              color: "#52525B",
                              minWidth: "36px",
                              fontWeight: 600,
                            }}
                          >
                            {appt.time}
                          </span>
                          <div
                            style={{
                              width: 2,
                              alignSelf: "stretch",
                              borderRadius: "2px",
                              background: STATUS_COLORS[appt.status],
                              boxShadow:
                                appt.status === "current"
                                  ? `0 0 8px ${STATUS_COLORS[appt.status]}`
                                  : undefined,
                            }}
                          />
                          <div
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: "50%",
                              background: "#303030",
                              border: `1.5px solid ${STATUS_COLORS[appt.status]}40`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "10px",
                              fontWeight: 700,
                              color: "#A1A1AA",
                              flexShrink: 0,
                            }}
                          >
                            {appt.name.charAt(0)}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                fontSize: "11px",
                                fontWeight: 600,
                                color:
                                  appt.status === "current"
                                    ? "#fff"
                                    : "#A1A1AA",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {appt.name}
                            </div>
                            <div
                              style={{
                                fontSize: "9px",
                                color: "#3F3F46",
                                marginTop: "1px",
                              }}
                            >
                              {appt.service} · {appt.barber}
                            </div>
                          </div>
                          <div
                            style={{
                              width: 7,
                              height: 7,
                              borderRadius: "50%",
                              background: STATUS_COLORS[appt.status],
                              flexShrink: 0,
                              boxShadow:
                                appt.status === "current"
                                  ? `0 0 8px ${STATUS_COLORS[appt.status]}`
                                  : undefined,
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Gradiente de fade embaixo do mockup */}
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: "120px",
                background: "linear-gradient(transparent, #191919)",
                borderRadius: "0 0 20px 20px",
                pointerEvents: "none",
              }}
            />
          </motion.div>
        </div>
      </Container>

      {/* Gradiente de transição para a próxima seção */}
      <div
        className="absolute bottom-0 left-0 right-0 pointer-events-none"
        style={{
          height: "200px",
          background: "linear-gradient(transparent, #191919)",
        }}
      />
    </section>
  );
}
