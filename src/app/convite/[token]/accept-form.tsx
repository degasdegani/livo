"use client";

import { useState, useTransition } from "react";
import { acceptInvitationAction } from "./actions";

interface Props {
  invitationId: string;
  invitationEmail: string;
  loggedUser: { id: string; email: string; name: string } | null;
}

export default function AcceptInviteForm({
  invitationId,
  invitationEmail,
  loggedUser,
}: Props) {
  const [mode, setMode] = useState<"choose" | "create" | "logged">(
    loggedUser ? "logged" : "choose",
  );
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleAcceptAsLoggedUser() {
    setError(null);
    startTransition(async () => {
      const result = await acceptInvitationAction({
        invitationId,
        mode: "existing",
      });
      if (!result.success) {
        setError(result.error);
      }
      // Em caso de sucesso, o server action faz redirect — não precisa tratar aqui
    });
  }

  async function handleCreateAndAccept() {
    setError(null);
    if (!name.trim()) {
      setError("Informe seu nome completo.");
      return;
    }
    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    startTransition(async () => {
      const result = await acceptInvitationAction({
        invitationId,
        mode: "create",
        name: name.trim(),
        password,
      });
      if (!result.success) {
        setError(result.error);
      }
    });
  }

  // ── Usuário já está logado ─────────────────────────────────────────────────
  if (mode === "logged" && loggedUser) {
    return (
      <div>
        <p className="text-sm text-[#9A9AA6] mb-5">Você está logado como:</p>
        <div className="flex items-center gap-3 bg-[#0B0B0D] border border-[#2A2A33] rounded-lg px-4 py-3 mb-6">
          <div className="w-8 h-8 rounded-full bg-[#2A2A33] flex items-center justify-center text-sm font-bold text-white">
            {(loggedUser.name ?? "?")[0].toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium text-white">{loggedUser.name}</p>
            <p className="text-xs text-[#6E6E78]">{loggedUser.email}</p>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3 mb-4">
            {error}
          </p>
        )}

        <button
          onClick={handleAcceptAsLoggedUser}
          disabled={isPending}
          className="w-full bg-[#C8102E] hover:bg-[#E0263D] disabled:opacity-40 text-white font-semibold py-3 rounded-lg text-sm transition-colors"
        >
          {isPending ? "Aguarde..." : "Aceitar convite com esta conta"}
        </button>

        <button
          onClick={() => setMode("choose")}
          className="w-full mt-3 text-center text-xs text-[#6E6E78] hover:text-[#9A9AA6] transition-colors py-2"
        >
          Usar outra conta
        </button>
      </div>
    );
  }

  // ── Escolha: criar conta ou já tenho conta ─────────────────────────────────
  if (mode === "choose") {
    return (
      <div>
        <p className="text-sm text-[#9A9AA6] mb-1">O convite é para:</p>
        <p className="text-sm font-medium text-white mb-6">{invitationEmail}</p>

        <div className="space-y-3">
          <button
            onClick={() => setMode("create")}
            className="w-full bg-[#C8102E] hover:bg-[#E0263D] text-white font-semibold py-3 rounded-lg text-sm transition-colors"
          >
            Criar minha conta no LIVO
          </button>

          <a
            href={`/login?callbackUrl=/convite/${invitationId}&inviteId=${invitationId}`}
            className="w-full flex items-center justify-center border border-[#2A2A33] hover:border-[#9A9AA6] text-[#9A9AA6] hover:text-white font-medium py-3 rounded-lg text-sm transition-colors"
          >
            Já tenho uma conta — Entrar
          </a>
        </div>

        <p className="text-xs text-[#6E6E78] text-center mt-4">
          Ao aceitar, você concorda com os{" "}
          <a
            href="/termos"
            className="text-[#9A9AA6] hover:text-white underline"
          >
            termos de uso
          </a>{" "}
          do LIVO.
        </p>
      </div>
    );
  }

  // ── Criar nova conta ───────────────────────────────────────────────────────
  return (
    <div>
      <p className="text-sm text-[#9A9AA6] mb-5">
        Crie sua conta para acessar o LIVO.
      </p>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-[#9A9AA6] mb-1.5 uppercase tracking-wide">
            Seu nome
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome completo"
            className="w-full bg-[#0B0B0D] border border-[#2A2A33] rounded-lg px-4 py-2.5 text-sm text-white placeholder-[#6E6E78] focus:outline-none focus:border-[#C8102E]/60 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[#9A9AA6] mb-1.5 uppercase tracking-wide">
            E-mail
          </label>
          <input
            type="email"
            value={invitationEmail}
            disabled
            className="w-full bg-[#0B0B0D] border border-[#2A2A33] rounded-lg px-4 py-2.5 text-sm text-[#6E6E78] cursor-not-allowed"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[#9A9AA6] mb-1.5 uppercase tracking-wide">
            Senha
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres"
            className="w-full bg-[#0B0B0D] border border-[#2A2A33] rounded-lg px-4 py-2.5 text-sm text-white placeholder-[#6E6E78] focus:outline-none focus:border-[#C8102E]/60 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[#9A9AA6] mb-1.5 uppercase tracking-wide">
            Confirmar senha
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repita a senha"
            className="w-full bg-[#0B0B0D] border border-[#2A2A33] rounded-lg px-4 py-2.5 text-sm text-white placeholder-[#6E6E78] focus:outline-none focus:border-[#C8102E]/60 transition-colors"
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3 mt-4">
          {error}
        </p>
      )}

      <button
        onClick={handleCreateAndAccept}
        disabled={isPending}
        className="w-full mt-5 bg-[#C8102E] hover:bg-[#E0263D] disabled:opacity-40 text-white font-semibold py-3 rounded-lg text-sm transition-colors"
      >
        {isPending ? "Criando conta..." : "Criar conta e aceitar convite"}
      </button>

      <button
        onClick={() => setMode("choose")}
        className="w-full mt-2 text-center text-xs text-[#6E6E78] hover:text-[#9A9AA6] transition-colors py-2"
      >
        ← Voltar
      </button>
    </div>
  );
}
