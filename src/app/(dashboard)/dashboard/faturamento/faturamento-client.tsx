"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { cancelSubscriptionAction } from "./actions";
import type { FaturamentoData } from "./actions";

type BadgeVariant = "success" | "warning" | "error" | "info" | "gold" | "neutral";

const PLAN_STATUS_BADGE: Record<string, { label: string; variant: BadgeVariant }> = {
  trial: { label: "Período de teste", variant: "info" },
  active: { label: "Ativo", variant: "success" },
  suspended: { label: "Pagamento pendente", variant: "warning" },
  cancelled: { label: "Cancelado", variant: "error" },
  lifetime: { label: "Vitalício", variant: "gold" },
};

const FATURA_STATUS_BADGE: Record<string, { label: string; variant: BadgeVariant }> = {
  PENDING: { label: "Aguardando pagamento", variant: "warning" },
  AWAITING_RISK_ANALYSIS: { label: "Em análise", variant: "info" },
  CONFIRMED: { label: "Confirmado", variant: "success" },
  RECEIVED: { label: "Pago", variant: "success" },
  OVERDUE: { label: "Vencido", variant: "error" },
  REFUNDED: { label: "Estornado", variant: "neutral" },
  DELETED: { label: "Removido", variant: "neutral" },
};

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatData(iso: string): string {
  const [ano, mes, dia] = iso.split("T")[0].split("-");
  return `${dia}/${mes}/${ano}`;
}

interface Props {
  dadosIniciais: FaturamentoData;
}

export function FaturamentoClient({ dadosIniciais }: Props) {
  const [dados] = useState(dadosIniciais);
  const [modalAberto, setModalAberto] = useState(false);
  const [pending, startTransition] = useTransition();
  const [cancelado, setCancelado] = useState(false);
  const { toast } = useToast();

  const statusInfo =
    PLAN_STATUS_BADGE[dados.planStatus] ?? { label: dados.planStatus, variant: "neutral" as const };
  const podeCancelar = dados.planStatus === "active" || dados.planStatus === "suspended";

  function handleCancelar() {
    startTransition(async () => {
      const result = await cancelSubscriptionAction();
      if (result.error) {
        toast(result.error, "error");
        return;
      }
      setCancelado(true);
      setModalAberto(false);
      toast("Cancelamento solicitado. Pode levar alguns minutos para refletir.", "success");
    });
  }

  return (
    <div className="space-y-6">
      <div
        className="rounded-2xl p-6"
        style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
              Status da assinatura
            </p>
            <div className="mt-1">
              <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
            </div>
          </div>
          <div>
            <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
              Plano atual
            </p>
            <p className="font-bold" style={{ color: "var(--text-primary)" }}>
              {dados.plan.toUpperCase()}
            </p>
          </div>
          {dados.planStatus === "trial" && dados.trialEndsAt && (
            <div>
              <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
                Trial expira em
              </p>
              <p className="font-bold" style={{ color: "var(--text-primary)" }}>
                {formatData(dados.trialEndsAt)}
              </p>
            </div>
          )}
          {dados.proximoVencimento && (
            <div>
              <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
                Próximo vencimento
              </p>
              <p className="font-bold" style={{ color: "var(--text-primary)" }}>
                {formatData(dados.proximoVencimento)}
              </p>
            </div>
          )}
          {dados.freeMonthCredits > 0 && (
            <div>
              <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
                Créditos de indicação
              </p>
              <Badge variant="gold">{dados.freeMonthCredits} mês(es) grátis</Badge>
            </div>
          )}
        </div>

        {podeCancelar && !cancelado && (
          <div className="mt-5 pt-5" style={{ borderTop: "1px solid var(--border)" }}>
            <Button variant="destructive" size="sm" onClick={() => setModalAberto(true)}>
              Cancelar assinatura
            </Button>
          </div>
        )}
      </div>

      <div
        className="rounded-2xl overflow-hidden"
        style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <div className="p-5" style={{ borderBottom: "1px solid var(--border)" }}>
          <h2 className="font-bold" style={{ color: "var(--text-primary)" }}>
            Histórico de faturas
          </h2>
        </div>

        {dados.erroAsaas && (
          <p className="p-5 text-sm" style={{ color: "var(--status-red)" }}>
            {dados.erroAsaas}
          </p>
        )}

        {!dados.erroAsaas && dados.faturas.length === 0 && (
          <p className="p-5 text-sm" style={{ color: "var(--text-tertiary)" }}>
            {dados.planStatus === "trial"
              ? "Nenhuma fatura ainda — você está no período de teste."
              : "Nenhuma fatura encontrada."}
          </p>
        )}

        {dados.faturas.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vencimento</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead align="right">Fatura</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dados.faturas.map((f) => {
                const badge =
                  FATURA_STATUS_BADGE[f.status] ?? { label: f.status, variant: "neutral" as const };
                return (
                  <TableRow key={f.id}>
                    <TableCell>{formatData(f.dueDate)}</TableCell>
                    <TableCell>{formatBRL(f.value)}</TableCell>
                    <TableCell>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </TableCell>
                    <TableCell align="right">
                      {f.invoiceUrl && (
                        <a
                          href={f.invoiceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm hover:underline"
                          style={{ color: "var(--color-primary)" }}
                        >
                          Ver fatura →
                        </a>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <Modal
        open={modalAberto}
        onClose={() => setModalAberto(false)}
        title="Cancelar assinatura"
        description="Essa ação encerra o acesso ao LIVO ao final do período já pago. Tem certeza?"
        footer={{
          confirm: {
            label: "Sim, cancelar",
            onClick: handleCancelar,
            loading: pending,
            loadingLabel: "Cancelando...",
            variant: "danger",
          },
        }}
      />
    </div>
  );
}
