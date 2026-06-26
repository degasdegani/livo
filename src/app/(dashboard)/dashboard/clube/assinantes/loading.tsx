import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";

export default function AssinantesLoading() {
  return (
    <div className="p-6 space-y-6">
      <div className="space-y-1.5">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-4 w-72" />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>

      <div
        className="rounded-xl p-4 space-y-3"
        style={{
          border: "1px solid var(--border)",
          backgroundColor: "var(--bg-card)",
        }}
      >
        <Skeleton className="h-9 w-full rounded-lg" />
        <Skeleton className="h-9 w-full rounded-lg" />
        <Skeleton className="h-9 w-full rounded-lg" />
      </div>
    </div>
  );
}
