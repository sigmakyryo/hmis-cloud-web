import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

const DAY = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });
const MONTH = new Intl.DateTimeFormat("en-GB", { month: "short" });

/** "12 Nov" from an ISO date or date-time, or a dash. */
export function shortDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  return Number.isNaN(date.getTime()) ? "—" : DAY.format(date);
}

/** "Nov" from "2026-11". */
export function shortMonth(value: string): string {
  const date = new Date(`${value}-01T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : MONTH.format(date);
}

/** Two blocks side by side once there is room. */
export function ViewGrid({ children }: { children: ReactNode }) {
  return <div className="grid items-start gap-x-12 gap-y-10 @3xl:grid-cols-2">{children}</div>;
}

export type Column = { key: string; label: string; value: number; title: string };

/**
 * Small vertical bars with a label under each. Heights are data, so they are set as a style.
 * The figure is described in one sentence for screen readers.
 */
export function ColumnChart({ columns, summary, tone = "bg-brand-primary", showValues = false }: { columns: Column[]; summary: string; tone?: string; showValues?: boolean }) {
  const max = Math.max(1, ...columns.map((column) => column.value));
  return (
    <figure role="img" aria-label={summary} className="m-0">
      <div className="flex h-28 items-end gap-1.5 border-b border-dash-border">
        {columns.map((column) => (
          <div key={column.key} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1" title={column.title}>
            {showValues && column.value > 0 ? <span className="text-[11px] font-medium text-dash-muted tabular-nums">{column.value}</span> : null}
            <div
              className={cn("w-full max-w-7 rounded-t-[3px]", column.value > 0 ? tone : "bg-dash-canvas")}
              style={{ height: column.value > 0 ? `${Math.max(4, (column.value / max) * 100)}%` : "2px" }}
            />
          </div>
        ))}
      </div>
      <div aria-hidden className="mt-1.5 flex gap-1.5">
        {columns.map((column) => (
          <span key={column.key} className="min-w-0 flex-1 truncate text-center text-[11px] text-dash-muted">
            {column.label}
          </span>
        ))}
      </div>
    </figure>
  );
}

export type Segment = { key: string; label: string; value: number; className: string };

/** One bar split into parts, with a legend that carries the numbers. */
export function StackedBar({ segments, label, legend = true, height = "h-2" }: { segments: Segment[]; label: string; legend?: boolean; height?: string }) {
  const shown = segments.filter((segment) => segment.value > 0);
  return (
    <div>
      <div
        role="img"
        aria-label={`${label}: ${segments.map((segment) => `${segment.value} ${segment.label.toLowerCase()}`).join(", ")}`}
        className={cn("flex gap-0.5 overflow-hidden rounded-full bg-dash-canvas", height)}
      >
        {shown.map((segment) => (
          <span key={segment.key} className={segment.className} style={{ flexGrow: segment.value }} />
        ))}
      </div>
      {legend ? (
        <p aria-hidden className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1 text-[12.5px] text-dash-muted">
          {segments.map((segment) => (
            <span key={segment.key} className="inline-flex items-center gap-1.5">
              <span className={cn("size-2 rounded-full", segment.className)} />
              {segment.label} <span className="font-semibold text-brand-navy tabular-nums">{segment.value}</span>
            </span>
          ))}
        </p>
      ) : null}
    </div>
  );
}
