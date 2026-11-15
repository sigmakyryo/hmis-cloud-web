"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { createContext, createElement, useContext, type ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import type { OhFamilyModule } from "@/features/app-shell/constants/navigation-config";
import { OH_MODULE_ACCENT, OH_MODULE_ICON } from "@/features/occupational-health/lib/oh-module-visuals";
import { cn } from "@/lib/utils";

/** Which module a view belongs to, so its panels pick up the module's colour. */
export const OhViewModuleContext = createContext<OhFamilyModule>("OccupationalHealth");

/** A block of a module view: a small inline heading (module-coloured icon, name, count) and one link. */
export function ViewSection({
  title,
  count,
  countLabel,
  href,
  linkLabel,
  action,
  icon,
  children,
  testId,
}: {
  title: string;
  count?: number;
  /** What the count is, read out after the number (e.g. "open cases"). */
  countLabel?: string;
  href?: string;
  linkLabel?: string;
  action?: ReactNode;
  icon?: LucideIcon;
  children: ReactNode;
  testId?: string;
}) {
  const ohModule = useContext(OhViewModuleContext);

  return (
    <section className="min-w-0" data-testid={testId}>
      <div className="mb-3 flex min-h-8 flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h3 className="flex min-w-0 items-center gap-2 text-[14.5px] font-semibold text-brand-navy">
          {createElement(icon ?? OH_MODULE_ICON[ohModule], { className: cn("size-4 shrink-0", OH_MODULE_ACCENT[ohModule].icon), "aria-hidden": true })}
          <span className="truncate">{title}</span>
          {count !== undefined ? (
            <span className="font-normal text-dash-muted tabular-nums" data-testid="oh-home-section-count">
              {count}
              {countLabel ? <span className="sr-only"> {countLabel}</span> : null}
            </span>
          ) : null}
        </h3>
        {action ??
          (href ? (
            <Link href={href} className="text-[13px] font-medium text-brand-primary hover:underline">
              {linkLabel ?? "Open"}
            </Link>
          ) : null)}
      </div>
      <div className="@container">{children}</div>
    </section>
  );
}

/** Loading rows, or a retry line, until the data is there. */
export function QueryState({
  isLoading,
  isError,
  onRetry,
  rows = 3,
  children,
}: {
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  rows?: number;
  children: ReactNode;
}) {
  if (isLoading) {
    return (
      <div className="space-y-2.5" aria-busy="true">
        {Array.from({ length: rows }, (_, index) => (
          <Skeleton key={index} className="h-7 w-full" />
        ))}
      </div>
    );
  }
  if (isError) {
    return (
      <p className="text-[13.5px] text-dash-muted" role="alert">
        Could not load this.{" "}
        <button type="button" className="font-medium text-brand-primary hover:underline" onClick={onRetry}>
          Try again
        </button>
      </p>
    );
  }
  return children;
}

/** One line of work: how many, what they are, and when. */
export function TodoRow({
  value,
  label,
  hint,
  href,
  alert = false,
}: {
  value: number;
  label: string;
  hint?: string;
  href: string;
  alert?: boolean;
}) {
  return (
    <li className="border-b border-dash-border/70 last:border-b-0">
      <Link href={href} data-testid="oh-home-todo" className="group flex items-center gap-3 py-2.5 focus-visible:outline-none">
        <span
          className={cn(
            "inline-flex h-6 min-w-9 items-center justify-center rounded-md px-1.5 text-[12.5px] font-semibold tabular-nums",
            alert && value > 0 ? "bg-red-50 text-red-700" : value > 0 ? "bg-dash-canvas text-brand-navy" : "bg-dash-canvas/60 text-dash-muted",
          )}
        >
          {value}
        </span>
        <span className="min-w-0 flex-1 truncate text-[14px] text-brand-navy group-hover:text-brand-primary group-focus-visible:underline">{label}</span>
        {hint ? <span className="shrink-0 text-[12.5px] text-dash-muted">{hint}</span> : null}
      </Link>
    </li>
  );
}

/** A thin proportional bar. The width is data, so it is the one place a style is set directly. */
export function Meter({ percent, className, label }: { percent: number; className?: string; label: string }) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(clamped)} className="h-1.5 overflow-hidden rounded-full bg-dash-canvas">
      <div className={cn("h-full rounded-full", className ?? "bg-brand-primary")} style={{ width: `${clamped}%` }} />
    </div>
  );
}

/** A named share: name, bar, percentage, and a short note. Stacks the bar under the name when narrow. */
export function ShareRow({
  name,
  percent,
  note,
  tone,
  alertNote = false,
  valueLabel,
}: {
  name: string;
  percent: number;
  /** Shown instead of the percentage, for rows that compare counts. */
  valueLabel?: string;
  note: string;
  tone: string;
  alertNote?: boolean;
}) {
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-5 gap-y-1.5 border-b border-dash-border/70 py-2.5 last:border-b-0 @xl:grid-cols-[minmax(0,12rem)_minmax(0,1fr)_3rem_11rem]">
      <span className="truncate text-[14px] text-brand-navy">{name}</span>
      <span className="col-span-2 row-start-2 @xl:col-span-1 @xl:row-start-auto">
        <Meter percent={percent} label={valueLabel ? `${name}: ${valueLabel}` : `${name}: ${Math.round(percent)}%`} className={tone} />
      </span>
      <span className="text-right text-[13.5px] font-semibold text-brand-navy tabular-nums">{valueLabel ?? `${Math.round(percent)}%`}</span>
      <span className={cn("hidden text-right text-[12.5px] whitespace-nowrap @xl:block", alertNote ? "font-medium text-red-700" : "text-dash-muted")}>{note}</span>
    </li>
  );
}

/** Figures that belong together, side by side in one outlined strip. */
export function FigureStrip({ children, testId }: { children: ReactNode; testId?: string }) {
  return (
    <div data-testid={testId} className="grid grid-cols-2 gap-y-4 @2xl:auto-cols-fr @2xl:grid-flow-col @2xl:grid-cols-none @2xl:divide-x @2xl:divide-dash-border">
      {children}
    </div>
  );
}

export function StripCell({
  label,
  value,
  hint,
  href,
  alert = false,
  icon,
  testId,
}: {
  label: string;
  value: number;
  hint?: string;
  href: string;
  alert?: boolean;
  icon?: ReactNode;
  testId?: string;
}) {
  return (
    <Link
      href={href}
      data-testid={testId}
      className="group block py-1 pr-4 focus-visible:outline-none @2xl:px-5 @2xl:first:pl-0"
    >
      <span className="flex items-center gap-2 text-[13px] font-medium text-brand-slate group-hover:text-brand-primary group-focus-visible:underline">
        {icon}
        {label}
      </span>
      <span className="mt-3 block text-[28px] leading-none font-semibold tracking-tight text-brand-navy tabular-nums">{value}</span>
      {hint ? <span className={cn("mt-1.5 block text-[12.5px]", alert ? "font-medium text-red-700" : "text-dash-muted")}>{hint}</span> : null}
    </Link>
  );
}
