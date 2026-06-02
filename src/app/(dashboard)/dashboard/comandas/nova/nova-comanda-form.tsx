"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { getClientsForComanda, openComanda } from "../actions";

type Professional = { id: string; name: string };
type ClientResult = { id: string; name: string; phone: string };

type Props = {
  professionals: Professional[];
  myProfessionalId: string | null;
  role: string;
};

export default function NovaComandaForm({
  professionals,
  myProfessionalId,
  role,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  // Formulário
  const [professionalId, setProfessionalId] = useState(
    role === "barber" && myProfessionalId ? myProfessionalId : "",
  );
  const [clientMode, setClientMode] = useState<"avulso" | "cadastrado">(
    "avulso",
  );
  const [clientName, setClientName] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [clientResults, setClientResults] = useState<ClientResult[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientResult | null>(
    null,
  );
  const [notes, setNotes] = useState("");
  const [searchPending, setSearchPending] = useState(false);

  const searchClients = useCallback(async (term: string) => {
    setClientSearch(term);
    if (term.length < 2) {
      setClientResults([]);
      return;
    }
    setSearchPending(true);
    const results = await getClientsForComanda(term);
    setClientResults(results);
    setSearchPending(false);
  }, []);

  function handleSubmit() {
    if (!professionalId) {
      setError("Selecione um profissional.");
      return;
    }

    setError("");
    startTransition(async () => {
      const result = await openComanda({
        professionalId,
        clientId: selectedClient?.id || undefined,
        clientName:
          clientMode === "cadastrado" && selectedClient
            ? selectedClient.name
            : clientName || undefined,
        notes: notes || undefined,
      });

      if ("error" in result && result.error) {
        if (result.comandaId) {
          router.push(`/dashboard/comandas/${result.comandaId}`);
        } else {
          setError(result.error);
        }
        return;
      }

      if (result.success && result.comandaId) {
        router.push(`/dashboard/comandas/${result.comandaId}`);
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Profissional */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-[#9A9AA6]">
          Profissional <span className="text-[#C8102E]">*</span>
        </label>
        {role === "barber" ? (
          <div className="rounded-lg border border-[#2A2A33] bg-[#17171C] px-4 py-3 text-white">
            {professionals.find((p) => p.id === myProfessionalId)?.name || "—"}
          </div>
        ) : (
          <select
            value={professionalId}
            onChange={(e) => setProfessionalId(e.target.value)}
            className="w-full rounded-lg border border-[#2A2A33] bg-[#17171C] px-4 py-3 text-white outline-none focus:border-[#C8102E]/50"
          >
            <option value="">Selecione...</option>
            {professionals.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Cliente */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-[#9A9AA6]">
          Cliente
        </label>

        {/* Toggle avulso / cadastrado */}
        <div className="mb-3 flex rounded-lg border border-[#2A2A33] bg-[#17171C] p-1">
          <button
            type="button"
            onClick={() => {
              setClientMode("avulso");
              setSelectedClient(null);
              setClientSearch("");
            }}
            className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
              clientMode === "avulso"
                ? "bg-[#2A2A33] text-white"
                : "text-[#9A9AA6] hover:text-white"
            }`}
          >
            Avulso
          </button>
          <button
            type="button"
            onClick={() => {
              setClientMode("cadastrado");
              setClientName("");
            }}
            className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
              clientMode === "cadastrado"
                ? "bg-[#2A2A33] text-white"
                : "text-[#9A9AA6] hover:text-white"
            }`}
          >
            Do cadastro
          </button>
        </div>

        {clientMode === "avulso" && (
          <input
            type="text"
            placeholder="Nome do cliente (opcional)"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            className="w-full rounded-lg border border-[#2A2A33] bg-[#17171C] px-4 py-3 text-white placeholder-[#6E6E78] outline-none focus:border-[#C8102E]/50"
          />
        )}

        {clientMode === "cadastrado" && (
          <div className="relative">
            {selectedClient ? (
              <div className="flex items-center justify-between rounded-lg border border-[#3FB950]/30 bg-[#3FB950]/5 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-white">
                    {selectedClient.name}
                  </p>
                  <p className="text-xs text-[#9A9AA6]">
                    {selectedClient.phone}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedClient(null);
                    setClientSearch("");
                    setClientResults([]);
                  }}
                  className="text-[#9A9AA6] hover:text-white"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  placeholder="Buscar por nome ou telefone..."
                  value={clientSearch}
                  onChange={(e) => searchClients(e.target.value)}
                  className="w-full rounded-lg border border-[#2A2A33] bg-[#17171C] px-4 py-3 text-white placeholder-[#6E6E78] outline-none focus:border-[#C8102E]/50"
                />
                {searchPending && (
                  <div className="absolute right-3 top-3.5">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#2A2A33] border-t-[#C8102E]" />
                  </div>
                )}
                {clientResults.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full rounded-lg border border-[#2A2A33] bg-[#1F1F27] shadow-xl">
                    {clientResults.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setSelectedClient(c);
                          setClientResults([]);
                          setClientSearch("");
                        }}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[#2A2A33]"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#C8102E]/20 text-sm font-medium text-[#C8102E]">
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">
                            {c.name}
                          </p>
                          <p className="text-xs text-[#9A9AA6]">{c.phone}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Observações */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-[#9A9AA6]">
          Observações (opcional)
        </label>
        <textarea
          placeholder="Ex: cliente preferência..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full resize-none rounded-lg border border-[#2A2A33] bg-[#17171C] px-4 py-3 text-white placeholder-[#6E6E78] outline-none focus:border-[#C8102E]/50"
        />
      </div>

      {error && (
        <div className="rounded-lg border border-[#C8102E]/20 bg-[#C8102E]/10 px-4 py-3 text-sm text-[#C8102E]">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 rounded-lg border border-[#2A2A33] bg-[#17171C] py-3 text-sm font-medium text-[#9A9AA6] transition-colors hover:text-white"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending || !professionalId}
          className="flex-1 rounded-lg bg-[#C8102E] py-3 text-sm font-medium text-white transition-colors hover:bg-[#E0263D] disabled:opacity-50"
        >
          {isPending ? "Abrindo..." : "Abrir Comanda"}
        </button>
      </div>
    </div>
  );
}
