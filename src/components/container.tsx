// ============================================================
// LIVO — Container
// Wrapper que centraliza e limita a largura do conteúdo
// Usado em toda a aplicação — landing, sistema e páginas públicas
// ============================================================

import { cn } from "@/lib/utils";

// ── Tipos ─────────────────────────────────────────────────────
interface ContainerProps {
  children: React.ReactNode;
  className?: string;
  // size controla a largura máxima
  // sm: 640px | md: 768px | lg: 1024px | xl: 1280px (padrão) | full: 100%
  size?: "sm" | "md" | "lg" | "xl" | "full";
}

// ── Mapa de larguras ──────────────────────────────────────────
const sizeMap = {
  sm: "max-w-2xl", // 640px
  md: "max-w-3xl", // 768px
  lg: "max-w-5xl", // 1024px
  xl: "max-w-7xl", // 1280px (padrão)
  full: "max-w-full", // sem limite
};

// ── Componente ────────────────────────────────────────────────
export function Container({
  children,
  className,
  size = "xl",
}: ContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-4 sm:px-6 lg:px-8",
        sizeMap[size],
        className,
      )}
    >
      {children}
    </div>
  );
}
