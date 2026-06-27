"use client";

import {
  AlertTriangle,
  Camera,
  Check,
  Mail,
  Pencil,
  Plus,
  Scissors,
  ToggleLeft,
  ToggleRight,
  Trash2,
  X,
} from "lucide-react";
import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { createInvitationAction } from "../settings/acessos/actions";
import type {
  AvatarUploadResult,
  ProfessionalWithDetails,
  ToggleProfessionalResult,
} from "./actions";
import {
  createProfessional,
  deleteProfessional,
  getProfessionalsData,
  removeProfessionalAvatar,
  toggleProfessionalActive,
  updateProfessional,
  uploadProfessionalAvatar,
} from "./actions";

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
      <Image
        src={image}
        alt={name}
        width={36}
        height={36}
        className="rounded-full object-cover"
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
  onAvatarChange,
}: {
  professional?: ProfessionalWithDetails;
  onClose: () => void;
  onSaved: (message: string) => void;
  onAvatarChange?: (message: string) => void;
}) {
  const [name, setName] = useState(professional?.name ?? "");
  const [bio, setBio] = useState(professional?.bio ?? "");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  // ── Avatar upload state ──────────────────────────────────────────────────────
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(
    professional?.avatarUrl ?? null,
  );
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [avatarHovered, setAvatarHovered] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const displayAvatarSrc = localPreview ?? currentAvatarUrl;
  const avatarInitials = (professional?.name ?? name)
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  async function handleAvatarFileChange(
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = e.target.files?.[0];
    if (!file || !professional) return;
    e.target.value = "";

    const objectUrl = URL.createObjectURL(file);
    setLocalPreview(objectUrl);
    setAvatarError("");
    setUploadingAvatar(true);

    const fd = new FormData();
    fd.append("avatar", file);

    try {
      const result: AvatarUploadResult = await uploadProfessionalAvatar(
        professional.id,
        fd,
      );
      URL.revokeObjectURL(objectUrl);
      setLocalPreview(null);
      setUploadingAvatar(false);
      if (result.success) {
        setCurrentAvatarUrl(result.avatarUrl);
        onAvatarChange?.(result.message);
      } else {
        setAvatarError(result.error);
      }
    } catch {
      URL.revokeObjectURL(objectUrl);
      setLocalPreview(null);
      setUploadingAvatar(false);
      setAvatarError("Erro ao enviar a imagem. Tente novamente.");
    }
  }

  async function handleRemoveAvatar() {
    if (!professional) return;
    setUploadingAvatar(true);
    setAvatarError("");

    const result = await removeProfessionalAvatar(professional.id);
    setUploadingAvatar(false);

    if (result.success) {
      setCurrentAvatarUrl(null);
      onAvatarChange?.(result.message);
    } else {
      setAvatarError(result.error);
    }
  }

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
    <Modal
      open={true}
      onClose={onClose}
      title={professional ? "Editar Profissional" : "Novo Profissional"}
      size="sm"
      footer={{
        confirm: {
          label: "Salvar",
          loadingLabel: "Salvando...",
          onClick: handleSubmit,
          loading: pending,
        },
      }}
    >
      <div className="space-y-4">
        {/* Avatar upload — somente no modo edição */}
        {professional && (
          <div className="flex flex-col items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={handleAvatarFileChange}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              onMouseEnter={() => setAvatarHovered(true)}
              onMouseLeave={() => setAvatarHovered(false)}
              className="relative overflow-hidden rounded-full disabled:cursor-not-allowed"
              style={{ width: 80, height: 80, flexShrink: 0 }}
              title="Clique para alterar a foto"
            >
              {displayAvatarSrc ? (
                <img
                  src={displayAvatarSrc}
                  alt={professional.name}
                  style={{ width: 80, height: 80, objectFit: "cover" }}
                />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center rounded-full text-2xl font-bold"
                  style={{
                    backgroundColor: "var(--bg-card-elevated)",
                    color: "var(--text-secondary)",
                  }}
                >
                  {avatarInitials}
                </div>
              )}
              <div
                className="absolute inset-0 flex items-center justify-center rounded-full transition-opacity"
                style={{
                  backgroundColor: "rgba(0,0,0,0.55)",
                  opacity: avatarHovered || uploadingAvatar ? 1 : 0,
                }}
              >
                {uploadingAvatar ? (
                  <div
                    className="animate-spin rounded-full"
                    style={{
                      width: 22,
                      height: 22,
                      border: "2px solid rgba(255,255,255,0.2)",
                      borderTopColor: "#fff",
                    }}
                  />
                ) : (
                  <Camera size={20} className="text-white" />
                )}
              </div>
            </button>
            <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
              JPG, PNG ou WebP · max 5 MB
            </p>
            {currentAvatarUrl && (
              <button
                type="button"
                onClick={handleRemoveAvatar}
                disabled={uploadingAvatar}
                className="text-xs transition-opacity hover:opacity-70 disabled:opacity-40"
                style={{ color: "var(--status-red)" }}
              >
                Remover foto
              </button>
            )}
            {avatarError && (
              <p className="text-center text-xs text-red-400">{avatarError}</p>
            )}
          </div>
        )}

        <Input
          id="prof-name"
          label="Nome"
          required
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: João Silva"
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        />

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
            className="livo-input"
            style={{ resize: "vertical" }}
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
    </Modal>
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
    <Modal
      open={true}
      onClose={onClose}
      title="Desativar profissional?"
      size="sm"
      footer={{
        confirm: {
          label: "Desativar mesmo assim",
          onClick: onConfirmed,
          variant: "danger",
        },
      }}
    >
      <div
        className="rounded-lg px-4 py-3"
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
    </Modal>
  );
}

