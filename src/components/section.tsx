// ============================================================
// LIVO — Section
// Wrapper de seção com padding vertical padrão
// Garante espaçamento consistente entre todas as seções
// ============================================================

import { cn } from "@/lib/utils";

// ── Tipos ─────────────────────────────────────────────────────
interface SectionProps {
  children: React.ReactNode;
  className?: string;
  // id para links de ancoragem no menu
  id?: string;
  // padding controla o espaçamento vertical
  padding?: "sm" | "md" | "lg" | "xl";
}

// ── Mapa de padding ───────────────────────────────────────────
const paddingMap = {
  sm: "py-12",
  md: "py-20",
  lg: "py-28",
  xl: "py-40",
};

// ── Componente ────────────────────────────────────────────────
export function Section({
  children,
  className,
  id,
  padding = "lg",
}: SectionProps) {
  return (
    <section
      id={id}
      className={cn("relative w-full", paddingMap[padding], className)}
    >
      {children}
    </section>
  );
}
