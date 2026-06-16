// ============================================================
// LIVO — Lista de Clientes com Busca
// Filtragem em tempo real por nome ou telefone
// ============================================================

"use client";

import { Users, X } from "lucide-react";
import { useState } from "react";

interface Client {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  totalVisits: number;
  lastVisitAt: Date | null;
  createdAt: Date;
}

function formatDate(date: Date | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

// Cores do avatar baseadas na inicial do nome
const AVATAR_COLORS = [
  "#FF2D55",
  "#00D4FF",
  "#00D4A0",
  "#7C3AED",
  "#FF9500",
  "#FF3B30",
  "#34C759",
  "#5856D6",
];
function getAvatarColor(name: string): string {
  const index = name.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

export function ClientList({ clients }: { clients: Client[] }) {
  const [search, setSearch] = useState("");

  // Filtra por nome ou telefone
  const filtered = clients.filter((c) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return c.name.toLowerCase().includes(term) || c.phone.includes(term);
  });

  return (
    <div className="flex flex-col gap-4">
      {/* Campo de busca */}
      <div className="relative">
        <span
          className="absolute left-4 top-1/2 -translate-y-1/2 text-sm"
          style={{ color: "#3F3F46" }}
        >
          🔍
        </span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome ou telefone..."
          className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white outline-none placeholder:text-[#3F3F46]"
          style={{
            background: "#0A0A0A",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 hover:opacity-70"
            style={{ color: "#52525B" }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Resultado da busca */}
      {search && (
        <p className="text-xs" style={{ color: "#52525B" }}>
          {filtered.length} resultado{filtered.length !== 1 ? "s" : ""} para "
          {search}"
        </p>
      )}

      {/* Lista */}
      {filtered.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-16 text-center rounded-2xl"
          style={{
            background: "#0A0A0A",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <Users size={40} style={{ color: "var(--text-tertiary)" }} className="mb-3" />
          <p className="font-bold text-white mb-1">
            {search ? "Nenhum cliente encontrado" : "Nenhum cliente ainda"}
          </p>
          <p className="text-sm" style={{ color: "#52525B" }}>
            {search
              ? "Tente buscar por outro nome ou telefone"
              : "Os clientes aparecem aqui automaticamente após o primeiro agendamento"}
          </p>
        </div>
      ) : (
        <div
          className="rounded-2xl overflow-hidden"
          style={{ border: "1px solid rgba(255,255,255,0.06)" }}
        >
          {filtered.map((client, i) => {
            const color = getAvatarColor(client.name);
            return (
              <div
                key={client.id}
                className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-white/[0.02]"
                style={{
                  background: "#0A0A0A",
                  borderBottom:
                    i < filtered.length - 1
                      ? "1px solid rgba(255,255,255,0.04)"
                      : undefined,
                }}
              >
                {/* Avatar */}
                <div
                  className="flex items-center justify-center rounded-full shrink-0 font-black text-sm"
                  style={{
                    width: 40,
                    height: 40,
                    background: `${color}20`,
                    border: `1.5px solid ${color}40`,
                    color,
                  }}
                >
                  {getInitials(client.name)}
                </div>

                {/* Info principal */}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-white truncate">
                    {client.name}
                  </p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs" style={{ color: "#52525B" }}>
                      {client.phone}
                    </span>
                    {client.email && (
                      <span
                        className="text-xs truncate"
                        style={{ color: "#3F3F46" }}
                      >
                        {client.email}
                      </span>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="text-right shrink-0">
                  <div className="flex items-center gap-1 justify-end mb-0.5">
                    <span className="font-black text-sm" style={{ color }}>
                      {client.totalVisits}
                    </span>
                    <span className="text-xs" style={{ color: "#52525B" }}>
                      {client.totalVisits === 1 ? "visita" : "visitas"}
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: "#3F3F46" }}>
                    {formatDate(client.lastVisitAt)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
