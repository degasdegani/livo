"use client";

import { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import type {
  AgendaClientResult,
  AgendaService,
} from "../agenda-actions";
import { searchClientsForAgenda } from "../agenda-actions";
import {
  dateTimeToISO,
  formatCurrency,
  minToTimeStr,
  timeStrToMin,
} from "./shared";

// ── useClientSearch hook ──────────────────────────────────────────────────────

export function useClientSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AgendaClientResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selected, setSelected] = useState<AgendaClientResult | null>(null);
  const [isManual, setIsManual] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleInput(term: string) {
    setQuery(term);
    setSelected(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (term.trim().length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      const res = await searchClientsForAgenda(term.trim());
      setResults(res);
      setShowDropdown(res.length > 0);
      setIsSearching(false);
    }, 300);
  }

  function selectClient(c: AgendaClientResult) {
    setSelected(c);
    setQuery(c.name);
    setShowDropdown(false);
  }

  function reset() {
    setQuery("");
    setResults([]);
    setShowDropdown(false);
    setSelected(null);
    setIsManual(false);
    setManualName("");
    setManualPhone("");
  }

  const finalName = selected?.name ?? (isManual ? manualName : query.trim());
  const finalPhone = selected?.phone ?? (isManual ? manualPhone : "");

  return {
    query,
    results,
    isSearching,
    showDropdown,
    selected,
    isManual,
    manualName,
    manualPhone,
    finalName,
    finalPhone,
    handleInput,
    selectClient,
    setIsManual,
    setManualName,
    setManualPhone,
    reset,
    setShowDropdown,
  };
}

// ── ServiceChips ──────────────────────────────────────────────────────────────

export function ServiceChips({
  services,
  selected,
  onChange,
}: {
  services: AgendaService[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  }

  return (
    <div className="flex flex-wrap gap-2">
      {services.map((s) => {
        const isOn = selected.includes(s.id);
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => toggle(s.id)}
            className="rounded-full px-3 py-1 text-xs font-medium transition-all border"
            style={
              isOn
                ? {
                    backgroundColor: "var(--color-primary)",
                    color: "#fff",
                    borderColor: "var(--color-primary)",
                  }
                : {
                    backgroundColor: "transparent",
                    color: "var(--text-secondary)",
                    borderColor: "var(--border)",
                  }
            }
          >
            {s.name}
            {isOn && <span className="ml-1 opacity-70">{s.durationMin}min</span>}
          </button>
        );
      })}
    </div>
  );
}

// ── CreateModal ───────────────────────────────────────────────────────────────

