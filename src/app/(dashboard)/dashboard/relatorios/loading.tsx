// src/app/(dashboard)/dashboard/relatorios/loading.tsx
import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";

export default function RelatoriosLoading() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-9 w-48 rounded-lg" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
      {/* gráfico skeleton */}
      <div className="rounded-xl border border-[#2A2A33] bg-[#17171C] p-6">
        <Skeleton className="h-5 w-40 mb-4" />
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    </div>
  );
}
