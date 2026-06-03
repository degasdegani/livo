// src/app/(dashboard)/dashboard/relatorios/page.tsx
import { requireRole } from "@/lib/permissions";
import { BarChart2 } from "lucide-react";
import { getRelatorioData } from "./actions";
import { RelatoriosClient } from "./relatorios-client";

export default async function RelatoriosPage() {
  await requireRole(["owner", "reception"]);

  const dadosIniciais = await getRelatorioData("mes");

  return (
    <div className="p-6 space-y-6">
      {/* Cabeçalho */}
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
          <BarChart2 size={20} style={{ color: "var(--color-primary)" }} />
        </div>
        <div>
          <h1
            className="text-xl font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            Relatórios
          </h1>
          <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
            Análise de faturamento, serviços e desempenho
          </p>
        </div>
      </div>

      <RelatoriosClient dadosIniciais={dadosIniciais} />
    </div>
  );
}
