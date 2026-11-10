"use client";

import type { ReactNode } from "react";

import { DetailPageTabNavItem } from "@/features/app-shell/components/page-layout";

export type ImmTab<Key extends string> = {
  key: Key;
  label: string;
  count?: number;
};

/** Record tabs with counts on the left and the page actions on the right. */
export function ImmTabsBar<Key extends string>({
  tabs,
  active,
  onChange,
  actions,
  label,
  testId,
}: {
  tabs: ImmTab<Key>[];
  active: Key;
  onChange: (key: Key) => void;
  actions?: ReactNode;
  label: string;
  testId?: string;
}) {
  return (
    <div
      data-list-band
      data-testid={testId}
      className="flex min-h-11 items-center justify-between gap-3 border-b border-dash-border/80 bg-white pr-3 sm:pr-4"
    >
      <nav className="scrollbar-hide flex min-w-0 gap-0.5 overflow-x-auto px-3 sm:px-5" aria-label={label}>
        {tabs.map((tab) => (
          <DetailPageTabNavItem key={tab.key} isActive={tab.key === active} onClick={() => onChange(tab.key)}>
            {tab.label}
            {tab.count != null ? (
              <span className="ml-1.5 text-[12px] tabular-nums text-dash-muted">{tab.count}</span>
            ) : null}
          </DetailPageTabNavItem>
        ))}
      </nav>
      {actions ? <div className="flex shrink-0 items-center gap-2 py-1.5">{actions}</div> : null}
    </div>
  );
}

/** Filters row under the tabs, same band as the clients toolbar. */
export function ImmFilterBar({ children, trailing }: { children: ReactNode; trailing?: ReactNode }) {
  return (
    <div
      data-list-band
      className="flex flex-wrap items-end justify-between gap-3 border-b border-dash-border/80 bg-white px-4 py-2.5 md:px-6"
    >
      <div className="flex flex-wrap items-end gap-2">{children}</div>
      {trailing ? <div className="flex items-center gap-2">{trailing}</div> : null}
    </div>
  );
}

/** One-line notice band for results such as "Task assigned". */
export function ImmNotice({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "warning" }) {
  return (
    <p
      data-list-band
      role="status"
      className={
        tone === "warning"
          ? "border-b border-amber-200 bg-amber-50 px-4 py-2 text-[13px] text-amber-900 md:px-6"
          : "border-b border-dash-border/80 bg-dash-canvas/40 px-4 py-2 text-[13px] text-brand-slate md:px-6"
      }
    >
      {children}
    </p>
  );
}
