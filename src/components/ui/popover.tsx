"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PopoverProps {
  /** Viewport-relative X of the anchor point (clientX). */
  anchorX: number;
  /** Viewport-relative Y of the anchor point (clientY). */
  anchorY: number;
  onClose: () => void;
  children: ReactNode;
  width?: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// Popover
// ══════════════════════════════════════════════════════════════════════════════

export function Popover({ anchorX, anchorY, onClose, children, width = 320 }: PopoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  // Start invisible at anchor position; position+visibility set after first paint.
  const [pos, setPos] = useState({ left: anchorX + 8, top: anchorY });
  const [visible, setVisible] = useState(false);

  // ESC closes
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Outside pointerdown closes; listener registered after first paint so the
  // triggering click (pointerdown on the grid) doesn't immediately close the popover.
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [onClose]);

  // Measure, flip if needed, animate in, auto-focus first element.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const h = el.offsetHeight;

    // Default: open to the right and at the same Y as the anchor.
    let left = anchorX + 8;
    let top = anchorY;

    // Flip horizontal if would overflow right edge.
    if (left + width > vw - 8) {
      left = anchorX - width - 8;
    }
    if (left < 8) left = 8;

    // Flip vertical if would overflow bottom edge.
    if (top + h > vh - 8) {
      top = anchorY - h;
    }
    if (top < 8) top = 8;

    setPos({ left, top });
    setVisible(true);

    // Auto-focus first interactive element for keyboard accessibility.
    el.querySelector<HTMLElement>("input, button, select, textarea")?.focus();
  }, [anchorX, anchorY, width]);

  // Guard against SSR (client component renders on server in Next.js).
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={ref}
      role="dialog"
      aria-modal="false"
      style={{
        position: "fixed",
        left: pos.left,
        top: pos.top,
        width,
        zIndex: "var(--z-modal, 50)",
        backgroundColor: "var(--bg-card-elevated)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
        padding: 16,
        // Entry animation: invisible + scaled down → visible + full size.
        opacity: visible ? 1 : 0,
        transform: visible ? "scale(1)" : "scale(0.95)",
        transition: "opacity 150ms ease, transform 150ms ease",
        transformOrigin: "top left",
      }}
    >
      {children}
    </div>,
    document.body,
  );
}
