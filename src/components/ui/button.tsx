// ============================================================
// LIVO — Button Component
// Componente de botão com todas as variantes do Design System
// Construído sobre shadcn/ui + CVA + Radix
// ============================================================

import { cn } from "@/lib/utils";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

// ── Variantes do botão ────────────────────────────────────────
// Define todas as combinações possíveis de estilo
const buttonVariants = cva(
  // Base — aplicada em TODAS as variantes
  [
    "inline-flex items-center justify-center gap-2",
    "whitespace-nowrap rounded-xl",
    "font-semibold text-sm tracking-wide",
    "transition-all duration-200",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-40",
    "cursor-pointer select-none",
  ],
  {
    variants: {
      // ── Variante visual ──────────────────────────────────────
      variant: {
        // Botão primário — vermelho Livo
        // Usado em: CTAs principais, "Novo agendamento", "Confirmar"
        primary: [
          "bg-[#FF2D55] text-white",
          "shadow-[0_4px_16px_rgba(255,45,85,0.3)]",
          "hover:bg-[#FF4566]",
          "hover:shadow-[0_6px_24px_rgba(255,45,85,0.45)]",
          "hover:-translate-y-0.5",
          "active:translate-y-0 active:shadow-none",
          "focus-visible:ring-[#FF2D55]",
        ],

        // Botão secundário — borda sutil
        // Usado em: ações secundárias, "Cancelar", "Voltar"
        secondary: [
          "bg-white/5 text-white",
          "border border-white/10",
          "backdrop-blur-sm",
          "hover:bg-white/10 hover:border-white/20",
          "hover:-translate-y-0.5",
          "focus-visible:ring-white/30",
        ],

        // Botão ghost — sem fundo
        // Usado em: navegação, links de menu, ações discretas
        ghost: [
          "bg-transparent text-[#A1A1AA]",
          "hover:bg-white/5 hover:text-white",
          "focus-visible:ring-white/30",
        ],

        // Botão outline — borda vermelha
        // Usado em: destaques secundários, estado selecionado
        outline: [
          "bg-transparent text-[#FF2D55]",
          "border border-[#FF2D55]/30",
          "hover:bg-[#FF2D55]/10 hover:border-[#FF2D55]/60",
          "focus-visible:ring-[#FF2D55]",
        ],

        // Botão destructive — para ações perigosas
        // Usado em: "Excluir", "Cancelar agendamento", confirmações de risco
        destructive: [
          "bg-[#FF2D55]/10 text-[#FF2D55]",
          "border border-[#FF2D55]/20",
          "hover:bg-[#FF2D55]/20 hover:border-[#FF2D55]/40",
          "focus-visible:ring-[#FF2D55]",
        ],

        // Botão success — para ações de confirmação positiva
        success: [
          "bg-[#00D4A0]/10 text-[#00D4A0]",
          "border border-[#00D4A0]/20",
          "hover:bg-[#00D4A0]/20 hover:border-[#00D4A0]/40",
        ],

        // Link — texto sem fundo
        link: [
          "bg-transparent text-[#FF2D55]",
          "underline-offset-4 hover:underline",
          "h-auto px-0 py-0",
        ],
      },

      // ── Tamanho ──────────────────────────────────────────────
      size: {
        xs: "h-7 px-3 text-xs rounded-lg gap-1.5",
        sm: "h-8 px-4 text-xs rounded-lg",
        md: "h-10 px-5 text-sm", // padrão
        lg: "h-12 px-6 text-base",
        xl: "h-14 px-8 text-base",
        // Tamanho ícone (quadrado)
        icon: "h-10 w-10 p-0",
        "icon-sm": "h-8 w-8 p-0 rounded-lg",
        "icon-lg": "h-12 w-12 p-0",
      },
    },

    // ── Valores padrão ────────────────────────────────────────
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

// ── Tipos das props ───────────────────────────────────────────
export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  // asChild permite renderizar como outro elemento (ex: Link)
  // Exemplo: <Button asChild><Link href="/dashboard">Entrar</Link></Button>
  asChild?: boolean;
}

// ── Componente ────────────────────────────────────────────────
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";

// ── Exports ───────────────────────────────────────────────────
export { Button, buttonVariants };
