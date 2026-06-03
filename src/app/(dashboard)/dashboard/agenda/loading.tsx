// src/app/(dashboard)/dashboard/agenda/loading.tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function AgendaLoading() {
  return (
    <div className="p-6 space-y-6">
      {/* header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-36 rounded-lg" />
      </div>
      {/* date navigator */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-lg" />
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-9 w-9 rounded-lg" />
      </div>
      {/* colunas de barbeiros */}
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-10 w-full rounded-lg" />
            {Array.from({ length: 6 }).map((_, j) => (
              <Skeleton key={j} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