export function CreateModal({
  professionalId: initialProfId,
  suggestedMinute,
  dateKey,
  services,
  professionals,
  userRole,
  userProfessionalId,
  isPending,
  onClose,
  onCreate,
}: {
  professionalId: string;
  suggestedMinute: number;
  dateKey: string;
  services: AgendaService[];
  professionals: { id: string; name: string }[];
  userRole: string;
  userProfessionalId: string | null;
  isPending: boolean;
  onClose: () => void;
  onCreate: (data: {
    professionalId: string;
    serviceIds: string[];
    dateISO: string;
    clientName: string;
    clientPhone: string;
    notes: string;
  }) => void;
}) {
  const [profId, setProfId] = useState(initialProfId);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [time, setTime] = useState(minToTimeStr(suggestedMinute));
  const [notes, setNotes] = useState("");
  const cs = useClientSearch();

  const selectedServices = services.filter((s) => selectedServiceIds.includes(s.id));
  const totalDuration = selectedServices.reduce((sum, s) => sum + s.durationMin, 0);
  const totalPrice = selectedServices.reduce((sum, s) => sum + s.priceInCents, 0);
  const endTimeStr = totalDuration > 0 ? minToTimeStr(timeStrToMin(time) + totalDuration) : "";

  const canSubmit =
    selectedServiceIds.length > 0 && cs.finalName.trim() && cs.finalPhone.trim();

  function handleSubmit() {
    if (!canSubmit) return;
    onCreate({
      professionalId: profId,
      serviceIds: selectedServiceIds,
      dateISO: dateTimeToISO(dateKey, time),
      clientName: cs.finalName.trim(),
      clientPhone: cs.finalPhone.trim(),
      notes,
    });
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Novo Agendamento"
      size="md"
      footer={{
        cancel: { onClick: onClose },
        confirm: {
          label: "Agendar",
          onClick: handleSubmit,
          loading: isPending,
          loadingLabel: "Agendando…",
          disabled: !canSubmit,
        },
      }}
    >
      <div className="space-y-4">
        {(userRole === "owner" || userRole === "reception") && (
          <Select
            id="create-prof"
            label="Profissional"
            value={profId}
            onChange={(e) => setProfId(e.target.value)}
          >
            {professionals.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        )}

        <Input
          id="create-time"
          label="Horário"
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          required
        />

        <div>
          <p
            className="text-xs font-medium uppercase tracking-wide mb-2"
            style={{ color: "var(--text-tertiary)" }}
          >
            Serviços{" "}
            {selectedServiceIds.length === 0 && (
              <span style={{ color: "var(--status-red)" }}>*</span>
            )}
          </p>
          <ServiceChips
            services={services}
            selected={selectedServiceIds}
            onChange={setSelectedServiceIds}
          />
          {totalDuration > 0 && (
            <p className="text-xs mt-2" style={{ color: "var(--text-secondary)" }}>
              Duração total: {totalDuration} min
              {endTimeStr && ` · Término: ${endTimeStr}`}
              {totalPrice > 0 && ` · ${formatCurrency(totalPrice)}`}
            </p>
          )}
        </div>

        <div className="relative">
          <Input
            id="create-client-search"
            label="Cliente (nome ou telefone)"
            value={cs.query}
            onChange={(e) => cs.handleInput(e.target.value)}
            placeholder="Buscar cadastrado…"
            required
          />
          {cs.isSearching && (
            <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
              Buscando…
            </p>
          )}
          {cs.showDropdown && (
            <div
              className="absolute z-50 w-full rounded-lg mt-1 shadow-lg overflow-hidden"
              style={{
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--border)",
              }}
            >
              {cs.results.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm hover:opacity-80 transition-opacity"
                  style={{ color: "var(--text-primary)" }}
                  onClick={() => cs.selectClient(c)}
                >
                  <span className="font-medium">{c.name}</span>
                  <span className="ml-2 text-xs" style={{ color: "var(--text-tertiary)" }}>
                    {c.phone}
                  </span>
                </button>
              ))}
              <button
                type="button"
                className="w-full text-left px-3 py-2 text-xs border-t"
                style={{ color: "var(--text-secondary)", borderColor: "var(--border)" }}
                onClick={() => {
                  cs.setIsManual(true);
                  cs.setShowDropdown(false);
                }}
              >
                + Inserir manualmente
              </button>
            </div>
          )}
        </div>

        {cs.isManual && (
          <div
            className="space-y-3 p-3 rounded-lg"
            style={{
              backgroundColor: "var(--bg-card-elevated)",
              border: "1px solid var(--border)",
            }}
          >
            <Input
              id="create-manual-name"
              label="Nome"
              value={cs.manualName}
              onChange={(e) => cs.setManualName(e.target.value)}
              required
            />
            <Input
              id="create-manual-phone"
              label="Telefone"
              type="tel"
              value={cs.manualPhone}
              onChange={(e) => cs.setManualPhone(e.target.value)}
              required
            />
          </div>
        )}

        <div>
          <label
            htmlFor="create-notes"
            className="block text-xs font-medium uppercase tracking-wide mb-1.5"
            style={{ color: "var(--text-tertiary)" }}
          >
            Observações
          </label>
          <textarea
            id="create-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="livo-input w-full resize-none"
            placeholder="Opcional…"
          />
        </div>
      </div>
    </Modal>
  );
}
