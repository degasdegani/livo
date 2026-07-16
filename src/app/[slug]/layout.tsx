// src/app/[slug]/layout.tsx
// Aplica a fonte Inter Tight (LIVO-061) e os tokens de cor do agendamento público
// (public-booking-tokens.css) a toda a árvore de rotas [slug]/**. Escopo isolado:
// não afeta dashboard (Satoshi) nem institucional (Poppins) — mesmo princípio já
// documentado em src/lib/fonts.ts.
import "@/styles/public-booking-tokens.css";
import { interTight } from "@/lib/fonts";

export default function SlugLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className={interTight.className}>{children}</div>;
}
