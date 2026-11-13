"use client";

import type { LucideIcon } from "lucide-react";
import { CircleAlert, Info, TriangleAlert } from "lucide-react";
import { useState, type KeyboardEvent, type ReactNode } from "react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

/**
 * Building blocks of the theatre case flow. The flow deliberately avoids
 * cards: blocks are separated by hairlines and typographic hierarchy, with
 * tinted bands only for things that need attention.
 */

/** One block of a step, separated from the next by a hairline. */
export function FlowBlock({
  title,
  description,
  icon: Icon,
  actions,
  children,
  className,
  "data-testid": testId,
}: {
  title?: string;
  description?: ReactNode;
  icon?: LucideIcon;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  "data-testid"?: string;
}) {
  return (
    <section
      className={cn("border-t border-dash-border/70 py-6 first:border-t-0 first:pt-0", className)}
      data-testid={testId}
    >
      {title ? (
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-2.5">
            {Icon ? (
              <Icon className="mt-0.5 size-4 shrink-0 text-brand-primary" aria-hidden />
            ) : null}
            <div className="min-w-0">
              <h3 className="text-[15px] font-semibold leading-6 text-brand-navy">{title}</h3>
              {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
            </div>
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}

const CALLOUT_TONES = {
  warning: {
    icon: TriangleAlert,
    className:
      "border-amber-400 bg-amber-50/80 text-amber-950 dark:bg-amber-950/30 dark:text-amber-100",
    iconClassName: "text-amber-600",
  },
  danger: {
    icon: CircleAlert,
    className: "border-rose-400 bg-rose-50/80 text-rose-950 dark:bg-rose-950/30 dark:text-rose-100",
    iconClassName: "text-rose-600",
  },
  info: {
    icon: Info,
    className: "border-sky-400 bg-sky-50/70 text-sky-950 dark:bg-sky-950/30 dark:text-sky-100",
    iconClassName: "text-sky-600",
  },
} as const;

/** Inline band with a coloured rule on the left (blockers, notices). */
export function FlowCallout({
  tone = "warning",
  icon,
  title,
  children,
  action,
  className,
  "data-testid": testId,
}: {
  tone?: keyof typeof CALLOUT_TONES;
  icon?: LucideIcon;
  title?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
  "data-testid"?: string;
}) {
  const config = CALLOUT_TONES[tone];
  const Icon = icon ?? config.icon;
  return (
    <div
      role={tone === "info" ? "note" : "status"}
      className={cn(
        "flex flex-wrap items-start gap-x-3 gap-y-2 border-l-2 px-3.5 py-2.5 text-sm",
        config.className,
        className,
      )}
      data-testid={testId}
    >
      <Icon className={cn("mt-0.5 size-4 shrink-0", config.iconClassName)} aria-hidden />
      <div className="min-w-0 flex-1 space-y-0.5">
        {title ? <p className="font-medium">{title}</p> : null}
        {children ? <div className="text-[13px] leading-5 opacity-90">{children}</div> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/** Label / value pairs laid out as a responsive definition list. */
export function FactList({
  items,
  className,
}: {
  items: { label: string; value: ReactNode; icon?: LucideIcon }[];
  className?: string;
}) {
  return (
    <dl className={cn("grid gap-x-8 gap-y-4 text-sm sm:grid-cols-2 xl:grid-cols-3", className)}>
      {items.map(({ label, value, icon: Icon }) => (
        <div key={label} className="min-w-0">
          <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-brand-muted">
            {Icon ? <Icon className="size-3.5" aria-hidden /> : null}
            {label}
          </dt>
          <dd className="mt-1 truncate text-brand-navy">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Right-hand drawer for secondary editing (team, preference card, links). */
export function FlowSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-xl"
        data-testid="theatre-flow-sheet"
      >
        <SheetHeader className="border-b border-dash-border/70 px-6 py-5">
          <SheetTitle className="text-brand-navy">{title}</SheetTitle>
          {description ? <SheetDescription>{description}</SheetDescription> : null}
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </SheetContent>
    </Sheet>
  );
}

export type FlowTab = {
  id: string;
  label: string;
  /** Small count or status shown beside the label. */
  badge?: ReactNode;
  /** Amber dot when something on the tab still needs attention. */
  attention?: boolean;
  panel: ReactNode;
};

/**
 * Underline tabs for grouping blocks on a case-flow step. Inactive panels stay
 * mounted (and hidden) so form state is not lost when switching.
 */
export function FlowTabs({
  "aria-label": ariaLabel,
  tabs,
  defaultTab,
  value,
  onValueChange,
  "data-testid": testId,
}: {
  "aria-label": string;
  tabs: FlowTab[];
  defaultTab?: string;
  /** Controlled selected tab; omit for internal state. */
  value?: string;
  onValueChange?: (id: string) => void;
  "data-testid"?: string;
}) {
  const initial = defaultTab && tabs.some((tab) => tab.id === defaultTab) ? defaultTab : tabs[0]?.id;
  const [uncontrolled, setUncontrolled] = useState(initial);
  const active = value ?? uncontrolled;
  const selected = tabs.some((tab) => tab.id === active) ? active : tabs[0]?.id;
  const prefix = testId ?? "flow-tabs";

  function select(id: string, focus = false) {
    if (value === undefined) setUncontrolled(id);
    onValueChange?.(id);
    if (focus) {
      requestAnimationFrame(() => {
        document.getElementById(`${prefix}-tab-${id}`)?.focus();
      });
    }
  }

  function activate(id: string) {
    select(id, true);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const ids = tabs.map((tab) => tab.id);
    const index = ids.indexOf(selected ?? "");
    if (index < 0) return;
    if (event.key === "ArrowRight") {
      event.preventDefault();
      activate(ids[(index + 1) % ids.length] ?? ids[0]);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      activate(ids[(index - 1 + ids.length) % ids.length] ?? ids[0]);
    } else if (event.key === "Home") {
      event.preventDefault();
      activate(ids[0]);
    } else if (event.key === "End") {
      event.preventDefault();
      activate(ids[ids.length - 1] ?? ids[0]);
    }
  }

  return (
    <section
      className="border-t border-dash-border/70 py-6 first:border-t-0 first:pt-0"
      data-testid={testId}
    >
      <div
        role="tablist"
        aria-label={ariaLabel}
        className="flex flex-wrap gap-x-0.5 border-b border-dash-border/70"
        onKeyDown={onKeyDown}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === selected;
          const tabId = `${prefix}-tab-${tab.id}`;
          const panelId = `${prefix}-panel-${tab.id}`;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={tabId}
              aria-selected={isActive}
              aria-controls={panelId}
              tabIndex={isActive ? 0 : -1}
              data-testid={tabId}
              onClick={() => select(tab.id)}
              className={cn(
                "relative -mb-px inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-2 text-[13px] font-medium outline-none",
                "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-primary/40",
                isActive
                  ? "border-b-2 border-brand-primary text-brand-navy"
                  : "border-b-2 border-transparent text-brand-muted hover:text-brand-navy",
              )}
            >
              {tab.label}
              {tab.badge != null && tab.badge !== false ? (
                <span className="inline-flex min-w-4 items-center justify-center rounded-full bg-muted px-1.5 text-[10px] font-semibold tabular-nums leading-4 text-brand-navy">
                  {tab.badge}
                </span>
              ) : null}
              {tab.attention ? (
                <span
                  className="size-1.5 rounded-full bg-amber-500"
                  aria-label="needs attention"
                />
              ) : null}
            </button>
          );
        })}
      </div>
      {tabs.map((tab) => {
        const isActive = tab.id === selected;
        const tabId = `${prefix}-tab-${tab.id}`;
        const panelId = `${prefix}-panel-${tab.id}`;
        return (
          <div
            key={tab.id}
            role="tabpanel"
            id={panelId}
            aria-labelledby={tabId}
            hidden={!isActive}
            data-testid={panelId}
            className="pt-5"
          >
            {tab.panel}
          </div>
        );
      })}
    </section>
  );
}

/** Initials for a person's name ("Dr Ada Banda" → "AB"). */
export function personInitials(name: string): string {
  const words = name
    .replace(/^(dr|mr|mrs|ms|prof)\.?\s+/i, "")
    .split(/\s+/)
    .filter(Boolean);
  const letters = words.length > 1 ? [words[0], words[words.length - 1]] : words;
  return letters.map((word) => word[0]?.toUpperCase() ?? "").join("") || "?";
}
