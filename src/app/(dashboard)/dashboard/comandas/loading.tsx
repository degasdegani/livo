// src/app/(dashboard)/dashboard/comandas/loading.tsx
import { Skeleton, SkeletonTable } from "@/components/ui/skeleton";

export default function ComandasLoading() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-9 w-36 rounded-lg" />
      </div>
      <SkeletonTable rows={7} />
    </div>
  );
}
