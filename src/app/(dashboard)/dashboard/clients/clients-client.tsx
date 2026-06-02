// src/app/(dashboard)/dashboard/clients/clients-client.tsx
"use client";

import { ClientOrigem } from "@prisma/client";
import { useCallback, useState, useTransition } from "react";
import { getClientsData, toggleClientBlock } from "./actions";

type Client = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  cpf: string | null;
  birthDate: Date | null;
  origem: string | null;
  bloqueado: boolean;
  totalVisits: number;
  lastVisitAt: Date | null;
  createdAt: Date;
};

type Stats = {
  total: number;
  bloqueados: number;
  aniversariantesMes: number;
};

const ORIGEM_LABELS: Record<ClientOrigem | string, string> = {
  Indicacao: "Indicação",
  Google: "Google",
  Instagram: "Instagram",
  Fachada: "Fachada",
  Outro: "Outro",
};

const ORIGEM_COLORS: Record<string, string> = {
  Indicacao: "bg-purple-500/20 text-purple-300",
  Google: "bg-blue-500/20 text-blue-300",
  Instagram: "bg-pink-500/20 text-pink-300",
  Fachada: "bg-amber-500/20 text-amber-300",
  Outro: "bg-gray-500/20 text-gray-300",
};

function formatPhone(phone: string) {
  const d = phone.replace(/\D/g, "");
  if (d.length === 11)
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10)
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return phone;
}

function formatDate(date: Date | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("pt-BR");
}

