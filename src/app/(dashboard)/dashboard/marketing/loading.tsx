// src/app/(dashboard)/dashboard/marketing/loading.tsx
import { Skeleton, SkeletonTable } from "@/components/ui/skeleton";

export default function MarketingLoading() {
  return (
    <div className="p-6 space-y-6">
      <Skeleton className="h-8 w-52" />
      {/* abas */}
      <div className="flex gap-2">
        <Skeleton className="h-9 w-36 rounded-lg" />
        <Skeleton className="h-9 w-36 rounded-lg" />
      </div>
      <SkeletonTable rows={6} />
    </div>
  );
}
