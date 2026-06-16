"use client";

import { useState, useTransition } from "react";
import { Check, X } from "lucide-react";
import {
  createInvitationAction,
  getAcessosData,
  resendInvitationAction,
  revokeInvitationAction,
  revokeMembershipAction,
  type CreateInvitationInput,
} from "./actions";

// ─── Tipos locais ──────────────────────────────────────────────────────────────

type Member = {
  id: string;
  role: string;
  isActive: boolean;
  commissionOnServices: boolean;
  commissionOnProducts: boolean;
  createdAt: Date;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
  professional: { id: string; name: string } | null;
};

type PendingInvitation = {
  id: string;
  email: string;
  role: string;
  expiresAt: Date;
  createdAt: Date;
};

type Professional = { id: string; name: string };

type InitialData = {
  members: Member[];
  pendingInvitations: PendingInvitation[];
  professionals: Professional[];
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  owner: "Dono",
  reception: "Recepção",
  barber: "Barbeiro",
};

const ROLE_COLORS: Record<string, string> = {
  owner: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  reception: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  barber: "text-green-400 bg-green-400/10 border-green-400/20",
};

function RoleBadge({ role }: { role: string }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${ROLE_COLORS[role] ?? "text-gray-400 bg-gray-400/10 border-gray-400/20"}`}
    >
      {ROLE_LABELS[role] ?? role}
    </span>
  );
}

function Avatar({
  name,
  image,
}: {
  name: string | null;
  image: string | null;
}) {
  if (image) {
    return (
      <img
        src={image}
        alt={name ?? ""}
        className="w-9 h-9 rounded-full object-cover"
      />
    );
  }
  const initials = (name ?? "?")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <div className="w-9 h-9 rounded-full bg-[#2A2A33] flex items-center justify-center text-sm font-bold text-white">
      {initials}
    </div>
  );
}

// ─── Componente principal ──────────────────────────────────────────────────────

export default function AcessosClient({
  initialData,
}: {
  initialData: InitialData;
}) {
  const [data, setData] = useState(initialData);
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Form state
  const [formEmail, setFormEmail] = useState("");
  const [formRole, setFormRole] = useState<"reception" | "barber">("reception");
  const [formProfessionalId, setFormProfessionalId] = useState("");
  const [formCommissionServices, setFormCommissionServices] = useState(true);
  const [formCommissionProducts, setFormCommissionProducts] = useState(false);

  function showToast(type: "success" | "error", msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  }

  async function refreshData() {
    const fresh = await getAcessosData();
    setData(fresh);
  }

  function resetForm() {
    setFormEmail("");
    setFormRole("reception");
    setFormProfessionalId("");
    setFormCommissionServices(true);
    setFormCommissionProducts(false);
    setShowForm(false);
  }

  async function handleSendInvite() {
    const input: CreateInvitationInput = {
      email: formEmail,
      role: formRole,
      professionalId: formRole === "barber" ? formProfessionalId : undefined,
      commissionOnServices: formCommissionServices,
      commissionOnProducts: formCommissionProducts,
    };

    startTransition(async () => {
      const result = await createInvitationAction(input);
      if (result.success) {
        showToast("success", result.message);
        resetForm();
        await refreshData();
      } else {
        showToast("error", result.error);
      }
    });
  }

  async function handleRevoke(membershipId: string) {
    if (
      !confirm(
        "Tem certeza? O acesso desta pessoa será removido imediatamente.",
      )
    )
      return;
    startTransition(async () => {
      const result = await revokeMembershipAction(membershipId);
      if (result.success) {
        showToast("success", result.message);
        await refreshData();
      } else {
        showToast("error", result.error);
      }
    });
  }

  async function handleRevokeInvite(invitationId: string) {
    if (!confirm("Revogar este convite? O link deixará de funcionar.")) return;
    startTransition(async () => {
      const result = await revokeInvitationAction(invitationId);
      if (result.success) {
        showToast("success", result.message);
        await refreshData();
      } else {
        showToast("error", result.error);
      }
    });
  }

  async function handleResend(invitationId: string) {
    startTransition(async () => {
      const result = await resendInvitationAction(invitationId);
      if (result.success) {
        showToast("success", result.message);
        await refreshData();
      } else {
        showToast("error", result.error);
      }
    });
  }

  const totalSeats = 3; // PRO plan
  const usedSeats = data.members.filter((m) => m.isActive !== false).length;

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-lg shadow-xl text-sm font-medium border transition-all ${
            toast.type === "success"
              ? "bg-[#17171C] border-green-500/40 text-green-400"
              : "bg-[#17171C] border-red-500/40 text-red-400"
          }`}
        >
          {toast.type === "success" ? <Check size={14} className="inline mr-1" /> : <X size={14} className="inline mr-1" />}
          {toast.msg}
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <a
                href="/dashboard/settings"
                className="text-[#6E6E78] text-sm hover:text-white transition-colors"
              >
                Configurações
              </a>
              <span className="text-[#2A2A33]">/</span>
              <span className="text-sm text-white">Acessos</span>
            </div>
            <h1 className="text-2xl font-bold text-white">Acessos</h1>
            <p className="text-[#9A9AA6] text-sm mt-1">
              Gerencie quem tem acesso à sua barbearia no LIVO.
            </p>
          </div>

          {/* Contador de assentos */}
          <div className="shrink-0 bg-[#17171C] border border-[#2A2A33] rounded-lg px-4 py-3 text-center">
            <div className="text-2xl font-bold text-white">
              {usedSeats}
              <span className="text-[#6E6E78] font-normal">/{totalSeats}</span>
            </div>
            <div className="text-[#9A9AA6] text-xs mt-0.5">acessos usados</div>
          </div>
        </div>

        {/* ── Membros ativos ─────────────────────────────────────────────────── */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-[#9A9AA6] uppercase tracking-widest mb-3">
            Membros ativos
          </h2>
          <div className="rounded-xl border border-[#2A2A33] overflow-hidden bg-[#17171C] divide-y divide-[#2A2A33]">
            {data.members.length === 0 && (
              <div className="px-5 py-8 text-center text-[#6E6E78] text-sm">
                Nenhum membro ainda.
              </div>
            )}
            {data.members.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-4 px-5 py-4"
              >
                <Avatar name={member.user.name} image={member.user.image} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-white truncate">
                      {member.user.name ?? "Sem nome"}
                    </span>
                    <RoleBadge role={member.role} />
                  </div>
                  <div className="text-xs text-[#6E6E78] mt-0.5">
                    {member.user.email}
                    {member.professional && (
                      <span className="ml-2 text-[#9A9AA6]">
                        · {member.professional.name}
                      </span>
                    )}
                  </div>
                  {/* Comissões */}
                  {member.role !== "owner" && (
                    <div className="flex gap-2 mt-1.5">
                      <CommissionTag
                        active={member.commissionOnServices}
                        label="Serviços"
                      />
                      <CommissionTag
                        active={member.commissionOnProducts}
                        label="Produtos"
                      />
                    </div>
                  )}
                </div>
                {/* Revogar (apenas não-dono) */}
                {member.role !== "owner" && (
                  <button
                    onClick={() => handleRevoke(member.id)}
                    disabled={isPending}
                    className="shrink-0 text-xs text-[#6E6E78] hover:text-red-400 transition-colors disabled:opacity-40 border border-[#2A2A33] hover:border-red-400/30 rounded px-3 py-1.5"
                  >
                    Revogar
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── Convites pendentes ─────────────────────────────────────────────── */}
        {data.pendingInvitations.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-semibold text-[#9A9AA6] uppercase tracking-widest mb-3">
              Convites pendentes
            </h2>
            <div className="rounded-xl border border-[#2A2A33] overflow-hidden bg-[#17171C] divide-y divide-[#2A2A33]">
              {data.pendingInvitations.map((inv) => (
                <div key={inv.id} className="flex items-center gap-4 px-5 py-4">
                  <div className="w-9 h-9 rounded-full bg-[#2A2A33] flex items-center justify-center">
                    <span className="text-[#6E6E78] text-sm">✉</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-white truncate">
                        {inv.email}
                      </span>
                      <RoleBadge role={inv.role} />
                    </div>
                    <div className="text-xs text-[#6E6E78] mt-0.5">
                      Expira em{" "}
                      {new Date(inv.expiresAt).toLocaleDateString("pt-BR")}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleResend(inv.id)}
                      disabled={isPending}
                      className="text-xs text-[#9A9AA6] hover:text-white transition-colors border border-[#2A2A33] rounded px-3 py-1.5 disabled:opacity-40"
                    >
                      Reenviar
                    </button>
                    <button
                      onClick={() => handleRevokeInvite(inv.id)}
                      disabled={isPending}
                      className="text-xs text-[#6E6E78] hover:text-red-400 transition-colors border border-[#2A2A33] hover:border-red-400/30 rounded px-3 py-1.5 disabled:opacity-40"
                    >
                      Revogar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Formulário de novo convite ─────────────────────────────────────── */}
        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            disabled={usedSeats >= totalSeats}
            className="w-full flex items-center justify-center gap-2 border border-dashed border-[#2A2A33] hover:border-[#C8102E]/50 hover:bg-[#C8102E]/5 text-[#9A9AA6] hover:text-white rounded-xl py-4 transition-all text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className="text-lg leading-none">+</span>
            Convidar pessoa
            {usedSeats >= totalSeats && (
              <span className="text-xs text-red-400 ml-1">
                (limite atingido)
              </span>
            )}
          </button>
        ) : (
          <div className="bg-[#17171C] border border-[#2A2A33] rounded-xl p-6">
            <h3 className="text-base font-semibold text-white mb-5">
              Novo convite
            </h3>

            <div className="space-y-4">
              {/* E-mail */}
              <div>
                <label className="block text-xs font-medium text-[#9A9AA6] mb-1.5 uppercase tracking-wide">
                  E-mail
                </label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="nome@email.com"
                  className="w-full bg-[#0B0B0D] border border-[#2A2A33] rounded-lg px-4 py-2.5 text-sm text-white placeholder-[#6E6E78] focus:outline-none focus:border-[#C8102E]/60 transition-colors"
                />
              </div>

              {/* Papel */}
              <div>
                <label className="block text-xs font-medium text-[#9A9AA6] mb-1.5 uppercase tracking-wide">
                  Papel
                </label>
                <div className="flex gap-3">
                  {(["reception", "barber"] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => {
                        setFormRole(r);
                        if (r === "reception") setFormProfessionalId("");
                      }}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                        formRole === r
                          ? "bg-[#C8102E] border-[#C8102E] text-white"
                          : "bg-transparent border-[#2A2A33] text-[#9A9AA6] hover:border-[#9A9AA6]"
                      }`}
                    >
                      {ROLE_LABELS[r]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Profissional (só se barbeiro) */}
              {formRole === "barber" && (
                <div>
                  <label className="block text-xs font-medium text-[#9A9AA6] mb-1.5 uppercase tracking-wide">
                    Qual profissional?
                  </label>
                  {data.professionals.length === 0 ? (
                    <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3">
                      Todos os profissionais já possuem login vinculado ou não
                      há profissionais cadastrados.
                    </p>
                  ) : (
                    <select
                      value={formProfessionalId}
                      onChange={(e) => setFormProfessionalId(e.target.value)}
                      className="w-full bg-[#0B0B0D] border border-[#2A2A33] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#C8102E]/60 transition-colors"
                    >
                      <option value="">Selecione o profissional...</option>
                      {data.professionals.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Comissões */}
              <div>
                <label className="block text-xs font-medium text-[#9A9AA6] mb-2 uppercase tracking-wide">
                  Comissionamento
                </label>
                <div className="space-y-2">
                  <Toggle
                    checked={formCommissionServices}
                    onChange={setFormCommissionServices}
                    label="Comissão em serviços"
                    description="Recebe % sobre serviços que realizar/vender"
                  />
                  <Toggle
                    checked={formCommissionProducts}
                    onChange={setFormCommissionProducts}
                    label="Comissão em produtos"
                    description="Recebe % sobre produtos que vender"
                  />
                </div>
              </div>
            </div>

            {/* Botões */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSendInvite}
                disabled={
                  isPending ||
                  !formEmail ||
                  (formRole === "barber" && !formProfessionalId)
                }
                className="flex-1 bg-[#C8102E] hover:bg-[#E0263D] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
              >
                {isPending ? "Enviando..." : "Enviar convite"}
              </button>
              <button
                onClick={resetForm}
                disabled={isPending}
                className="px-5 py-2.5 rounded-lg text-sm text-[#9A9AA6] hover:text-white border border-[#2A2A33] hover:border-[#9A9AA6] transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-componentes ───────────────────────────────────────────────────────────

function CommissionTag({ active, label }: { active: boolean; label: string }) {
  if (!active) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-[#C8A24C] bg-[#C8A24C]/10 border border-[#C8A24C]/20 rounded px-1.5 py-0.5">
      <Check size={10} className="inline" /> {label}
    </span>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description: string;
}) {
  return (
    <div
      className="flex items-center justify-between bg-[#0B0B0D] border border-[#2A2A33] rounded-lg px-4 py-3 cursor-pointer"
      onClick={() => onChange(!checked)}
    >
      <div>
        <p className="text-sm text-white">{label}</p>
        <p className="text-xs text-[#6E6E78] mt-0.5">{description}</p>
      </div>
      <div
        className={`relative w-10 h-6 rounded-full transition-colors ${
          checked ? "bg-[#C8102E]" : "bg-[#2A2A33]"
        }`}
      >
        <div
          className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-1"
          }`}
        />
      </div>
    </div>
  );
}
