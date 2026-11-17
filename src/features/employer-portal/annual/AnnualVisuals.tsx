import type { ReactNode } from "react";

import { shareOf, type Slice } from "@/features/employer-portal/annual/annual-dashboard";

export const SLICE_COLORS = ["#f26a1b", "#f5b82e", "#2dd4bf", "#8b5cf6", "#ef4444", "#94a3b8"];

export function sliceColor(index: number, accent: string): string {
  return index === 0 ? accent : SLICE_COLORS[(index % (SLICE_COLORS.length - 1)) + 1];
}

/** Card with a title, an optional big figure and a body, in the dashboard's flat style. */
export function AnnualCard({ title, figure, note, children }: { title: string; figure?: string; note?: string; children: ReactNode }) {
  return (
    <section className="min-w-0 py-6">
      <h2 className="text-[15px] text-neutral-700">{title}</h2>
      {figure ? (
        <p className="mt-1 flex flex-wrap items-baseline gap-x-2">
          <span className="text-[28px] leading-9 font-medium tracking-tight text-neutral-900 tabular-nums">{figure}</span>
          {note ? <span className="text-[12px] text-neutral-400">{note}</span> : null}
        </p>
      ) : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function SliceLegend({ slices, accent }: { slices: Slice[]; accent: string }) {
  return (
    <ul className="space-y-2.5 text-[14px]">
      {slices.map((slice, index) => (
        <li key={slice.label} className="flex items-center gap-2.5">
          <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: sliceColor(index, accent) }} aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate text-neutral-800">{slice.label}</span>
          <span className="tabular-nums text-neutral-900">{slice.display}</span>
          <span className="w-10 text-right tabular-nums text-neutral-400">{shareOf(slice.value, slices)}%</span>
        </li>
      ))}
    </ul>
  );
}

/** One bar split into coloured parts, widest first. */
export function SegmentBar({ slices, accent, label }: { slices: Slice[]; accent: string; label: string }) {
  return (
    <div role="img" aria-label={label} className="flex h-2.5 gap-1 overflow-hidden rounded-full">
      {slices.map((slice, index) => (
        <span key={slice.label} className="h-full rounded-full" style={{ flexGrow: slice.value, backgroundColor: sliceColor(index, accent) }} />
      ))}
    </div>
  );
}

/** Ring made of arcs. No chart library: it is a few circles. */
export function Donut({ slices, accent, label }: { slices: Slice[]; accent: string; label: string }) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <svg viewBox="0 0 100 100" className="size-28 shrink-0 -rotate-90" role="img" aria-label={label}>
      <circle cx="50" cy="50" r={radius} fill="none" stroke="#f3f4f6" strokeWidth="11" />
      {total > 0
        ? slices.map((slice, index) => {
            const length = (slice.value / total) * circumference;
            const arc = (
              <circle
                key={slice.label}
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke={sliceColor(index, accent)}
                strokeWidth="11"
                strokeDasharray={`${Math.max(length - 1.5, 0)} ${circumference}`}
                strokeDashoffset={-offset}
                strokeLinecap="round"
              />
            );
            offset += length;
            return arc;
          })
        : null}
    </svg>
  );
}
