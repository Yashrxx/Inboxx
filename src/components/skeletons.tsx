/**
 * Reusable skeleton loaders sized to match their real counterparts so that
 * swapping placeholder -> data causes zero layout shift.
 */
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Page title + optional subtitle / search / filter row. */
export function HeaderSkeleton({
  withSearch = false,
  withActions = false,
  className,
}: {
  withSearch?: boolean;
  withActions?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="space-y-2">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>
      {(withSearch || withActions) && (
        <div className="flex gap-2">
          {withSearch && <Skeleton className="h-9 flex-1" />}
          {withActions && <Skeleton className="h-9 w-24" />}
          {withActions && <Skeleton className="h-9 w-28" />}
        </div>
      )}
    </div>
  );
}

/** Generic card / metric tile placeholder. */
export function CardSkeleton({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("rounded-lg border border-border bg-card p-4", className)}>
      <Skeleton className="h-4 w-32" />
      <div className="mt-3 space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className="h-3" style={{ width: `${90 - i * 15}%` }} />
        ))}
      </div>
    </div>
  );
}

export function CardGridSkeleton({
  count = 3,
  lines = 3,
  className,
}: {
  count?: number;
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} lines={lines} />
      ))}
    </div>
  );
}

/**
 * Table body placeholder. Render inside an existing <TableBody> by passing
 * `asRows`, or standalone for a full bordered table block.
 */
export function TableRowsSkeleton({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className="border-b border-border last:border-0">
          {Array.from({ length: columns }).map((_, c) => (
            <td key={c} className="p-2 align-middle">
              <Skeleton className="h-4" style={{ width: c === 0 ? "70%" : "55%" }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function TableSkeleton({
  rows = 5,
  columns = 5,
  className,
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border border-border bg-card", className)}>
      <div className="flex gap-4 border-b border-border p-3">
        {Array.from({ length: columns }).map((_, c) => (
          <Skeleton key={c} className="h-4 flex-1" />
        ))}
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex gap-4 p-3">
            {Array.from({ length: columns }).map((_, c) => (
              <Skeleton key={c} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Vertical list of rows (leads, logs, conversation items). */
export function ListSkeleton({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border bg-card p-4 space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-full max-w-sm" />
          <Skeleton className="h-3 w-24" />
        </div>
      ))}
    </div>
  );
}
