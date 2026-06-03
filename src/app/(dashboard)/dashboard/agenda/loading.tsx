// src/app/(dashboard)/dashboard/agenda/loading.tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function AgendaLoading() {
  return (
    <div className="p-6 space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-56" />
      </div>

      {/* Card do calendário */}
      <div
        className="rounded-2xl overflow-hidden border"
        style={{ borderColor: "var(--border)" }}
      >
        {/* Header do calendário: título do mês + botões de navegação */}
        <div
          className="flex items-center justify-between px-6 py-5"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <Skeleton className="h-6 w-36" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-8 w-16 rounded-lg" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
        </div>

        {/* Cabeçalho dos dias da semana */}
        <div
          className="grid grid-cols-7"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="py-3 flex justify-center">
              <Skeleton className="h-3 w-6" />
            </div>
          ))}
        </div>

        {/* Grid de dias — 5 semanas × 7 dias */}
        <div className="grid grid-cols-7">
          {Array.from({ length: 35 }).map((_, i) => {
            const col = i % 7;
            const row = Math.floor(i / 7);
            return (
              <div
                key={i}
                className="min-h-[80px] p-2 flex flex-col gap-2"
                style={{
                  borderRight: col < 6 ? "1px solid var(--border)" : "none",
                  borderBottom: row < 4 ? "1px solid var(--border)" : "none",
                }}
              >
                {/* Número do dia */}
                <Skeleton className="h-7 w-7 rounded-full" />
                {/* Dots de agendamento — aparecem em ~40% dos dias */}
                {i % 3 === 0 && (
                  <div className="flex gap-1">
                    <Skeleton className="h-1.5 w-1.5 rounded-full" />
                    <Skeleton className="h-1.5 w-1.5 rounded-full" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
