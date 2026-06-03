// src/app/(dashboard)/dashboard/settings/loading.tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <Skeleton className="h-8 w-40" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      ))}
      <Skeleton className="h-10 w-32 rounded-lg" />
    </div>
  );
}
