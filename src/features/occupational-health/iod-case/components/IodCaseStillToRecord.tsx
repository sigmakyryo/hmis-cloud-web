"use client";

import { ArrowRight, Plus } from "lucide-react";

import type { IodActionId, StillToRecord } from "@/features/occupational-health/iod-case/iod-case.actions";

/** What the case still needs, one step each. Nothing is shown once the case is complete or closed. */
export function IodCaseStillToRecord({
  items,
  onAction,
  onOpenTab,
}: {
  items: StillToRecord[];
  onAction: (action: IodActionId) => void;
  onOpenTab: (tab: "notifications") => void;
}) {
  if (items.length === 0) return null;

  return (
    <section aria-label="Still to record" data-testid="oh-iod-still-to-record" className="mb-2 border-b border-dash-border/80 pb-6">
      <h2 className="mb-1 text-[13px] font-semibold text-brand-navy">
        Still to record <span className="font-normal text-brand-muted tabular-nums">{items.length}</span>
      </h2>
      <ul>
        {items.map((entry) => (
          <li key={entry.key} className="border-b border-dash-border/60 last:border-b-0">
            <button
              type="button"
              data-testid="oh-iod-todo"
              onClick={() => (entry.action ? onAction(entry.action) : entry.tab ? onOpenTab(entry.tab) : undefined)}
              className="group flex w-full items-center gap-3 py-2.5 text-left focus-visible:outline-none"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-brand-navy group-hover:text-brand-primary group-focus-visible:underline">{entry.label}</span>
                <span className="block truncate text-[12.5px] text-brand-muted">{entry.detail}</span>
              </span>
              <span className="inline-flex shrink-0 items-center gap-1 text-[13px] font-medium text-brand-primary">
                {entry.action ? <Plus className="size-3.5" aria-hidden /> : null}
                {entry.action ? "Record" : "Open"}
                {entry.tab ? <ArrowRight className="size-3.5" aria-hidden /> : null}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
