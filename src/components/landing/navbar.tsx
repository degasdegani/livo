"use client";

import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { poppins } from "@/lib/fonts";
import { useEffect, useState } from "react";

const NAV_LINKS = [
  // "Funcionalidades" foi absorvido em /produto. Embaixadores continua na
  // Home; usa /#embaixadores para funcionar mesmo a partir de /produto e /planos.
  { label: "Produto", href: "/produto" },
  { label: "Planos", href: "/planos" },
  { label: "Embaixadores", href: "/#embaixadores" },
  { label: "Entrar", href: "/login" },
] as const;

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50">
        <div
          className="absolute inset-0 z-0 transition-all duration-300"
          style={{
            background: scrolled || mobileOpen ? "rgba(0,0,0,0.96)" : "rgba(0,0,0,0.5)",
            backdropFilter: "blur(24px) saturate(180%)",
            borderBottom: scrolled || mobileOpen
              ? "1px solid rgba(255,255,255,0.08)"
              : "1px solid transparent",
          }}
        />

        <Container className="relative flex items-center justify-between h-16">
          {/* Logo */}
          <a href="/" className="flex items-center">
            <span
              className={poppins.className}
              style={{
                fontSize: "24px",
                fontWeight: 300,
                letterSpacing: "0.35em",
                color: "#FFFFFF",
              }}
            >
              L I V O
            </span>
          </a>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-[#A1A1AA] hover:text-(--livo-cream) transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Desktop CTA */}
          <a href="/onboarding" className="hidden md:block">
            <Button variant="red" size="sm">
              Começar agora
            </Button>
          </a>

          {/* Mobile: hamburger */}
          <button
            type="button"
            className="md:hidden flex flex-col gap-1.5 p-2 rounded-lg transition-colors"
            style={{ color: "#A1A1AA" }}
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
          >
            <span
              className="block w-5 h-px transition-all duration-300"
              style={{
                background: "var(--livo-cream)",
                transformOrigin: "center",
                transform: mobileOpen ? "translateY(4px) rotate(45deg)" : "none",
              }}
            />
            <span
              className="block w-5 h-px transition-all duration-300"
              style={{
                background: "var(--livo-cream)",
                opacity: mobileOpen ? 0 : 1,
              }}
            />
            <span
              className="block w-5 h-px transition-all duration-300"
              style={{
                background: "var(--livo-cream)",
                transformOrigin: "center",
                transform: mobileOpen ? "translateY(-8px) rotate(-45deg)" : "none",
              }}
            />
          </button>
        </Container>

        {/* Mobile menu panel */}
        {mobileOpen && (
          <div
            className="md:hidden border-t relative z-10"
            style={{
              background: "rgba(0,0,0,0.98)",
              borderColor: "rgba(255,255,255,0.08)",
            }}
          >
            <nav className="flex flex-col px-6 py-4 gap-1">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="text-base font-medium py-3 border-b transition-colors hover:text-(--livo-cream)"
                  style={{
                    color: "#A1A1AA",
                    borderColor: "rgba(255,255,255,0.05)",
                    textDecoration: "none",
                  }}
                >
                  {link.label}
                </a>
              ))}
              <a href="/onboarding" className="mt-4" onClick={() => setMobileOpen(false)}>
                <Button variant="red" size="lg" className="w-full">
                  Começar agora
                </Button>
              </a>
            </nav>
          </div>
        )}
      </header>

      {/* Backdrop mobile */}
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 md:hidden border-none outline-none p-0 cursor-default"
          style={{ background: "rgba(0,0,0,0.5)", top: "64px" }}
          onClick={() => setMobileOpen(false)}
          aria-label="Fechar menu"
        />
      )}
    </>
  );
}
