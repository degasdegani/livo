// ============================================================
// LIVO — useScrollAnimation Hook
// Detecta quando um elemento entra no viewport e retorna
// estado para triggar animações de entrada
//
// Uso:
//   const { ref, isVisible } = useScrollAnimation()
//   <div ref={ref} className={isVisible ? "visible" : "hidden"}>
// ============================================================

"use client";

import { useEffect, useRef, useState } from "react";

interface UseScrollAnimationOptions {
  // Quanto do elemento precisa estar visível para triggar (0 a 1)
  // 0.1 = 10% do elemento visível já trigga
  threshold?: number;
  // Se true, anima toda vez que entrar no viewport
  // Se false (padrão), anima apenas uma vez
  repeat?: boolean;
}

export function useScrollAnimation(options: UseScrollAnimationOptions = {}) {
  const { threshold = 0.1, repeat = false } = options;

  const ref = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          // Se não repete, desconecta depois de animar
          if (!repeat) {
            observer.disconnect();
          }
        } else if (repeat) {
          setIsVisible(false);
        }
      },
      { threshold },
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [threshold, repeat]);

  return { ref, isVisible };
}
