"use client";

import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div
        className="absolute inset-0 transition-all duration-300"
        style={{
          background: scrolled ? "rgba(5,5,5,0.9)" : "rgba(5,5,5,0.5)",
          backdropFilter: "blur(24px) saturate(180%)",
          borderBottom: scrolled
            ? "1px solid rgba(255,255,255,0.08)"
            : "1px solid transparent",
        }}
      />

      <Container className="relative flex items-center justify-between h-16">
        <a href="#" className="flex items-center gap-3">
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#FF2D55",
              display: "inline-block",
              boxShadow: "0 0 12px rgba(255,45,85,0.6)",
            }}
          />
          <span
            className="font-black text-white"
            style={{ fontSize: "20px", letterSpacing: "-0.5px" }}
          >
            Livo
          </span>
        </a>

        <nav className="hidden md:flex items-center gap-8">
          <a
            href="#produto"
            className="text-sm font-medium text-[#A1A1AA] hover:text-white transition-colors"
          >
            Produto
          </a>
          <a
            href="#funcionalidades"
            className="text-sm font-medium text-[#A1A1AA] hover:text-white transition-colors"
          >
            Funcionalidades
          </a>
          <a
            href="#planos"
            className="text-sm font-medium text-[#A1A1AA] hover:text-white transition-colors"
          >
            Planos
          </a>
          <a
            href="#parceria"
            className="text-sm font-medium text-[#A1A1AA] hover:text-white transition-colors"
          >
            Parceria
          </a>
        </nav>

        <Button variant="primary" size="sm">
          Começar agora
        </Button>
      </Container>
    </header>
  );
}
