import { CreditCard } from "lucide-react";
import { getFaturamentoData } from "./actions";
import { FaturamentoClient } from "./faturamento-client";

export default async function FaturamentoPage() {
  const dadosIniciais = await getFaturamentoData();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            backgroundColor: "var(--bg-card-elevated)",
            border: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <CreditCard size={20} style={{ color: "var(--color-primary)" }} />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
            Faturamento
          </h1>
          <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
            Status da assinatura, próximo vencimento e histórico de faturas
          </p>
        </div>
      </div>
      <FaturamentoClient dadosIniciais={dadosIniciais} />
    </div>
  );
}
