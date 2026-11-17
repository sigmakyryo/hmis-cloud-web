"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

import { PortalIcon, type PortalIconSvg } from "@/features/employer-portal/components/PortalIcon";

import { cn } from "@/lib/utils";

/** Accent comes from the clinic's branding through `--portal-accent`, set by the shell. */
const ACCENT = "var(--portal-accent, #2f55e8)";

export function PortalPage({ children, testId }: { children: ReactNode; testId?: string }) {
  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 pt-5 pb-10 sm:px-6 lg:px-10" data-testid={testId}>
      {children}
    </div>
  );
}

/** Round icon, title and subtitle on the left, page actions on the right. */
export function PortalPageHeader({ icon, title, subtitle, actions }: { icon: PortalIconSvg; title: string; subtitle: string; actions?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200/80 pb-5">
      <div className="flex min-w-0 items-center gap-3.5">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-600">
          <PortalIcon icon={icon} size={22} />
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-[19px] leading-6 font-medium text-neutral-900">{title}</h1>
          <p className="truncate text-[14px] text-neutral-500">{subtitle}</p>
        </div>
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export type PortalStat = { label: string; value: string; note?: string; tone?: "good" | "bad" | "muted" };

/** Figures in a row with hairline dividers, like the dashboard reference. */
export function PortalStatStrip({ stats, loading }: { stats: PortalStat[]; loading?: boolean }) {
  return (
    <dl className="grid grid-cols-2 gap-y-5 border-b border-dashed border-neutral-200 py-5 sm:grid-cols-3 lg:flex lg:gap-0" data-testid="portal-stats">
      {stats.map((stat, index) => (
        <div key={stat.label} className={cn("min-w-0 lg:flex-1 lg:px-6", index === 0 ? "lg:pl-0" : "lg:border-l lg:border-neutral-200/80")}>
          <dt className="text-[14px] text-neutral-700">{stat.label}</dt>
          <dd className="mt-1 flex flex-wrap items-baseline gap-x-2">
            {loading ? (
              <span className="block h-8 w-14 animate-pulse rounded bg-neutral-100" />
            ) : (
              <>
                <span className="text-[28px] leading-9 font-medium tracking-tight text-neutral-900 tabular-nums">{stat.value}</span>
                {stat.note ? (
                  <span className={cn("text-[12px]", stat.tone === "good" && "text-emerald-600", stat.tone === "bad" && "text-red-600", (!stat.tone || stat.tone === "muted") && "text-neutral-400")}>
                    {stat.note}
                  </span>
                ) : null}
              </>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function PortalToolbar({ children, trailing }: { children?: ReactNode; trailing?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-4">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">{children}</div>
      {trailing ? <div className="flex items-center gap-2">{trailing}</div> : null}
    </div>
  );
}

type PillProps = ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean; count?: number };

export function PortalPill({ active, count, className, children, ...button }: PillProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-[13px] transition-colors",
        active ? "border-transparent text-white" : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50",
        className,
      )}
      style={active ? { backgroundColor: ACCENT } : undefined}
      {...button}
    >
      {children}
      {count != null ? <span className={cn("tabular-nums", active ? "text-white/80" : "text-neutral-400")}>{count}</span> : null}
    </button>
  );
}

export function PortalSearch({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <input
      type="search"
      aria-label={label}
      placeholder={placeholder}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-9 w-full max-w-[280px] min-w-[180px] flex-1 rounded-lg border border-neutral-200 bg-white px-3 text-[13px] text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-neutral-400"
    />
  );
}

export function PortalPrimaryButton({ className, ...button }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn("inline-flex h-10 items-center gap-2 rounded-xl px-4 text-[14px] font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] transition hover:brightness-105 disabled:opacity-60", className)}
      style={{ backgroundColor: ACCENT }}
      {...button}
    />
  );
}

export type PillTone = "good" | "warn" | "bad" | "neutral";
const TONE_DOT: Record<PillTone, string> = { good: "bg-emerald-500", warn: "bg-amber-500", bad: "bg-red-500", neutral: "bg-neutral-400" };

export function PortalStatusPill({ tone, children }: { tone: PillTone; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-neutral-200 bg-white px-2 py-1 text-[12px] text-neutral-700">
      <span className={cn("size-2 rounded-full", TONE_DOT[tone])} aria-hidden="true" />
      {children}
    </span>
  );
}

/** Soft gray header band, hairline rows, no outer box. */
export function PortalTable({ columns, children, testId }: { columns: string[]; children: ReactNode; testId?: string }) {
  return (
    <div className="overflow-x-auto" data-testid={testId}>
      <table className="w-full min-w-[640px] border-separate border-spacing-0 text-left text-[14px]">
        <thead>
          <tr className="bg-neutral-100/80 text-[13px] text-neutral-500">
            {columns.map((column, index) => (
              <th key={column} scope="col" className={cn("px-4 py-2.5 font-normal", index === 0 && "rounded-l-lg", index === columns.length - 1 && "rounded-r-lg")}>
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function PortalRow({ children, testId }: { children: ReactNode; testId?: string }) {
  return (
    <tr data-testid={testId} className="[&>td]:border-b [&>td]:border-neutral-200/70 hover:bg-neutral-50/60">
      {children}
    </tr>
  );
}

export function PortalCell({ children, className }: { children?: ReactNode; className?: string }) {
  return <td className={cn("px-4 py-3.5 align-middle text-neutral-800", className)}>{children}</td>;
}

export function PortalPerson({ title, detail }: { title: string; detail?: string }) {
  const initials = title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-[12px] font-medium text-neutral-600" aria-hidden="true">
        {initials || "?"}
      </span>
      <div className="min-w-0">
        <p className="truncate text-neutral-900">{title}</p>
        {detail ? <p className="truncate text-[12px] text-neutral-500">{detail}</p> : null}
      </div>
    </div>
  );
}

export function PortalTableSkeleton({ columns = 5, rows = 6 }: { columns?: number; rows?: number }) {
  return (
    <div className="space-y-2" role="status" aria-label="Loading">
      <div className="h-10 animate-pulse rounded-lg bg-neutral-100" />
      {Array.from({ length: rows }, (_, row) => (
        <div key={row} className="flex items-center gap-4 border-b border-neutral-100 px-4 py-3.5">
          {Array.from({ length: columns }, (_, col) => (
            <span key={col} className={cn("h-4 animate-pulse rounded bg-neutral-100", col === 0 ? "w-1/4" : "w-[14%]")} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function PortalEmpty({ icon, title, description }: { icon: PortalIconSvg; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-16 text-center">
      <span className="flex size-11 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500">
        <PortalIcon icon={icon} size={22} />
      </span>
      <p className="text-[15px] font-medium text-neutral-900">{title}</p>
      <p className="max-w-sm text-[13px] text-neutral-500">{description}</p>
    </div>
  );
}

export function PortalFootnote({ children }: { children: ReactNode }) {
  return <p className="pt-4 text-[12px] text-neutral-400">{children}</p>;
}
