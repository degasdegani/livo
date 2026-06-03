// src/app/(dashboard)/dashboard/clients/loading.tsx
import { Skeleton, SkeletonTable } from "@/components/ui/skeleton";

export default function ClientsLoading() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>
      <Skeleton className="h-10 w-full rounded-lg" />
      <SkeletonTable rows={8} />
    </div>
  );
}
