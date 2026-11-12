"use client";

import type { LucideIcon } from "lucide-react";
import { CircleAlert, Info, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

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

/** Initials for a person's name ("Dr Ada Banda" → "AB"). */
export function personInitials(name: string): string {
  const words = name
    .replace(/^(dr|mr|mrs|ms|prof)\.?\s+/i, "")
    .split(/\s+/)
    .filter(Boolean);
  const letters = words.length > 1 ? [words[0], words[words.length - 1]] : words;
  return letters.map((word) => word[0]?.toUpperCase() ?? "").join("") || "?";
}
