// src/app/(dashboard)/dashboard/comandas/nova/nova-comanda-form.tsx
"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { abrirComanda, getClientsForComanda } from "../actions";

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
    const resolvedClientName =
      clientMode === "cadastrado" && selectedClient
        ? selectedClient.name
        : clientName || "Cliente avulso";
    setError("");
    startTransition(async () => {
      try {
        await abrirComanda({
          professionalId,
          clientId: selectedClient?.id || undefined,
          clientName: resolvedClientName,
          notes: notes || undefined,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "";
        if (message.includes("NEXT_REDIRECT")) return;
        setError(message || "Erro ao abrir comanda.");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Profissional */}
      <div>
        <label
          className="mb-1.5 block text-sm font-medium"
          style={{ color: "var(--text-secondary)" }}
        >
          Profissional <span style={{ color: "var(--color-primary)" }}>*</span>
        </label>
        {role === "barber" ? (
          <div
            className="rounded-lg px-4 py-3"
            style={{
              border: "1px solid var(--border)",
              backgroundColor: "var(--bg-card)",
              color: "var(--text-primary)",
            }}
          >
            {professionals.find((p) => p.id === myProfessionalId)?.name || "—"}
          </div>
        ) : (
          <select
            value={professionalId}
            onChange={(e) => setProfessionalId(e.target.value)}
            className="livo-input"
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
        <label
          className="mb-1.5 block text-sm font-medium"
          style={{ color: "var(--text-secondary)" }}
        >
          Cliente
        </label>
        <div
          className="mb-3 flex rounded-lg p-1"
          style={{
            border: "1px solid var(--border)",
            backgroundColor: "var(--bg-card)",
          }}
        >
          {(["avulso", "cadastrado"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setClientMode(m);
                if (m === "avulso") {
                  setSelectedClient(null);
                  setClientSearch("");
                } else setClientName("");
              }}
              className="flex-1 rounded-md py-1.5 text-sm font-medium transition-colors"
              style={
                clientMode === m
                  ? {
                      backgroundColor: "var(--bg-card-elevated)",
                      color: "var(--text-primary)",
                    }
                  : { color: "var(--text-secondary)" }
              }
            >
              {m === "avulso" ? "Avulso" : "Do cadastro"}
            </button>
          ))}
        </div>

        {clientMode === "avulso" && (
          <input
            type="text"
            placeholder="Nome do cliente (opcional)"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            className="livo-input"
          />
        )}

        {clientMode === "cadastrado" && (
          <div className="relative">
            {selectedClient ? (
              <div
                className="flex items-center justify-between rounded-lg px-4 py-3"
                style={{
                  border: "1px solid var(--status-green)",
                  backgroundColor: "rgba(0,212,160,0.05)",
                }}
              >
                <div>
                  <p
                    className="text-sm font-medium"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {selectedClient.name}
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: "var(--text-secondary)" }}
                  >
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
                  style={{ color: "var(--text-secondary)" }}
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
                  className="livo-input"
                />
                {searchPending && (
                  <div className="absolute right-3 top-3.5">
                    <div
                      className="h-4 w-4 animate-spin rounded-full border-2"
                      style={{
                        borderColor: "var(--border)",
                        borderTopColor: "var(--color-primary)",
                      }}
                    />
                  </div>
                )}
                {clientResults.length > 0 && (
                  <div
                    className="absolute z-10 mt-1 w-full rounded-lg shadow-xl"
                    style={{
                      border: "1px solid var(--border)",
                      backgroundColor: "var(--bg-card-elevated)",
                    }}
                  >
                    {clientResults.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setSelectedClient(c);
                          setClientResults([]);
                          setClientSearch("");
                        }}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors"
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.backgroundColor =
                            "var(--bg-card)")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.backgroundColor =
                            "transparent")
                        }
                      >
                        <div
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium"
                          style={{
                            backgroundColor: "var(--color-primary-10)",
                            color: "var(--color-primary)",
                          }}
                        >
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p
                            className="text-sm font-medium"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {c.name}
                          </p>
                          <p
                            className="text-xs"
                            style={{ color: "var(--text-secondary)" }}
                          >
                            {c.phone}
                          </p>
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
        <label
          className="mb-1.5 block text-sm font-medium"
          style={{ color: "var(--text-secondary)" }}
        >
          Observações (opcional)
        </label>
        <textarea
          placeholder="Ex: cliente preferência..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="livo-input"
          style={{ resize: "none" }}
        />
      </div>

      {error && (
        <div
          className="rounded-lg px-4 py-3 text-sm"
          style={{
            border: "1px solid var(--color-primary-20)",
            backgroundColor: "var(--color-primary-10)",
            color: "var(--color-primary)",
          }}
        >
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 rounded-lg py-3 text-sm font-medium transition-colors"
          style={{
            border: "1px solid var(--border)",
            backgroundColor: "var(--bg-card)",
            color: "var(--text-secondary)",
          }}
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending || !professionalId}
          className="flex-1 rounded-lg py-3 text-sm font-medium text-white transition-colors disabled:opacity-50"
          style={{ backgroundColor: "var(--color-primary)" }}
        >
          {isPending ? "Abrindo..." : "Abrir Comanda"}
        </button>
      </div>
    </div>
  );
}
