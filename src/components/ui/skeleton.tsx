// src/components/ui/skeleton.tsx

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-md bg-[#1F1F27] ${className}`} />
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-xl border border-[#2A2A33] bg-[#17171C] p-6 space-y-3">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 py-3 border-b border-[#2A2A33]">
      <Skeleton className="h-9 w-9 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-3 w-1/4" />
      </div>
      <Skeleton className="h-6 w-16 rounded-full" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-xl border border-[#2A2A33] bg-[#17171C] overflow-hidden">
      {/* header */}
      <div className="flex gap-4 px-4 py-3 border-b border-[#2A2A33] bg-[#0B0B0D]">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-3 w-20 ml-auto" />
      </div>
      {/* rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="space-y-6 p-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
      {/* table */}
      <SkeletonTable rows={6} />
    </div>
  );
}
