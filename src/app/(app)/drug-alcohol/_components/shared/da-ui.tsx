"use client";

import type { ReactNode } from "react";

import { ListPageDataTableCell, ListPageDataTableRow } from "@/features/app-shell/components/page-layout";
import { cn } from "@/lib/utils";

/** Table row; clickable rows open a side sheet. */
export function DaRow({ children, onClick, testId }: { children: ReactNode; onClick?: () => void; testId?: string }) {
  return (
    <ListPageDataTableRow
      data-testid={testId}
      onClick={onClick}
      className={onClick ? "cursor-pointer" : undefined}
    >
      {children}
    </ListPageDataTableRow>
  );
}

export function DaCell({
  children,
  first,
  actions,
  className,
}: {
  children: ReactNode;
  first?: boolean;
  actions?: boolean;
  className?: string;
}) {
  return (
    <ListPageDataTableCell
      className={cn(first && "pl-4 md:pl-6", actions && "pr-4 text-right md:pr-6", className)}
    >
      {actions ? <div className="flex justify-end gap-3">{children}</div> : children}
    </ListPageDataTableCell>
  );
}

/** Label / value line used inside side sheets. */
export function DaFact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-dash-border/60 py-1.5 text-[13px] last:border-b-0">
      <span className="text-dash-muted">{label}</span>
      <span className="text-right text-brand-navy">{children}</span>
    </div>
  );
}

/** Small section heading inside a side sheet. */
export function DaSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-1">
      <h3 className="text-[12px] font-semibold uppercase tracking-wide text-dash-muted">{title}</h3>
      <div>{children}</div>
    </section>
  );
}
