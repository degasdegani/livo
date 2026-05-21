"use client";

import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function HomePage() {
  return (
    <main
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden"
      style={{ backgroundColor: "#050505" }}
    >
      {/* Grid de fundo */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
          maskImage:
            "radial-gradient(ellipse 60% 60% at 50% 50%, black 30%, transparent 80%)",
        }}
      />

      {/* Orb vermelho */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          width: 600,
          height: 600,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(255,45,85,0.08) 0%, transparent 70%)",
          filter: "blur(80px)",
          top: "-150px",
          left: "-150px",
        }}
        animate={{ x: [0, 30, 0], y: [0, -20, 0], scale: [1, 1.05, 1] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Orb ciano */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          width: 400,
          height: 400,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(0,212,255,0.06) 0%, transparent 70%)",
          filter: "blur(80px)",
          bottom: "-100px",
          right: "-100px",
        }}
        animate={{ x: [0, -30, 0], y: [0, 30, 0], scale: [1, 0.95, 1] }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 4,
        }}
      />

      {/* Conteúdo */}
      <Container
        size="lg"
        className="relative z-10 flex flex-col items-center text-center gap-8"
      >
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0 }}
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
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
            Sistema em construção · 2026
          </div>
        </motion.div>

        {/* Logo */}
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.1 }}
          className="font-black leading-none"
          style={{
            fontSize: "clamp(80px, 14vw, 160px)",
            letterSpacing: "-6px",
            background:
              "linear-gradient(180deg, #FFFFFF 0%, rgba(255,255,255,0.5) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Livo
        </motion.h1>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.2 }}
          style={{
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
            fontSize: "clamp(18px, 2.5vw, 28px)",
            color: "#A1A1AA",
            fontWeight: 400,
          }}
        >
          O sistema definitivo para barbearias modernas.
        </motion.p>

        {/* Descrição */}
        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.3 }}
          style={{
            color: "#52525B",
            fontSize: "16px",
            maxWidth: "460px",
            lineHeight: 1.7,
          }}
        >
          Agendamento inteligente, gestão completa e inteligência artificial
          integrada. Construído para barbearias que querem crescer com dados
          reais.
        </motion.p>

        {/* Botões */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.4 }}
          className="flex flex-wrap gap-4 justify-center"
        >
          <Button variant="primary" size="lg">
            Conhecer o sistema
          </Button>
          <Button variant="secondary" size="lg">
            Ver os planos →
          </Button>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.55 }}
          className="flex items-stretch mt-4"
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: "16px",
          }}
        >
          {(
            [
              { value: "24/7", label: "Operação contínua", accent: true },
              { value: "IA", label: "Claude integrada", accent: false },
              { value: "3", label: "Planos disponíveis", accent: false },
              { value: "100%", label: "Mobile-first", accent: true },
            ] as const
          ).map((stat, i) => (
            <div
              key={stat.label}
              className="px-6 py-5 text-center"
              style={{
                borderRight:
                  i < 3 ? "1px solid rgba(255,255,255,0.06)" : undefined,
              }}
            >
              <div
                className="font-black"
                style={{
                  fontSize: "22px",
                  letterSpacing: "-0.5px",
                  background: stat.accent
                    ? "linear-gradient(135deg, #FF2D55, #FF4566)"
                    : "linear-gradient(180deg, #FFFFFF, rgba(255,255,255,0.7))",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                {stat.value}
              </div>
              <div
                style={{
                  fontSize: "10px",
                  color: "#52525B",
                  fontWeight: 600,
                  letterSpacing: "1.5px",
                  textTransform: "uppercase",
                  marginTop: "4px",
                }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </motion.div>
      </Container>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.6, ease: "easeOut" }}
      >
        <span
          style={{
            fontSize: "9px",
            letterSpacing: "3px",
            textTransform: "uppercase",
            fontWeight: 600,
            color: "#27272A",
          }}
        >
          Em construção
        </span>
        <div
          style={{
            width: "1px",
            height: "28px",
            background: "linear-gradient(180deg, #FF2D55, transparent)",
          }}
        />
      </motion.div>
    </main>
  );
}