// ─── Modal de confirmação de exclusão ────────────────────────────────────────

function ConfirmDeleteModal({
  professionalName,
  onClose,
  onConfirmed,
}: {
  professionalName: string;
  onClose: () => void;
  onConfirmed: () => void;
}) {
  return (
    <Modal
      open={true}
      onClose={onClose}
      title="Excluir profissional?"
      size="sm"
      footer={{
        confirm: {
          label: "Excluir permanentemente",
          onClick: onConfirmed,
          variant: "danger",
        },
      }}
    >
      <div
        className="rounded-lg px-4 py-3"
        style={{
          backgroundColor: "rgba(239,68,68,0.08)",
          border: "1px solid rgba(239,68,68,0.25)",
        }}
      >
        <p className="text-sm" style={{ color: "var(--status-red)" }}>
          <strong>{professionalName}</strong> será removido permanentemente.
          Esta ação é irreversível. Se o profissional possuir histórico de
          atendimentos ou comandas, a exclusão será bloqueada automaticamente.
        </p>
      </div>
    </Modal>
  );
}

// ─── Modal de convite por email ───────────────────────────────────────────────

function InviteModal({
  professional,
  onClose,
  onSaved,
}: {
  professional: { id: string; name: string };
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function handleSubmit() {
    if (!email.trim() || !email.includes("@")) {
      setError("E-mail inválido.");
      return;
    }
    startTransition(async () => {
      const result = await createInvitationAction({
        email: email.trim(),
        role: "barber",
        professionalId: professional.id,
      });
      if (result.success) {
        onSaved(result.message);
        onClose();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <Modal
      open={true}
      onClose={onClose}
      title="Convidar por e-mail"
      description={professional.name}
      size="sm"
      footer={{
        confirm: {
          label: "Enviar convite",
          loadingLabel: "Enviando...",
          onClick: handleSubmit,
          loading: pending,
        },
      }}
    >
      <div className="space-y-4">
        <Input
          id="invite-email"
          label="E-mail"
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@exemplo.com"
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        />

        <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
          A comissão deste profissional é configurada no painel de
          Profissionais ou Comissões, independente do convite.
        </p>

        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
    </Modal>
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
  const [showConfirmDeleteId, setShowConfirmDeleteId] = useState<string | null>(
    null,
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showInviteForId, setShowInviteForId] = useState<string | null>(null);

  const invitingProfessional = showInviteForId
    ? (data.find((p) => p.id === showInviteForId) ?? null)
    : null;

  const confirmDeleteProfessional = showConfirmDeleteId
    ? (data.find((p) => p.id === showConfirmDeleteId) ?? null)
    : null;

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

  async function handleDelete(id: string) {
    setDeletingId(id);
    setShowConfirmDeleteId(null);
    startTransition(async () => {
      const result = await deleteProfessional(id);
      if (result.success) {
        showToast("success", result.message);
        await refreshData();
      } else {
        showToast("error", result.error);
      }
      setDeletingId(null);
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
          {toast.type === "success" ? <Check size={14} className="inline mr-1" /> : <X size={14} className="inline mr-1" />}
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
        <div className="rounded-2xl" style={{ border: "2px dashed var(--border)" }}>
          <EmptyState
            icon={<Scissors size={24} />}
            title="Nenhum profissional cadastrado ainda."
            action={{ label: "+ Adicionar primeiro profissional", onClick: openCreate }}
          />
        </div>
      ) : (
        <div className="space-y-2">
          {data.map((prof) => {
            const linkedUser = prof.membership?.user ?? null;
            const avatarName = linkedUser?.name ?? prof.name;
            const avatarImage = prof.avatarUrl ?? linkedUser?.image ?? null;
            const isToggling = togglingId === prof.id;
            const isDeleting = deletingId === prof.id;
            const isLinked = prof.membership !== null;
            const semComissao =
              !prof.commissionOnServices && !prof.commissionOnProducts;

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
                    {semComissao && (
                      <span
                        title="Configure o percentual de comissão para que os atendimentos deste profissional gerem comissão"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          padding: "2px 8px",
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 600,
                          backgroundColor: "var(--status-yellow)",
                          color: "#000",
                        }}
                      >
                        <AlertTriangle size={11} />
                        Sem comissão configurada
                      </span>
                    )}
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
                    disabled={isToggling || isDeleting}
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

                  {/* Convidar por email — só se sem vínculo */}
                  {!isLinked && (
                    <button
                      type="button"
                      onClick={() => setShowInviteForId(prof.id)}
                      className="rounded-lg p-1.5 transition-all"
                      style={{
                        border: "1px solid var(--border)",
                        color: "var(--text-secondary)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor =
                          "var(--color-primary)";
                        e.currentTarget.style.color = "var(--color-primary)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "var(--border)";
                        e.currentTarget.style.color = "var(--text-secondary)";
                      }}
                      title="Convidar por e-mail"
                    >
                      <Mail size={14} />
                    </button>
                  )}

                  {/* Editar */}
                  <button
                    type="button"
                    onClick={() => openEdit(prof)}
                    disabled={isDeleting}
                    className="rounded-lg p-1.5 transition-all disabled:opacity-40"
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

                  {/* Excluir */}
                  <button
                    type="button"
                    onClick={() => setShowConfirmDeleteId(prof.id)}
                    disabled={isDeleting || isToggling}
                    className="rounded-lg p-1.5 transition-all disabled:opacity-40"
                    style={{
                      border: "1px solid var(--border)",
                      color: "var(--text-tertiary)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "rgba(239,68,68,0.4)";
                      e.currentTarget.style.color = "var(--status-red)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "var(--border)";
                      e.currentTarget.style.color = "var(--text-tertiary)";
                    }}
                    title="Excluir"
                  >
                    {isDeleting ? (
                      <span className="text-xs">...</span>
                    ) : (
                      <Trash2 size={14} />
                    )}
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
          onAvatarChange={(message) => {
            showToast("success", message);
            startTransition(async () => {
              await refreshData();
            });
          }}
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

      {/* Modal confirmação de exclusão */}
      {confirmDeleteProfessional && (
        <ConfirmDeleteModal
          professionalName={confirmDeleteProfessional.name}
          onClose={() => setShowConfirmDeleteId(null)}
          onConfirmed={() => handleDelete(confirmDeleteProfessional.id)}
        />
      )}

      {/* Modal de convite por email */}
      {invitingProfessional && (
        <InviteModal
          professional={{
            id: invitingProfessional.id,
            name: invitingProfessional.name,
          }}
          onClose={() => setShowInviteForId(null)}
          onSaved={(message) => {
            showToast("success", message);
            setShowInviteForId(null);
          }}
        />
      )}
    </div>
  );
}
