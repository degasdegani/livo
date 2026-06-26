import { Skeleton, SkeletonRow } from "@/components/ui/skeleton";

export default function CombosLoading() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div className="space-y-1.5">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-56" />
          </div>
        </div>
        <Skeleton className="h-9 w-36 rounded-lg" />
      </div>

      <div
        className="rounded-xl overflow-hidden"
        style={{
          border: "1px solid var(--border)",
          backgroundColor: "var(--bg-card)",
        }}
      >
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
      </div>
    </div>
  );
}
