"use client";

import { useEffect, useState } from "react";
import { PX_PER_MINUTE } from "./shared";

function getNowMin(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

// Linha vermelha de "agora" que se atualiza a cada minuto.
// Deve ser renderizada dentro de um elemento com position:relative e height = gridHeight.
export function NowIndicator() {
  const [nowMin, setNowMin] = useState(getNowMin);

  useEffect(() => {
    const id = setInterval(() => setNowMin(getNowMin()), 60_000);
    return () => clearInterval(id);
  }, []);

  const top = nowMin * PX_PER_MINUTE;

  return (
    <div
      className="absolute left-0 right-0 pointer-events-none"
      style={{ top, zIndex: 20 }}
    >
      {/* Círculo na ponta esquerda */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: -3,
          width: 8,
          height: 8,
          borderRadius: "50%",
          backgroundColor: "var(--color-primary)",
        }}
      />
      {/* Linha horizontal */}
      <div
        style={{
          marginLeft: 8,
          height: 2,
          backgroundColor: "var(--color-primary)",
          opacity: 0.85,
        }}
      />
    </div>
  );
}
