"use client";

import {
  Pencil,
  Plus,
  Scissors,
  ToggleLeft,
  ToggleRight,
  X,
} from "lucide-react";
import { useState, useTransition } from "react";
import type {
  ProfessionalWithDetails,
  ToggleProfessionalResult,
} from "./actions";
import {
  createProfessional,
  getProfessionalsData,
  toggleProfessionalActive,
  updateProfessional,
} from "./actions";

// ─── Estilos compartilhados ───────────────────────────────────────────────────

const modalStyle: React.CSSProperties = {
  backgroundColor: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: 16,
  padding: 24,
  width: "100%",
  boxShadow: "var(--shadow-modal)",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: 8,
  border: "1px solid var(--border)",
  backgroundColor: "var(--bg-base)",
  padding: "10px 16px",
  color: "var(--text-primary)",
  fontSize: 14,
  outline: "none",
};

// ─── Avatar ───────────────────────────────────────────────────────────────────

function ProfessionalAvatar({
  name,
  image,
}: {
  name: string;
  image: string | null;
}) {
  if (image) {
    return (
      // biome-ignore lint/performance/noImgElement: user avatar from OAuth provider
      <img
        src={image}
        alt={name}
        className="rounded-full object-cover"
        style={{ width: 36, height: 36 }}
      />
    );
  }
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full text-sm font-bold"
      style={{
        width: 36,
        height: 36,
        backgroundColor: "var(--bg-card-elevated)",
        color: "var(--text-secondary)",
      }}
    >
      {initials}
    </div>
  );
}

// ─── Modal criar / editar ─────────────────────────────────────────────────────

