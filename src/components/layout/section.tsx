import { cn } from "@/lib/utils";

interface SectionProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
  padding?: "sm" | "md" | "lg" | "xl";
}

const paddingMap = {
  sm: "py-12",
  md: "py-20",
  lg: "py-28",
  xl: "py-40",
};

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
