// src/components/ui/badge.tsx

type BadgeVariant =
  | "success"
  | "warning"
  | "error"
  | "info"
  | "gold"
  | "neutral";

const variants: Record<BadgeVariant, string> = {
  success: "bg-[#3FB950]/15 text-[#3FB950] border-[#3FB950]/30",
  warning: "bg-[#D4A72C]/15 text-[#D4A72C] border-[#D4A72C]/30",
  error: "bg-[#C8102E]/15 text-[#C8102E] border-[#C8102E]/30",
  info: "bg-[#9A9AA6]/15 text-[#9A9AA6] border-[#9A9AA6]/30",
  gold: "bg-[#C8A24C]/15 text-[#C8A24C] border-[#C8A24C]/30",
  neutral: "bg-[#5E5E68]/15 text-[#9A9AA6] border-[#5E5E68]/30",
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export function Badge({
  children,
  variant = "neutral",
  className = "",
}: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold
        border ${variants[variant]} ${className}
      `}
    >
      {children}
    </span>
  );
}
