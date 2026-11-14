import { Skeleton } from "@/components/ui/skeleton";

export function OhQueueTableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="px-5 md:px-8" aria-busy="true">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-3 border-b border-dash-border/70 py-3.5">
          <Skeleton className="size-9 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
          <Skeleton className="hidden h-3.5 w-20 lg:block" />
          <Skeleton className="h-3.5 w-16" />
          <Skeleton className="h-3.5 w-20" />
        </div>
      ))}
    </div>
  );
}

export function OhQueuePageSkeleton() {
  return (
    <div className="bg-white" data-testid="oh-queue-page-skeleton">
      <div className="space-y-3 px-5 pt-7 md:px-8">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-72" />
        <Skeleton className="mt-6 h-9 w-full" />
      </div>
      <OhQueueTableSkeleton rows={8} />
    </div>
  );
}
