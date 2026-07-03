// src/components/public-footer.tsx
// Rodapé global de marca para páginas PÚBLICAS + AUTH + LEGAL + ONBOARDING.
// Inserido 1x no layout raiz; usa gate por caminho (usePathname) para NÃO
// aparecer no dashboard interno, na TV, nem na home (que já tem footer de
// marketing próprio). Texto puro, sem link.
"use client";

import { usePathname } from "next/navigation";

export function PublicFooter() {
  const pathname = usePathname();

  // Denylist: dashboard e TV são telas operacionais; "/" (home) já tem o
  // footer de marketing próprio.
  const hidden =
    pathname === "/" ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/tv");

  if (hidden) return null;

  return (
    <footer
      className="text-center py-6"
      data-theme="dark"
      style={{ backgroundColor: "var(--bg-base)" }}
    >
      <p className="text-xs" style={{ color: "#52525B" }}>
        Product by S.A.L.A Tecnologia © 2026
      </p>
    </footer>
  );
}
