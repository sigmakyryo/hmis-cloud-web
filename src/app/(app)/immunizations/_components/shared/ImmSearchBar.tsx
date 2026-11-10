"use client";

import type { ReactNode } from "react";

import { ListPageSearchField } from "@/features/app-shell/components/page-layout";

/** Search plus optional filters under the tabs, with a live "x of y" count. */
export function ImmSearchBar({
  value,
  onChange,
  placeholder,
  matched,
  total,
  filters,
  onClear,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  matched: number;
  total: number;
  filters?: ReactNode;
  onClear?: () => void;
}) {
  const filtered = matched !== total;
  return (
    <div
      data-list-band
      className="flex flex-col gap-2 border-b border-dash-border/80 bg-white px-4 py-2.5 sm:flex-row sm:items-center md:px-6"
    >
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:max-w-sm">
        <ListPageSearchField value={value} placeholder={placeholder} onChange={onChange} onSubmit={() => undefined} />
      </div>
      {filters ? <div className="flex flex-wrap items-center gap-2">{filters}</div> : null}
      <div className="flex items-center gap-3 text-[12px] text-dash-muted sm:ml-auto">
        <span className="tabular-nums" aria-live="polite">
          {filtered ? `${matched} of ${total}` : `${total} record${total === 1 ? "" : "s"}`}
        </span>
        {filtered && onClear ? (
          <button type="button" className="font-medium text-brand-primary hover:underline" onClick={onClear}>
            Clear
          </button>
        ) : null}
      </div>
    </div>
  );
}

/** Compact select used inside the search bar. */
export function ImmFilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 rounded-lg border border-dash-border bg-white px-2.5 text-[13px] text-brand-slate hover:bg-dash-canvas"
    >
      {children}
    </select>
  );
}
