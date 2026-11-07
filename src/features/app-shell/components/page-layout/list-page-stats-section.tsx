import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** One-line summary used on directory pages. Number, then label, then hint. */
export const LIST_PAGE_INSIGHT_STRIP_CLASS =
  "flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-dash-border px-4 py-2.5 md:px-6";

export const LIST_PAGE_INSIGHT_CELL_CLASS =
  "flex min-w-0 flex-wrap items-baseline gap-x-1.5 [&_p]:order-3 [&_p]:mt-0 [&_p]:text-[12px] [&_p]:text-dash-muted";

export const LIST_PAGE_INSIGHT_LABEL_CLASS = "order-2 text-[13px] text-dash-muted";

export const LIST_PAGE_INSIGHT_VALUE_CLASS =
  "order-1 text-[15px] font-semibold tabular-nums leading-none text-brand-navy";

type ListPageStatsSectionProps = {
  children: ReactNode;
  className?: string;
};

export function ListPageStatsSection({
  children,
  className,
}: ListPageStatsSectionProps) {
  return (
    <div data-list-band className={cn(className)}>
      {children}
    </div>
  );
}
