// src/components/livia-bubble.tsx
"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
  id: string;
}

interface LiviaBubbleProps {
  barbershopId?: string;
  barbershopName?: string;
}

// ── Ícone de fechar ───────────────────────────────────────────
function IconX({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

// ── Ícone de enviar ───────────────────────────────────────────
function IconSend() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

// ── Animação de digitando ─────────────────────────────────────
function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-2 h-2 rounded-full bg-[#C8102E]"
          style={{
            animation: `liviaBounce 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

// ── Mensagem individual ───────────────────────────────────────
function ChatMessage({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  return (
    <div
      className={`flex gap-2 ${isUser ? "flex-row-reverse" : "flex-row"} items-end`}
    >
      {/* Avatar da Lívia */}
      {!isUser && (
        <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 border border-[#C8102E]/30">
          <Image
            src="/livia.png"
            alt="Lívia"
            width={28}
            height={28}
            className="object-cover object-top scale-110"
          />
        </div>
      )}
      {/* Balão */}
      <div
        className={`max-w-[78%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? "bg-[#C8102E] text-white rounded-br-sm"
            : "bg-[#1F1F27] text-[#E8E8EE] rounded-bl-sm border border-[#2A2A33]"
        }`}
      >
        {msg.content}
      </div>
    </div>
  );
}

// ── Sugestões iniciais ────────────────────────────────────────
const SUGESTOES = [
  "Qual foi meu faturamento este mês?",
  "Como cadastro um novo cliente?",
  "Dicas para aumentar meu ticket médio",
  "Como funciona o sistema de comissões?",
];

// ── Componente principal ──────────────────────────────────────
export function LiviaBubble({
  barbershopId,
  barbershopName,
}: LiviaBubbleProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSugestoes, setShowSugestoes] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll automático para última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Focar input quando abre
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;

    const userMsg: Message = {
      role: "user",
      content: text.trim(),
      id: Math.random().toString(36).slice(2),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setShowSugestoes(false);

    try {
      const allMessages = [...messages, userMsg];
      const res = await fetch("/api/livia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: allMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          barbershopId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Erro desconhecido");
      }

      const assistantMsg: Message = {
        role: "assistant",
        content: data.message,
        id: Math.random().toString(36).slice(2),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errorMsg: Message = {
        role: "assistant",
        content:
          "Ops, tive um problema técnico. Tente novamente em instantes. \u{1F527}",
        id: Math.random().toString(36).slice(2),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  function resetChat() {
    setMessages([]);
    setShowSugestoes(true);
    setInput("");
  }

  return (
    <>
      {/* ── CSS da animação de bounce ── */}
      <style>{`
        @keyframes liviaBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-6px); opacity: 1; }
        }
        @keyframes liviaSlideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes liviaPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(200,16,46,0.4); }
          50% { box-shadow: 0 0 0 8px rgba(200,16,46,0); }
        }
      `}</style>

      {/* ── JANELA DO CHAT ── */}
      {open && (
        <div
          className="fixed bottom-24 right-6 z-50 w-[340px] sm:w-[380px] flex flex-col rounded-2xl overflow-hidden shadow-2xl border border-[#2A2A33]"
          style={{
            animation: "liviaSlideUp 0.25s ease-out",
            background: "#0B0B0D",
            maxHeight: "520px",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center gap-3 px-4 py-3 border-b border-[#2A2A33]"
            style={{ background: "#17171C" }}
          >
            <div className="relative">
              <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-[#C8102E]/50">
                <Image
                  src="/livia.png"
                  alt="Lívia"
                  width={36}
                  height={36}
                  className="object-cover object-top scale-110"
                />
              </div>
              {/* dot online */}
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#3FB950] border-2 border-[#17171C]" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-white leading-none">Lívia</p>
              <p className="text-xs text-[#6E6E78] mt-0.5">
                Assistente LIVO · IA
              </p>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  onClick={resetChat}
                  className="p-1.5 rounded-lg text-[#6E6E78] hover:text-[#9A9AA6] hover:bg-[#1F1F27] transition-colors text-xs"
                  title="Nova conversa"
                >
                  Limpar
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg text-[#6E6E78] hover:text-white hover:bg-[#1F1F27] transition-colors"
                aria-label="Fechar chat"
              >
                <IconX size={15} />
              </button>
            </div>
          </div>

          {/* Mensagens */}
          <div
            className="flex-1 overflow-y-auto p-4 space-y-3"
            style={{ minHeight: 0, maxHeight: "340px" }}
          >
            {/* Mensagem de boas-vindas */}
            {messages.length === 0 && (
              <div className="flex gap-2 items-end">
                <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 border border-[#C8102E]/30">
                  <Image
                    src="/livia.png"
                    alt="Lívia"
                    width={28}
                    height={28}
                    className="object-cover object-top scale-110"
                  />
                </div>
                <div className="bg-[#1F1F27] border border-[#2A2A33] rounded-2xl rounded-bl-sm px-3 py-2 text-sm text-[#E8E8EE] leading-relaxed max-w-[78%]">
                  Olá! Sou a Lívia, sua assistente
                  {barbershopName ? ` da ${barbershopName}` : ""}. {"\u{1F44B}"}
                  <br />
                  <span className="text-[#9A9AA6] text-xs">
                    Como posso ajudar você hoje?
                  </span>
                </div>
              </div>
            )}

            {/* Histórico de mensagens */}
            {messages.map((msg) => (
              <ChatMessage key={msg.id} msg={msg} />
            ))}

            {/* Animação de digitando */}
            {loading && (
              <div className="flex gap-2 items-end">
                <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 border border-[#C8102E]/30">
                  <Image
                    src="/livia.png"
                    alt="Lívia"
                    width={28}
                    height={28}
                    className="object-cover object-top scale-110"
                  />
                </div>
                <div className="bg-[#1F1F27] border border-[#2A2A33] rounded-2xl rounded-bl-sm">
                  <TypingDots />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Sugestões */}
          {showSugestoes && messages.length === 0 && (
            <div className="px-4 pb-3 flex flex-wrap gap-2">
              {SUGESTOES.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="text-xs px-3 py-1.5 rounded-full border border-[#2A2A33] text-[#9A9AA6] hover:border-[#C8102E]/50 hover:text-[#C8102E] hover:bg-[#C8102E]/5 transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div
            className="px-3 pb-3 pt-2 border-t border-[#2A2A33]"
            style={{ background: "#17171C" }}
          >
            <div className="flex items-center gap-2 bg-[#0B0B0D] rounded-xl border border-[#2A2A33] px-3 py-2 focus-within:border-[#C8102E]/50 transition-colors">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Pergunte algo..."
                disabled={loading}
                className="flex-1 bg-transparent text-sm text-white placeholder-[#6E6E78] outline-none disabled:opacity-50"
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || loading}
                className="flex-shrink-0 w-7 h-7 rounded-lg bg-[#C8102E] hover:bg-[#E0263D] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-white transition-colors"
                aria-label="Enviar"
              >
                <IconSend />
              </button>
            </div>
            <p className="text-center text-[10px] text-[#3F3F46] mt-2">
              Lívia · Powered by Claude AI
            </p>
          </div>
        </div>
      )}

      {/* ── BOTÃO FLUTUANTE ── */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full overflow-hidden shadow-2xl border-2 transition-all duration-200 hover:scale-110 active:scale-95"
        style={{
          borderColor: open ? "#C8102E" : "rgba(200,16,46,0.4)",
          animation: !open ? "liviaPulse 2.5s ease-in-out infinite" : "none",
        }}
        aria-label="Abrir assistente Lívia"
      >
        <Image
          src="/livia.png"
          alt="Lívia"
          width={56}
          height={56}
          className="object-cover object-top scale-125"
        />
      </button>
    </>
  );
}
