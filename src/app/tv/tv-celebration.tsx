"use client";

import { useEffect, useRef } from "react";

interface Props {
  onDone: () => void;
}

// Gera N partículas com posições/cores/animações aleatórias via CSS keyframes inline
const PARTICLE_COUNT = 80;
const COLORS = ["#C8102E", "#C8A24C", "#ffffff", "#ff6b6b", "#ffd93d"];
const DURATION_MS = 4000;

function randomBetween(a: number, b: number) {
  return a + Math.random() * (b - a);
}

export function TvCelebration({ onDone }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Pre-carregar e tocar som.
    // Arquivo: public/sounds/goal.mp3 (clipe curto de celebracao, ~52KB).
    const audio = new Audio("/sounds/goal.mp3");
    audio.load();
    audioRef.current = audio;
    audio.play().catch(() => {
      /* contexto de audio pode nao estar disponivel */
    });

    // Voltar ao normal após DURATION_MS
    const id = setTimeout(onDone, DURATION_MS);
    return () => {
      clearTimeout(id);
      audio.pause();
    };
  }, [onDone]);

  const particles = Array.from({ length: PARTICLE_COUNT }, (_, i) => {
    const x = randomBetween(0, 100); // % da largura
    const delay = randomBetween(0, 1.2); // s
    const dur = randomBetween(2.5, 4); // s
    const size = randomBetween(6, 14); // px
    const color = COLORS[i % COLORS.length];
    const rot = randomBetween(0, 720); // deg

    return { x, delay, dur, size, color, rot, i };
  });

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      {/* Overlay de fundo semi-transparente */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.55)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
        }}
      >
        <p
          style={{
            fontSize: "clamp(3rem, 10vw, 7rem)",
            fontWeight: 900,
            color: "#C8A24C",
            textAlign: "center",
            letterSpacing: "0.05em",
            textShadow: "0 0 40px rgba(200,162,76,0.6)",
            margin: 0,
            animation: "celebPulse 0.6s ease-in-out infinite alternate",
          }}
        >
          META ATINGIDA
        </p>
      </div>

      {/* Partículas de confete */}
      {particles.map(({ x, delay, dur, size, color, rot, i }) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${x}%`,
            top: "-20px",
            width: size,
            height: size * 0.5,
            background: color,
            borderRadius: "2px",
            animation: `confettiFall ${dur}s ${delay}s ease-in forwards`,
            transform: `rotate(${rot}deg)`,
          }}
        />
      ))}

      {/* Keyframes injetados via <style> */}
      <style>{`
        @keyframes confettiFall {
          0%   { transform: translateY(0)   rotate(0deg);   opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
        @keyframes celebPulse {
          from { transform: scale(1);    opacity: 0.9; }
          to   { transform: scale(1.04); opacity: 1;   }
        }
      `}</style>
    </div>
  );
}