function daysSince(date: Date | null) {
  if (!date) return null;
  const diff = Date.now() - new Date(date).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function ClientsClient({
  initialClients,
  stats,
}: {
  initialClients: Client[];
  stats: Stats;
}) {
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [search, setSearch] = useState("");
  const [origem, setOrigem] = useState("todos");
  const [filtroAtivo, setFiltroAtivo] = useState<
    "todos" | "sumidos" | "aniversariantes" | "bloqueados"
  >("todos");
  const [sumidoDias, setSumidoDias] = useState(60);
  const [isPending, startTransition] = useTransition();
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const applyFilters = useCallback(() => {
    startTransition(async () => {
      const result = await getClientsData({
        search: search || undefined,
        origem: origem !== "todos" ? origem : undefined,
        sumidoDias: filtroAtivo === "sumidos" ? sumidoDias : undefined,
        aniversariantesMes: filtroAtivo === "aniversariantes",
        soBloqueados: filtroAtivo === "bloqueados",
      });
      setClients(result as Client[]);
    });
  }, [search, origem, filtroAtivo, sumidoDias]);

  function handleSearchKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") applyFilters();
  }

  async function handleToggleBlock(client: Client) {
    await toggleClientBlock(client.id);
    setClients((prev) =>
      prev.map((c) =>
        c.id === client.id ? { ...c, bloqueado: !c.bloqueado } : c,
      ),
    );
    if (selectedClient?.id === client.id) {
      setSelectedClient((prev) =>
        prev ? { ...prev, bloqueado: !prev.bloqueado } : null,
      );
    }
  }

  return (
    <div className="flex h-full gap-6">
      {/* Coluna principal */}
      <div className="flex-1 min-w-0 space-y-5">
        {/* KPIs */}
        <div className="grid grid-cols-3 gap-4">
          {[
            {
              label: "Total de clientes",
              value: stats.total,
              color: "text-white",
            },
            {
              label: "Aniversariantes este mês",
              value: stats.aniversariantesMes,
              color: "text-[#C8A24C]",
            },
            {
              label: "Bloqueados",
              value: stats.bloqueados,
              color: "text-red-400",
            },
          ].map((kpi) => (
            <div
              key={kpi.label}
              className="bg-[#17171C] border border-[#2A2A33] rounded-xl p-4"
            >
              <p className="text-sm text-[#9A9AA6]">{kpi.label}</p>
              <p className={`text-3xl font-bold mt-1 ${kpi.color}`}>
                {kpi.value}
              </p>
            </div>
          ))}
        </div>

        {/* Barra de filtros */}
        <div className="bg-[#17171C] border border-[#2A2A33] rounded-xl p-4 space-y-3">
          {/* Busca */}
          <div className="flex gap-3">
            <input
              className="flex-1 bg-[#0B0B0D] border border-[#2A2A33] rounded-lg px-4 py-2.5 text-white placeholder-[#6E6E78] focus:outline-none focus:border-[#C8102E] text-sm transition-colors"
              placeholder="Buscar por nome, telefone, e-mail ou CPF..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleSearchKeyDown}
            />
            <select
              className="bg-[#0B0B0D] border border-[#2A2A33] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#C8102E] transition-colors"
              value={origem}
              onChange={(e) => setOrigem(e.target.value)}
            >
              <option value="todos">Todas as origens</option>
              {Object.entries(ORIGEM_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
            <button
              onClick={applyFilters}
              disabled={isPending}
              className="bg-[#C8102E] hover:bg-[#E0263D] disabled:opacity-50 text-white font-medium px-5 py-2.5 rounded-lg text-sm transition-colors"
            >
              {isPending ? "..." : "Buscar"}
            </button>
          </div>

          {/* Filtros rápidos */}
          <div className="flex items-center gap-2 flex-wrap">
            {[
              { key: "todos", label: "Todos" },
              { key: "aniversariantes", label: "🎂 Aniversariantes do mês" },
              { key: "sumidos", label: "👻 Sumidos" },
              { key: "bloqueados", label: "🚫 Bloqueados" },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => {
                  setFiltroAtivo(f.key as typeof filtroAtivo);
                  // Auto-aplica ao trocar filtro
                  startTransition(async () => {
                    const result = await getClientsData({
                      search: search || undefined,
                      origem: origem !== "todos" ? origem : undefined,
                      sumidoDias: f.key === "sumidos" ? sumidoDias : undefined,
                      aniversariantesMes: f.key === "aniversariantes",
                      soBloqueados: f.key === "bloqueados",
                    });
                    setClients(result as Client[]);
                  });
                }}
                className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                  filtroAtivo === f.key
                    ? "bg-[#C8102E] text-white"
                    : "bg-[#0B0B0D] border border-[#2A2A33] text-[#9A9AA6] hover:text-white hover:border-[#9A9AA6]"
                }`}
              >
                {f.label}
              </button>
            ))}

            {filtroAtivo === "sumidos" && (
              <div className="flex items-center gap-2 ml-2">
                <span className="text-xs text-[#9A9AA6]">há mais de</span>
                <select
                  className="bg-[#0B0B0D] border border-[#2A2A33] rounded-lg px-2 py-1 text-white text-xs focus:outline-none"
                  value={sumidoDias}
                  onChange={(e) => {
                    const dias = Number(e.target.value);
                    setSumidoDias(dias);
                    startTransition(async () => {
                      const result = await getClientsData({ sumidoDias: dias });
                      setClients(result as Client[]);
                    });
                  }}
                >
                  <option value={30}>30 dias</option>
                  <option value={60}>60 dias</option>
                  <option value={90}>90 dias</option>
                  <option value={120}>120 dias</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Lista de clientes */}
        <div className="bg-[#17171C] border border-[#2A2A33] rounded-xl overflow-hidden">
          {clients.length === 0 ? (
            <div className="p-12 text-center text-[#6E6E78]">
              <p className="text-4xl mb-3">👤</p>
              <p className="font-medium">Nenhum cliente encontrado</p>
              <p className="text-sm mt-1">
                Tente outros filtros ou aguarde novos agendamentos.
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#2A2A33]">
                  <th className="text-left px-4 py-3 text-xs font-medium text-[#6E6E78] uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[#6E6E78] uppercase tracking-wider">
                    Contato
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[#6E6E78] uppercase tracking-wider">
                    Origem
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[#6E6E78] uppercase tracking-wider">
                    Visitas
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[#6E6E78] uppercase tracking-wider">
                    Última visita
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {clients.map((client, i) => {
                  const diasSumido = daysSince(client.lastVisitAt);
                  return (
                    <tr
                      key={client.id}
                      className={`border-b border-[#2A2A33] last:border-0 hover:bg-[#1F1F27] cursor-pointer transition-colors ${
                        selectedClient?.id === client.id
                          ? "bg-[#1F1F27]"
                          : i % 2 === 0
                            ? ""
                            : "bg-[#0B0B0D]/30"
                      }`}
                      onClick={() =>
                        setSelectedClient(
                          selectedClient?.id === client.id ? null : client,
                        )
                      }
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#C8102E]/20 flex items-center justify-center text-sm font-bold text-[#C8102E] shrink-0">
                            {client.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p
                              className={`font-medium text-sm ${client.bloqueado ? "text-red-400 line-through" : "text-white"}`}
                            >
                              {client.name}
                            </p>
                            {client.birthDate && (
                              <p className="text-xs text-[#C8A24C]">
                                🎂{" "}
                                {new Date(client.birthDate).toLocaleDateString(
                                  "pt-BR",
                                  { day: "2-digit", month: "long" },
                                )}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-white">
                          {formatPhone(client.phone)}
                        </p>
                        {client.email && (
                          <p className="text-xs text-[#9A9AA6]">
                            {client.email}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {client.origem ? (
                          <span
                            className={`text-xs font-medium px-2 py-1 rounded-full ${ORIGEM_COLORS[client.origem] ?? "bg-gray-500/20 text-gray-300"}`}
                          >
                            {ORIGEM_LABELS[client.origem] ?? client.origem}
                          </span>
                        ) : (
                          <span className="text-xs text-[#6E6E78]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-white font-medium">
                          {client.totalVisits}
                        </span>
                        <span className="text-xs text-[#6E6E78] ml-1">
                          visitas
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {client.lastVisitAt ? (
                          <div>
                            <p className="text-sm text-white">
                              {formatDate(client.lastVisitAt)}
                            </p>
                            {diasSumido !== null && diasSumido > 30 && (
                              <p className="text-xs text-amber-400">
                                há {diasSumido} dias
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-[#6E6E78]">Nunca</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {client.bloqueado && (
                          <span className="text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded-full">
                            Bloqueado
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <p className="text-xs text-[#6E6E78] text-center">
          {clients.length} cliente{clients.length !== 1 ? "s" : ""} exibido
          {clients.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Painel lateral — detalhe do cliente */}
      {selectedClient && (
        <div className="w-80 shrink-0">
          <div className="bg-[#17171C] border border-[#2A2A33] rounded-xl p-5 sticky top-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3
                  className={`font-semibold text-lg ${selectedClient.bloqueado ? "text-red-400" : "text-white"}`}
                >
                  {selectedClient.name}
                </h3>
                {selectedClient.bloqueado && (
                  <span className="text-xs text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">
                    Bloqueado
                  </span>
                )}
              </div>
              <button
                onClick={() => setSelectedClient(null)}
                className="text-[#6E6E78] hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <p className="text-[#6E6E78] text-xs uppercase tracking-wider mb-1">
                  Contato
                </p>
                <p className="text-white">
                  {formatPhone(selectedClient.phone)}
                </p>
                {selectedClient.email && (
                  <p className="text-[#9A9AA6]">{selectedClient.email}</p>
                )}
              </div>

              {selectedClient.cpf && (
                <div>
                  <p className="text-[#6E6E78] text-xs uppercase tracking-wider mb-1">
                    CPF
                  </p>
                  <p className="text-white font-mono">
                    {selectedClient.cpf.replace(
                      /(\d{3})(\d{3})(\d{3})(\d{2})/,
                      "$1.$2.$3-$4",
                    )}
                  </p>
                </div>
              )}

              {selectedClient.birthDate && (
                <div>
                  <p className="text-[#6E6E78] text-xs uppercase tracking-wider mb-1">
                    Nascimento
                  </p>
                  <p className="text-white">
                    {formatDate(selectedClient.birthDate)} 🎂
                  </p>
                </div>
              )}

              {selectedClient.origem && (
                <div>
                  <p className="text-[#6E6E78] text-xs uppercase tracking-wider mb-1">
                    Origem
                  </p>
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full ${ORIGEM_COLORS[selectedClient.origem] ?? ""}`}
                  >
                    {ORIGEM_LABELS[selectedClient.origem] ??
                      selectedClient.origem}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#2A2A33]">
                <div className="bg-[#0B0B0D] rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-white">
                    {selectedClient.totalVisits}
                  </p>
                  <p className="text-xs text-[#6E6E78]">Visitas</p>
                </div>
                <div className="bg-[#0B0B0D] rounded-lg p-3 text-center">
                  <p className="text-sm font-bold text-white">
                    {formatDate(selectedClient.lastVisitAt)}
                  </p>
                  <p className="text-xs text-[#6E6E78]">Última visita</p>
                </div>
              </div>

              <div>
                <p className="text-[#6E6E78] text-xs uppercase tracking-wider mb-1">
                  Cliente desde
                </p>
                <p className="text-[#9A9AA6] text-xs">
                  {formatDate(selectedClient.createdAt)}
                </p>
              </div>
            </div>

            {/* Ações */}
            <div className="pt-2 border-t border-[#2A2A33] space-y-2">
              <a
                href={`https://wa.me/55${selectedClient.phone.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full bg-green-600 hover:bg-green-500 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
              >
                💬 WhatsApp
              </a>
              <button
                onClick={() => handleToggleBlock(selectedClient)}
                className={`w-full text-sm font-medium py-2.5 rounded-lg transition-colors ${
                  selectedClient.bloqueado
                    ? "bg-[#1F1F27] hover:bg-[#2A2A33] text-[#9A9AA6]"
                    : "bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30"
                }`}
              >
                {selectedClient.bloqueado
                  ? "✓ Desbloquear cliente"
                  : "🚫 Bloquear cliente"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
