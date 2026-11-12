import { AlertTriangle, BarChart3, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { OH_SECTION_LABEL } from "@/features/occupational-health/components/dashboard/oh-flat";
import { cn } from "@/lib/utils";

type OhPanelProps = {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  "data-testid"?: string;
  id?: string;
};

/**
 * Flat dashboard section: small uppercase label, optional description and actions,
 * content straight on the page background (no border, fill or shadow).
 */
export function OhPanel({ title, description, actions, children, className, bodyClassName, "data-testid": testId, id }: OhPanelProps) {
  return (
    <section id={id} className={cn("flex min-w-0 flex-col", className)} data-testid={testId} aria-labelledby={id ? `${id}-title` : undefined}>
      <header className="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h2 id={id ? `${id}-title` : undefined} className={OH_SECTION_LABEL}>
            {title}
          </h2>
          {description ? <p className="mt-1 text-[13px] text-brand-slate">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </header>
      <div className={cn("min-w-0 flex-1", bodyClassName)}>{children}</div>
    </section>
  );
}

type OhPanelStateProps = {
  isLoading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  isEmpty?: boolean;
  emptyText?: string;
  height?: number;
  children: ReactNode;
};

/** Loading skeleton, error with retry, or empty message in place of a chart or list. */
export function OhPanelState({
  isLoading,
  error,
  onRetry,
  isEmpty,
  emptyText = "Nothing to show yet.",
  height = 240,
  children,
}: OhPanelStateProps) {
  if (isLoading) {
    return (
      <div className="animate-pulse rounded-lg bg-dash-canvas/70" style={{ height }} aria-busy="true" aria-label="Loading" />
    );
  }
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 text-center" style={{ minHeight: height }} role="alert">
        <AlertTriangle className="size-5 text-red-600" aria-hidden />
        <p className="text-[13px] text-red-700">{error instanceof Error && error.message ? error.message : "Could not load this data."}</p>
        {onRetry ? (
          <Button type="button" variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={onRetry}>
            <RefreshCw className="size-3" aria-hidden /> Try again
          </Button>
        ) : null}
      </div>
    );
  }
  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 text-center" style={{ minHeight: height }}>
        <BarChart3 className="size-5 text-dash-muted" aria-hidden />
        <p className="text-[13px] text-dash-muted">{emptyText}</p>
      </div>
    );
  }
  return <>{children}</>;
}
