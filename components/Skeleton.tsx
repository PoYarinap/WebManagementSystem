export function Skeleton({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      className={`animate-pulse bg-slate-200/80 dark:bg-slate-800 rounded-2xl ${className}`}
    />
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Top Banner Skeleton */}
      <Skeleton className="h-14 w-full" />

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>

      {/* Progress Section */}
      <div className="space-y-3">
        <Skeleton className="h-6 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>

      {/* Chart Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    </div>
  );
}