function ProfessionalModal({
  professional,
  onClose,
  onSaved,
}: {
  professional?: ProfessionalWithDetails;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [name, setName] = useState(professional?.name ?? "");
  const [bio, setBio] = useState(professional?.bio ?? "");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function handleSubmit() {
    if (!name.trim()) {
      setError("Nome é obrigatório.");
      return;
    }
    startTransition(async () => {
      const result = professional
        ? await updateProfessional(professional.id, { name, bio })
        : await createProfessional({ name, bio });
      if (result.success) {
        onSaved(result.message);
        onClose();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        backgroundColor: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(4px)",
      }}
    >
      <div style={{ ...modalStyle, maxWidth: 448 }}>
        <div className="mb-5 flex items-center justify-between">
          <h2
            className="text-lg font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            {professional ? "Editar Profissional" : "Novo Profissional"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{ color: "var(--text-tertiary)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--text-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--text-tertiary)";
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="prof-name"
              className="mb-1.5 block text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              Nome *
            </label>
            <input
              id="prof-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: João Silva"
              style={inputStyle}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          </div>

          <div>
            <label
              htmlFor="prof-bio"
              className="mb-1.5 block text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              Bio
            </label>
            <textarea
              id="prof-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Especialidades, anos de experiência..."
              rows={3}
              style={{ ...inputStyle, resize: "vertical" }}
            />
            <p
              className="mt-1 text-right text-xs"
              style={{ color: "var(--text-tertiary)" }}
            >
              {bio.length}/500
            </p>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg py-2.5 text-sm transition-colors"
            style={{
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={pending}
            className="flex-1 rounded-lg py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-50"
            style={{ backgroundColor: "var(--color-primary)" }}
          >
            {pending ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal de confirmação de desativação ──────────────────────────────────────

function ConfirmDeactivateModal({
  futureCount,
  onClose,
  onConfirmed,
}: {
  futureCount: number;
  onClose: () => void;
  onConfirmed: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        backgroundColor: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(4px)",
      }}
    >
      <div style={{ ...modalStyle, maxWidth: 448 }}>
        <div className="mb-4 flex items-center justify-between">
          <h2
            className="text-lg font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            Desativar profissional?
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{ color: "var(--text-tertiary)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--text-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--text-tertiary)";
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div
          className="mb-5 rounded-lg px-4 py-3"
          style={{
            backgroundColor: "rgba(234,179,8,0.08)",
            border: "1px solid rgba(234,179,8,0.25)",
          }}
        >
          <p className="text-sm text-yellow-400">
            Este profissional possui{" "}
            <strong>
              {futureCount} agendamento{futureCount !== 1 ? "s" : ""} futuro
              {futureCount !== 1 ? "s" : ""}
            </strong>{" "}
            ativo{futureCount !== 1 ? "s" : ""}. Ao desativar, ele não aparecerá
            para novos agendamentos. Os agendamentos existentes não serão
            cancelados automaticamente.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg py-2.5 text-sm transition-colors"
            style={{
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirmed}
            className="flex-1 rounded-lg py-2.5 text-sm font-semibold text-white transition-colors"
            style={{ backgroundColor: "var(--status-red)" }}
          >
            Desativar mesmo assim
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

interface Props {
  initialData: ProfessionalWithDetails[];
}

export function ProfissionaisClient({ initialData }: Props) {
  const [data, setData] = useState<ProfessionalWithDetails[]>(initialData);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);
  const [, startTransition] = useTransition();
  const [showModal, setShowModal] = useState(false);
  const [editingProfessional, setEditingProfessional] = useState<
    ProfessionalWithDetails | undefined
  >(undefined);
  const [confirmToggleId, setConfirmToggleId] = useState<string | null>(null);
  const [confirmFutureCount, setConfirmFutureCount] = useState(0);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  function showToast(type: "success" | "error", msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  }

  async function refreshData() {
    const fresh = await getProfessionalsData();
    setData(fresh);
  }

  async function handleToggle(prof: ProfessionalWithDetails) {
    setTogglingId(prof.id);
    startTransition(async () => {
      const result: ToggleProfessionalResult = await toggleProfessionalActive(
        prof.id,
      );

      if ("requiresConfirm" in result) {
        setConfirmToggleId(prof.id);
        setConfirmFutureCount(result.futureAppointments);
        setTogglingId(null);
        return;
      }

      if (result.success) {
        showToast("success", result.message);
        await refreshData();
      } else if ("error" in result) {
        showToast("error", result.error);
      }
      setTogglingId(null);
    });
  }

  async function handleConfirmDeactivate() {
    if (!confirmToggleId) return;
    const id = confirmToggleId;
    setConfirmToggleId(null);
    setTogglingId(id);
    startTransition(async () => {
      const result = await toggleProfessionalActive(id, true);
      if (result.success) {
        showToast("success", result.message);
        await refreshData();
      } else {
        showToast(
          "error",
          "error" in result ? result.error : "Erro ao desativar.",
        );
      }
      setTogglingId(null);
    });
  }

  function openCreate() {
    setEditingProfessional(undefined);
    setShowModal(true);
  }

  function openEdit(prof: ProfessionalWithDetails) {
    setEditingProfessional(prof);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingProfessional(undefined);
  }

  const activeCount = data.filter((p) => p.isActive).length;

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div
          className={`fixed right-6 top-6 z-50 rounded-lg border px-5 py-3 text-sm font-medium shadow-xl transition-all ${
            toast.type === "success"
              ? "border-green-500/40 text-green-400"
              : "border-red-500/40 text-red-400"
          }`}
          style={{ backgroundColor: "var(--bg-card)" }}
        >
          {toast.type === "success" ? "✓ " : "✕ "}
          {toast.msg}
        </div>
      )}

      {/* Barra de ações */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
          {activeCount} profissional{activeCount !== 1 ? "is" : ""} ativo
          {activeCount !== 1 ? "s" : ""}
        </p>
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-colors"
          style={{ backgroundColor: "var(--color-primary)" }}
        >
          <Plus size={16} /> Novo Profissional
        </button>
      </div>

      {/* Lista */}
      {data.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center rounded-2xl py-20 text-center"
          style={{ border: "2px dashed var(--border)" }}
        >
          <Scissors
            size={40}
            className="mb-4"
            style={{ color: "var(--text-tertiary)" }}
          />
          <p className="mb-1" style={{ color: "var(--text-secondary)" }}>
            Nenhum profissional cadastrado ainda.
          </p>
          <button
            type="button"
            onClick={openCreate}
            className="mt-3 text-sm hover:underline"
            style={{ color: "var(--color-primary)" }}
          >
            + Adicionar primeiro profissional
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {data.map((prof) => {
            const linkedUser = prof.membership?.user ?? null;
            const avatarName = linkedUser?.name ?? prof.name;
            const avatarImage = linkedUser?.image ?? null;
            const isToggling = togglingId === prof.id;

            return (
              <div
                key={prof.id}
                className="flex items-center gap-4 rounded-xl px-5 py-4 transition-all"
                style={{
                  border: "1px solid var(--border)",
                  backgroundColor: "var(--bg-card)",
                  opacity: prof.isActive ? 1 : 0.6,
                }}
              >
                {/* Avatar */}
                <ProfessionalAvatar name={avatarName} image={avatarImage} />

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p
                      className="truncate font-semibold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {prof.name}
                    </p>
                    <span
                      className="shrink-0 rounded px-1.5 py-0.5 text-xs font-medium"
                      style={
                        prof.isActive
                          ? {
                              backgroundColor: "rgba(34,197,94,0.1)",
                              color: "var(--status-green)",
                              border: "1px solid rgba(34,197,94,0.2)",
                            }
                          : {
                              backgroundColor: "var(--bg-card-elevated)",
                              color: "var(--text-tertiary)",
                              border: "1px solid var(--border)",
                            }
                      }
                    >
                      {prof.isActive ? "Ativo" : "Inativo"}
                    </span>
                  </div>

                  {prof.bio && (
                    <p
                      className="mt-0.5 truncate text-xs"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {prof.bio}
                    </p>
                  )}

                  <div className="mt-1 flex items-center gap-3">
                    {linkedUser ? (
                      <span
                        className="text-xs"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        {linkedUser.name ?? linkedUser.email}
                      </span>
                    ) : (
                      <span
                        className="text-xs"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        Sem vínculo de acesso
                      </span>
                    )}
                    <span
                      className="text-xs"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      ·
                    </span>
                    <span
                      className="text-xs"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      {prof._count.appointments} atendimento
                      {prof._count.appointments !== 1 ? "s" : ""}
                    </span>
                    <span
                      className="text-xs"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      ·
                    </span>
                    <span
                      className="text-xs"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      {prof._count.comandas} comanda
                      {prof._count.comandas !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>

                {/* Ações */}
                <div className="flex shrink-0 items-center gap-2">
                  {/* Toggle ativo/inativo */}
                  <button
                    type="button"
                    onClick={() => handleToggle(prof)}
                    disabled={isToggling}
                    className="transition-opacity disabled:opacity-40"
                    title={prof.isActive ? "Desativar" : "Reativar"}
                    style={{
                      color: prof.isActive
                        ? "var(--status-green)"
                        : "var(--text-tertiary)",
                    }}
                  >
                    {prof.isActive ? (
                      <ToggleRight size={28} />
                    ) : (
                      <ToggleLeft size={28} />
                    )}
                  </button>

                  {/* Editar */}
                  <button
                    type="button"
                    onClick={() => openEdit(prof)}
                    className="rounded-lg p-1.5 transition-all"
                    style={{
                      border: "1px solid var(--border)",
                      color: "var(--text-secondary)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor =
                        "var(--color-primary)";
                      e.currentTarget.style.color = "var(--text-primary)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "var(--border)";
                      e.currentTarget.style.color = "var(--text-secondary)";
                    }}
                    title="Editar"
                  >
                    <Pencil size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal criar / editar */}
      {showModal && (
        <ProfessionalModal
          professional={editingProfessional}
          onClose={closeModal}
          onSaved={(message) => {
            showToast("success", message);
            startTransition(async () => {
              await refreshData();
            });
          }}
        />
      )}

      {/* Modal confirmação de desativação */}
      {confirmToggleId && (
        <ConfirmDeactivateModal
          futureCount={confirmFutureCount}
          onClose={() => setConfirmToggleId(null)}
          onConfirmed={handleConfirmDeactivate}
        />
      )}
    </div>
  );
}
