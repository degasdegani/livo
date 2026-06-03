// src/app/(dashboard)/dashboard/comissoes/loading.tsx
import {
  Skeleton,
  SkeletonCard,
  SkeletonTable,
} from "@/components/ui/skeleton";

export default function ComissoesLoading() {
  return (
    <div className="p-6 space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
      <SkeletonTable rows={5} />
    </div>
  );
}
