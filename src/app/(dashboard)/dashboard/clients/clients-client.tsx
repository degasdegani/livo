// src/app/(dashboard)/dashboard/clients/clients-client.tsx
"use client";

import type { ClientOrigem } from "@prisma/client";
import { Pencil } from "lucide-react";
import { useCallback, useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import {
  createClient,
  getClientsData,
  toggleClientBlock,
  updateClient,
} from "./actions";

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
  notes: string | null;
  street: string | null;
  neighborhood: string | null;
  cep: string | null;
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

const EMPTY_FORM = {
  name: "",
  phone: "",
  email: "",
  cpf: "",
  birthDate: "",
  origem: "",
  notes: "",
};

const EMPTY_EDIT_FORM = {
  name: "",
  phone: "",
  email: "",
  cpf: "",
  birthDate: "",
  street: "",
  neighborhood: "",
  cep: "",
  origem: "",
  notes: "",
};

export function ClientsClient({
  initialClients,
  stats: initialStats,
}: {
  initialClients: Client[];
  stats: Stats;
}) {
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [stats, setStats] = useState<Stats>(initialStats);
  const [search, setSearch] = useState("");
  const [origem, setOrigem] = useState("todos");
  const [filtroAtivo, setFiltroAtivo] = useState<
    "todos" | "sumidos" | "aniversariantes" | "bloqueados"
  >("todos");
  const [sumidoDias, setSumidoDias] = useState(60);
  const [isPending, startTransition] = useTransition();
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Modal criar
  const [showModal, setShowModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  // Modal editar
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_EDIT_FORM);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

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

  function openModal() {
    setForm(EMPTY_FORM);
    setModalError(null);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setModalError(null);
  }

  async function handleCreateClient() {
    if (!form.name.trim()) {
      setModalError("Nome é obrigatório.");
      return;
    }
    if (!form.phone.trim()) {
      setModalError("Telefone é obrigatório.");
      return;
    }
    setModalLoading(true);
    setModalError(null);
    try {
      await createClient({
        name: form.name,
        phone: form.phone,
        email: form.email || undefined,
        cpf: form.cpf || undefined,
        birthDate: form.birthDate || undefined,
        origem: form.origem || undefined,
        notes: form.notes || undefined,
      });
      // Recarrega lista
      const result = await getClientsData();
      setClients(result as Client[]);
      setStats((prev) => ({ ...prev, total: prev.total + 1 }));
      closeModal();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Erro ao cadastrar.");
    } finally {
      setModalLoading(false);
    }
  }

  function openEditModal(client: Client) {
    setEditForm({
      name: client.name,
      phone: formatPhone(client.phone),
      email: client.email ?? "",
      cpf: client.cpf ?? "",
      birthDate: client.birthDate
        ? new Date(client.birthDate).toISOString().slice(0, 10)
        : "",
      street: client.street ?? "",
      neighborhood: client.neighborhood ?? "",
      cep: client.cep ?? "",
      origem: client.origem ?? "",
      notes: client.notes ?? "",
    });
    setEditError(null);
    setEditingClient(client);
  }

  function closeEditModal() {
    setEditingClient(null);
    setEditError(null);
  }

  async function handleUpdateClient() {
    if (!editForm.name.trim()) {
      setEditError("Nome é obrigatório.");
      return;
    }
    if (!editForm.phone.trim()) {
      setEditError("Telefone é obrigatório.");
      return;
    }
    if (!editingClient) return;
    setEditLoading(true);
    setEditError(null);
    try {
      const result = await updateClient(editingClient.id, {
        name: editForm.name,
        phone: editForm.phone,
        email: editForm.email || undefined,
        cpf: editForm.cpf || undefined,
        birthDate: editForm.birthDate || undefined,
        street: editForm.street || undefined,
        neighborhood: editForm.neighborhood || undefined,
        cep: editForm.cep || undefined,
        origem: editForm.origem || undefined,
        notes: editForm.notes || undefined,
      });
      if (!result.success) {
        setEditError(result.error ?? "Erro ao atualizar.");
        return;
      }
      const phone = editForm.phone.replace(/\D/g, "");
      const updated: Client = {
        ...editingClient,
        name: editForm.name.trim(),
        phone,
        email: editForm.email?.trim() || null,
        cpf: editForm.cpf?.replace(/\D/g, "") || null,
        birthDate: editForm.birthDate ? new Date(editForm.birthDate) : null,
        street: editForm.street?.trim() || null,
        neighborhood: editForm.neighborhood?.trim() || null,
        cep: editForm.cep?.replace(/\D/g, "") || null,
        origem: editForm.origem || null,
        notes: editForm.notes?.trim() || null,
      };
      setClients((prev) =>
        prev.map((c) => (c.id === editingClient.id ? updated : c)),
      );
      setSelectedClient(updated);
      closeEditModal();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Erro ao atualizar.");
    } finally {
      setEditLoading(false);
    }
  }

  return (
    <>
      {/* ───── MODAL CRIAR CLIENTE ───── */}
      <Modal
        open={showModal}
        onClose={closeModal}
        title="Novo cliente"
        description="Cadastro manual na sua base"
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Input
              id="create-name"
              label="Nome"
              required
              placeholder="Nome completo"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>

          <Input
            id="create-phone"
            label="Telefone"
            required
            placeholder="(11) 99999-9999"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          />

          <Input
            id="create-email"
            label="E-mail"
            type="email"
            placeholder="email@exemplo.com"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />

          <Input
            id="create-cpf"
            label="CPF"
            placeholder="000.000.000-00"
            value={form.cpf}
            onChange={(e) => setForm((f) => ({ ...f, cpf: e.target.value }))}
          />

          <Input
            id="create-birthdate"
            label="Data de nascimento"
            type="date"
            value={form.birthDate}
            onChange={(e) =>
              setForm((f) => ({ ...f, birthDate: e.target.value }))
            }
          />

          <div className="col-span-2">
            <label
              htmlFor="create-origem"
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 500,
                color: "var(--text-tertiary)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: 6,
              }}
            >
              Como nos conheceu?
            </label>
            <select
              id="create-origem"
              className="livo-input"
              value={form.origem}
              onChange={(e) =>
                setForm((f) => ({ ...f, origem: e.target.value }))
              }
            >
              <option value="">Selecionar origem</option>
              {Object.entries(ORIGEM_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="col-span-2">
            <label
              htmlFor="create-notes"
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 500,
                color: "var(--text-tertiary)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: 6,
              }}
            >
              Notas internas
            </label>
            <textarea
              id="create-notes"
              className="livo-input"
              style={{ resize: "vertical", minHeight: 72 }}
              placeholder="Observações sobre o cliente..."
              value={form.notes}
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value }))
              }
            />
          </div>
        </div>

        {modalError && (
          <div
            className="rounded-lg px-4 py-3 text-sm"
            style={{
              backgroundColor: "rgba(200,16,46,0.1)",
              border: "1px solid rgba(200,16,46,0.3)",
              color: "var(--status-red)",
            }}
          >
            {modalError}
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={closeModal}
            disabled={modalLoading}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
            style={{
              backgroundColor: "var(--bg-base)",
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleCreateClient}
            disabled={modalLoading}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
            style={{
              backgroundColor: "var(--color-primary)",
              color: "#ffffff",
            }}
            onMouseEnter={(e) => {
              if (!modalLoading)
                e.currentTarget.style.backgroundColor =
                  "var(--color-primary-hover)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "var(--color-primary)";
            }}
          >
            {modalLoading ? "Cadastrando..." : "Cadastrar cliente"}
          </button>
        </div>
      </Modal>

      {/* ───── MODAL EDITAR CLIENTE ───── */}
      <Modal
        open={!!editingClient}
        onClose={closeEditModal}
        title="Editar cliente"
        description="Atualiza os dados do cadastro"
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Input
              id="edit-name"
              label="Nome"
              required
              placeholder="Nome completo"
              value={editForm.name}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, name: e.target.value }))
              }
            />
          </div>

          <Input
            id="edit-phone"
            label="Telefone"
            required
            placeholder="(11) 99999-9999"
            value={editForm.phone}
            onChange={(e) =>
              setEditForm((f) => ({ ...f, phone: e.target.value }))
            }
          />

          <Input
            id="edit-email"
            label="E-mail"
            type="email"
            placeholder="email@exemplo.com"
            value={editForm.email}
            onChange={(e) =>
              setEditForm((f) => ({ ...f, email: e.target.value }))
            }
          />

          <Input
            id="edit-cpf"
            label="CPF"
            placeholder="000.000.000-00"
            value={editForm.cpf}
            onChange={(e) =>
              setEditForm((f) => ({ ...f, cpf: e.target.value }))
            }
          />

          <Input
            id="edit-birthdate"
            label="Data de nascimento"
            type="date"
            value={editForm.birthDate}
            onChange={(e) =>
              setEditForm((f) => ({ ...f, birthDate: e.target.value }))
            }
          />

          <div className="col-span-2">
            <label
              htmlFor="edit-origem"
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 500,
                color: "var(--text-tertiary)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: 6,
              }}
            >
              Como nos conheceu?
            </label>
            <select
              id="edit-origem"
              className="livo-input"
              value={editForm.origem}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, origem: e.target.value }))
              }
            >
              <option value="">Selecionar origem</option>
              {Object.entries(ORIGEM_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="col-span-2">
            <Input
              id="edit-street"
              label="Rua"
              placeholder="Rua das Flores, 123"
              value={editForm.street}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, street: e.target.value }))
              }
            />
          </div>

          <Input
            id="edit-neighborhood"
            label="Bairro"
            placeholder="Centro"
            value={editForm.neighborhood}
            onChange={(e) =>
              setEditForm((f) => ({
                ...f,
                neighborhood: e.target.value,
              }))
            }
          />

          <Input
            id="edit-cep"
            label="CEP"
            placeholder="00000-000"
            value={editForm.cep}
            onChange={(e) =>
              setEditForm((f) => ({ ...f, cep: e.target.value }))
            }
          />

          <div className="col-span-2">
            <label
              htmlFor="edit-notes"
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 500,
                color: "var(--text-tertiary)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: 6,
              }}
            >
              Notas internas
            </label>
            <textarea
              id="edit-notes"
              className="livo-input"
              style={{ resize: "vertical", minHeight: 72 }}
              placeholder="Observações sobre o cliente..."
              value={editForm.notes}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, notes: e.target.value }))
              }
            />
          </div>
        </div>

        {editError && (
          <div
            className="rounded-lg px-4 py-3 text-sm"
            style={{
              backgroundColor: "rgba(200,16,46,0.1)",
              border: "1px solid rgba(200,16,46,0.3)",
              color: "var(--status-red)",
            }}
          >
            {editError}
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={closeEditModal}
            disabled={editLoading}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
            style={{
              backgroundColor: "var(--bg-base)",
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleUpdateClient}
            disabled={editLoading}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
            style={{
              backgroundColor: "var(--color-primary)",
              color: "#ffffff",
            }}
            onMouseEnter={(e) => {
              if (!editLoading)
                e.currentTarget.style.backgroundColor =
                  "var(--color-primary-hover)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "var(--color-primary)";
            }}
          >
            {editLoading ? "Salvando..." : "Salvar alterações"}
          </button>
        </div>
      </Modal>

      <div className="flex h-full gap-6">
        {/* Coluna principal */}
        <div className="flex-1 min-w-0 space-y-5">
          {/* Header com botão novo cliente */}
          <div className="flex items-center justify-between">
            <div>
              <h1
                className="text-2xl font-bold"
                style={{ color: "var(--text-primary)" }}
              >
                Clientes
              </h1>
              <p
                className="text-sm mt-0.5"
                style={{ color: "var(--text-secondary)" }}
              >
                Gerencie sua base, filtre sumidos e veja aniversariantes.
              </p>
            </div>
            <button
              type="button"
              onClick={openModal}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors"
              style={{
                backgroundColor: "var(--color-primary)",
                color: "#ffffff",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor =
                  "var(--color-primary-hover)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "var(--color-primary)";
              }}
            >
              <span style={{ fontSize: 16, lineHeight: 1 }}>＋</span>
              Novo cliente
            </button>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-3 gap-4">
            {[
              {
                label: "Total de clientes",
                value: stats.total,
                color: "var(--text-primary)",
              },
              {
                label: "Aniversariantes este mês",
                value: stats.aniversariantesMes,
                color: "var(--color-gold)",
              },
              {
                label: "Bloqueados",
                value: stats.bloqueados,
                color: "var(--status-red)",
              },
            ].map((kpi) => (
              <div
                key={kpi.label}
                className="rounded-xl p-4"
                style={{
                  backgroundColor: "var(--bg-card)",
                  border: "1px solid var(--border)",
                }}
              >
                <p
                  className="text-sm"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {kpi.label}
                </p>
                <p
                  className="text-3xl font-bold mt-1"
                  style={{ color: kpi.color }}
                >
                  {kpi.value}
                </p>
              </div>
            ))}
          </div>

          {/* Barra de filtros */}
          <div
            className="rounded-xl p-4 space-y-3"
            style={{
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border)",
            }}
          >
            <div className="flex gap-3">
              <div className="flex-1">
                <Input
                  placeholder="Buscar por nome, telefone, e-mail ou CPF..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                />
              </div>
              <select
                className="livo-input"
                style={{ width: "auto" }}
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
                type="button"
                onClick={applyFilters}
                disabled={isPending}
                className="font-medium px-5 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50"
                style={{
                  backgroundColor: "var(--color-primary)",
                  color: "#ffffff",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "var(--color-primary-hover)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "var(--color-primary)";
                }}
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
                  type="button"
                  key={f.key}
                  onClick={() => {
                    setFiltroAtivo(f.key as typeof filtroAtivo);
                    startTransition(async () => {
                      const result = await getClientsData({
                        search: search || undefined,
                        origem: origem !== "todos" ? origem : undefined,
                        sumidoDias:
                          f.key === "sumidos" ? sumidoDias : undefined,
                        aniversariantesMes: f.key === "aniversariantes",
                        soBloqueados: f.key === "bloqueados",
                      });
                      setClients(result as Client[]);
                    });
                  }}
                  className="text-xs font-medium px-3 py-1.5 rounded-full transition-colors"
                  style={
                    filtroAtivo === f.key
                      ? {
                          backgroundColor: "var(--color-primary)",
                          color: "#ffffff",
                        }
                      : {
                          backgroundColor: "var(--bg-base)",
                          border: "1px solid var(--border)",
                          color: "var(--text-secondary)",
                        }
                  }
                >
                  {f.label}
                </button>
              ))}

              {filtroAtivo === "sumidos" && (
                <div className="flex items-center gap-2 ml-2">
                  <span
                    className="text-xs"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    há mais de
                  </span>
                  <select
                    className="livo-input"
                    style={{ padding: "4px 8px", fontSize: 12, width: "auto" }}
                    value={sumidoDias}
                    onChange={(e) => {
                      const dias = Number(e.target.value);
                      setSumidoDias(dias);
                      startTransition(async () => {
                        const result = await getClientsData({
                          sumidoDias: dias,
                        });
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
          <div
            className="rounded-xl overflow-hidden"
            style={{
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border)",
            }}
          >
            {clients.length === 0 ? (
              <div
                className="p-12 text-center"
                style={{ color: "var(--text-tertiary)" }}
              >
                <p className="text-4xl mb-3">👤</p>
                <p className="font-medium">Nenhum cliente encontrado</p>
                <p className="text-sm mt-1">
                  Tente outros filtros ou{" "}
                  <button
                    type="button"
                    onClick={openModal}
                    style={{ color: "var(--color-primary)" }}
                  >
                    cadastre o primeiro cliente
                  </button>
                  .
                </p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {[
                      "Cliente",
                      "Contato",
                      "Origem",
                      "Visitas",
                      "Última visita",
                      "",
                    ].map((h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {clients.map((client) => {
                    const diasSumido = daysSince(client.lastVisitAt);
                    const isSelected = selectedClient?.id === client.id;
                    return (
                      <tr
                        key={client.id}
                        className="transition-colors cursor-pointer"
                        style={{
                          borderBottom: "1px solid var(--border)",
                          backgroundColor: isSelected
                            ? "var(--bg-card-elevated)"
                            : "transparent",
                        }}
                        onClick={() =>
                          setSelectedClient(isSelected ? null : client)
                        }
                        onMouseEnter={(e) => {
                          if (!isSelected)
                            e.currentTarget.style.backgroundColor =
                              "var(--bg-card-elevated)";
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected)
                            e.currentTarget.style.backgroundColor =
                              "transparent";
                        }}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                              style={{
                                backgroundColor: "var(--color-primary-10)",
                                color: "var(--color-primary)",
                              }}
                            >
                              {client.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p
                                className="font-medium text-sm"
                                style={{
                                  color: client.bloqueado
                                    ? "var(--status-red)"
                                    : "var(--text-primary)",
                                  textDecoration: client.bloqueado
                                    ? "line-through"
                                    : "none",
                                }}
                              >
                                {client.name}
                              </p>
                              {client.birthDate && (
                                <p
                                  className="text-xs"
                                  style={{ color: "var(--color-gold)" }}
                                >
                                  🎂{" "}
                                  {new Date(
                                    client.birthDate,
                                  ).toLocaleDateString("pt-BR", {
                                    day: "2-digit",
                                    month: "long",
                                  })}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p
                            className="text-sm"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {formatPhone(client.phone)}
                          </p>
                          {client.email && (
                            <p
                              className="text-xs"
                              style={{ color: "var(--text-secondary)" }}
                            >
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
                            <span
                              style={{
                                color: "var(--text-tertiary)",
                                fontSize: 12,
                              }}
                            >
                              —
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="text-sm font-medium"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {client.totalVisits}
                          </span>
                          <span
                            className="text-xs ml-1"
                            style={{ color: "var(--text-tertiary)" }}
                          >
                            visitas
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {client.lastVisitAt ? (
                            <div>
                              <p
                                className="text-sm"
                                style={{ color: "var(--text-primary)" }}
                              >
                                {formatDate(client.lastVisitAt)}
                              </p>
                              {diasSumido !== null && diasSumido > 30 && (
                                <p className="text-xs text-amber-400">
                                  há {diasSumido} dias
                                </p>
                              )}
                            </div>
                          ) : (
                            <span
                              className="text-xs"
                              style={{ color: "var(--text-tertiary)" }}
                            >
                              Nunca
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {client.bloqueado && (
                            <span
                              className="text-xs px-2 py-1 rounded-full"
                              style={{
                                color: "var(--status-red)",
                                backgroundColor: "rgba(200,16,46,0.1)",
                              }}
                            >
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

          <p
            className="text-xs text-center"
            style={{ color: "var(--text-tertiary)" }}
          >
            {clients.length} cliente{clients.length !== 1 ? "s" : ""} exibido
            {clients.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Painel lateral */}
        {selectedClient && (
          <div className="w-80 shrink-0">
            <div
              className="rounded-xl p-5 sticky top-6 space-y-4"
              style={{
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--border)",
              }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3
                    className="font-semibold text-lg"
                    style={{
                      color: selectedClient.bloqueado
                        ? "var(--status-red)"
                        : "var(--text-primary)",
                    }}
                  >
                    {selectedClient.name}
                  </h3>
                  {selectedClient.bloqueado && (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        color: "var(--status-red)",
                        backgroundColor: "rgba(200,16,46,0.1)",
                      }}
                    >
                      Bloqueado
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedClient(null)}
                  className="transition-colors"
                  style={{ color: "var(--text-tertiary)" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "var(--text-primary)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "var(--text-tertiary)";
                  }}
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-sm">
                <div>
                  <p
                    className="text-xs uppercase tracking-wider mb-1"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    Contato
                  </p>
                  <p style={{ color: "var(--text-primary)" }}>
                    {formatPhone(selectedClient.phone)}
                  </p>
                  {selectedClient.email && (
                    <p style={{ color: "var(--text-secondary)" }}>
                      {selectedClient.email}
                    </p>
                  )}
                </div>

                {selectedClient.cpf && (
                  <div>
                    <p
                      className="text-xs uppercase tracking-wider mb-1"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      CPF
                    </p>
                    <p
                      className="font-mono"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {selectedClient.cpf.replace(
                        /(\d{3})(\d{3})(\d{3})(\d{2})/,
                        "$1.$2.$3-$4",
                      )}
                    </p>
                  </div>
                )}

                {selectedClient.birthDate && (
                  <div>
                    <p
                      className="text-xs uppercase tracking-wider mb-1"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      Nascimento
                    </p>
                    <p style={{ color: "var(--text-primary)" }}>
                      {formatDate(selectedClient.birthDate)} 🎂
                    </p>
                  </div>
                )}

                {selectedClient.origem && (
                  <div>
                    <p
                      className="text-xs uppercase tracking-wider mb-1"
                      style={{ color: "var(--text-tertiary)" }}
                    >
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

                <div
                  className="grid grid-cols-2 gap-3 pt-2"
                  style={{ borderTop: "1px solid var(--border)" }}
                >
                  <div
                    className="rounded-lg p-3 text-center"
                    style={{ backgroundColor: "var(--bg-base)" }}
                  >
                    <p
                      className="text-2xl font-bold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {selectedClient.totalVisits}
                    </p>
                    <p
                      className="text-xs"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      Visitas
                    </p>
                  </div>
                  <div
                    className="rounded-lg p-3 text-center"
                    style={{ backgroundColor: "var(--bg-base)" }}
                  >
                    <p
                      className="text-sm font-bold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {formatDate(selectedClient.lastVisitAt)}
                    </p>
                    <p
                      className="text-xs"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      Última visita
                    </p>
                  </div>
                </div>

                <div>
                  <p
                    className="text-xs uppercase tracking-wider mb-1"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    Cliente desde
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {formatDate(selectedClient.createdAt)}
                  </p>
                </div>
              </div>

              <div
                className="pt-2 space-y-2"
                style={{ borderTop: "1px solid var(--border)" }}
              >
                <button
                  type="button"
                  onClick={() => openEditModal(selectedClient)}
                  className="w-full flex items-center justify-center gap-2 text-sm font-medium py-2.5 rounded-lg transition-colors"
                  style={{
                    backgroundColor: "var(--bg-card-elevated)",
                    border: "1px solid var(--border)",
                    color: "var(--text-primary)",
                  }}
                >
                  <Pencil size={14} />
                  Editar dados
                </button>
                <a
                  href={`https://wa.me/55${selectedClient.phone.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full bg-green-600 hover:bg-green-500 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
                >
                  💬 WhatsApp
                </a>
                <button
                  type="button"
                  onClick={() => handleToggleBlock(selectedClient)}
                  className="w-full text-sm font-medium py-2.5 rounded-lg transition-colors"
                  style={
                    selectedClient.bloqueado
                      ? {
                          backgroundColor: "var(--bg-card-elevated)",
                          color: "var(--text-secondary)",
                        }
                      : {
                          backgroundColor: "rgba(200,16,46,0.1)",
                          color: "var(--status-red)",
                          border: "1px solid rgba(200,16,46,0.3)",
                        }
                  }
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
    </>
  );
}
