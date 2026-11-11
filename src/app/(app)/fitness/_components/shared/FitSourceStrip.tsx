"use client";

import { useState } from "react";

import type { FitItem, FitItemStatus, FitSource } from "@/features/occupational-health/services/fitness.service";
import { cn } from "@/lib/utils";
import { ITEM_LABEL, SOURCE_LABEL, fmtDate, label } from "./fit-format";
import {
  FIT_SOURCES,
  SOURCE_ICON,
  STATUS_TONE,
  TONE_DOT,
  TONE_SOFT,
  TONE_TEXT,
  daysUntil,
  relativeDays,
  worstStatus,
} from "./fit-visual";

export function FitStatusLabel({ status }: { status: FitItemStatus }) {
  const tone = STATUS_TONE[status];
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1.5 text-[12.5px] font-medium", TONE_TEXT[tone])}>
      <span className={cn("size-1.5 rounded-full", TONE_DOT[tone])} aria-hidden />
      {label(ITEM_LABEL, status)}
    </span>
  );
}

function earliestExpiry(items: FitItem[]): string | undefined {
  return items
    .map((item) => item.expires_on)
    .filter((date): date is string => Boolean(date))
    .toSorted()[0];
}

/** All six sources side by side; choosing one lists its records underneath. */
export function FitSourceStrip({ bySource }: { bySource: Map<FitSource, FitItem[]> }) {
  const [picked, setPicked] = useState<FitSource | null>(null);
  const selected = picked ?? FIT_SOURCES.find((source) => (bySource.get(source) ?? []).length > 0) ?? null;
  const selectedItems = selected ? bySource.get(selected) ?? [] : [];

  return (
    <div>
      <ul className="grid grid-cols-2 gap-px overflow-hidden border-y border-dash-border bg-dash-border @md:grid-cols-3 @2xl:grid-cols-6">
        {FIT_SOURCES.map((source) => {
          const items = bySource.get(source) ?? [];
          const worst = worstStatus(items);
          const tone = worst ? STATUS_TONE[worst] : "none";
          const Icon = SOURCE_ICON[source];
          const expiry = earliestExpiry(items);
          const active = selected === source;
          return (
            <li key={source} className="bg-white" data-testid={`oh-fit-source-${source}`}>
              <button
                type="button"
                aria-pressed={active}
                disabled={items.length === 0}
                onClick={() => setPicked(source)}
                className={cn(
                  "relative flex h-full w-full flex-col items-start gap-2 px-3.5 pt-4 pb-3 text-left transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-primary/30",
                  active ? "bg-brand-tint/40" : "enabled:hover:bg-brand-tint/20",
                  "disabled:cursor-default",
                )}
              >
                <span className={cn("absolute inset-x-0 top-0 h-[3px]", TONE_DOT[tone])} aria-hidden />
                {active ? <span className="absolute inset-x-0 bottom-0 h-0.5 bg-brand-primary" aria-hidden /> : null}
                <span className={cn("flex size-8 items-center justify-center rounded-full", TONE_SOFT[tone])}>
                  <Icon className="size-4" aria-hidden />
                </span>
                <span
                  className={cn(
                    "text-[13px] font-semibold",
                    active ? "text-brand-primary" : worst ? "text-brand-navy" : "text-dash-muted",
                  )}
                >
                  {label(SOURCE_LABEL, source)}
                </span>
                {worst ? <FitStatusLabel status={worst} /> : <span className="text-[12.5px] text-dash-muted">Not on file</span>}
                <span className="text-[11.5px] tabular-nums text-dash-muted">
                  {expiry
                    ? `Valid to ${fmtDate(expiry)}`
                    : items.length > 0 && worst !== "missing"
                      ? `${items.length} record${items.length === 1 ? "" : "s"}`
                      : "\u00a0"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {selected && selectedItems.length > 0 ? (
        <div className="pt-4" data-testid="oh-fit-source-details">
          <p className="mb-1 text-[12px] font-semibold text-brand-primary">{label(SOURCE_LABEL, selected)} records</p>
          <ul className="divide-y divide-dash-border/70">
            {selectedItems.map((item, index) => (
              <li key={`${item.label}-${index}`} className="grid gap-x-6 gap-y-0.5 py-2.5 text-[13px] @xl:grid-cols-[minmax(0,1fr)_auto]">
                <div className="min-w-0">
                  <p className="font-medium text-brand-navy">{item.label || label(SOURCE_LABEL, item.source)}</p>
                  {item.message ? <p className="text-[12.5px] text-dash-muted">{item.message}</p> : null}
                  {item.restriction ? <p className="text-[12.5px] text-amber-900">Restriction: {item.restriction}</p> : null}
                </div>
                <div className="flex items-center gap-4 @xl:justify-end">
                  <FitStatusLabel status={item.status} />
                  <span className="w-36 text-right text-[12.5px] tabular-nums text-dash-muted">
                    {item.expires_on
                      ? `${fmtDate(item.expires_on)} · ${relativeDays(daysUntil(item.expires_on))}`
                      : item.status === "missing"
                        ? "Not recorded"
                        : "No expiry"}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
