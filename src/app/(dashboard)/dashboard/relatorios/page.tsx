import { requireRole } from "@/lib/permissions";
import { BarChart2 } from "lucide-react";
import { getRelatorioData } from "./actions";
import { RelatoriosClient } from "./relatorios-client";

export default async function RelatoriosPage() {
  // Apenas owner e reception podem ver relatórios completos
  await requireRole(["owner", "reception"]);

  // Carrega dados do mês atual por padrão (SSR)
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
            background: "#1F1F27",
            border: "1px solid #2A2A33",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <BarChart2 size={20} color="#C8102E" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Relatórios</h1>
          <p className="text-sm text-[#6E6E78]">
            Análise de faturamento, serviços e desempenho
          </p>
        </div>
      </div>

      {/* Client component com estado e filtros */}
      <RelatoriosClient dadosIniciais={dadosIniciais} />
    </div>
  );
}
