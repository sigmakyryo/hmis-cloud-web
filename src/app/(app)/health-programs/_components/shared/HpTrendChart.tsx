"use client";

import type { HpResult } from "@/features/occupational-health/services/health-programs.service";
import { fmtDate } from "@/app/(app)/fitness/_components/shared/fit-format";
import { trendValue } from "./hp-format";

/** Small dependency-free line chart (one or two series) for a worker's trend. */
export function HpTrendChart({ results }: { results: HpResult[] }) {
  const points = results.map((r) => ({ r, ...trendValue(r) })).filter((p) => p.value != null);
  if (points.length < 2) {
    return <p className="text-[13px] text-dash-muted">A trend appears after two results.</p>;
  }
  const W = 520;
  const H = 160;
  const pad = 28;
  const all = points.flatMap((p) => [p.value as number, ...(p.second != null ? [p.second] : [])]);
  const min = Math.min(...all);
  const max = Math.max(...all);
  const span = max - min || 1;
  const x = (i: number) => pad + (i * (W - pad * 2)) / (points.length - 1);
  const y = (v: number) => H - pad - ((v - min) / span) * (H - pad * 2);
  const line = (key: "value" | "second") =>
    points
      .map((p, i) => (p[key] != null ? `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p[key] as number).toFixed(1)}` : ""))
      .join(" ");
  const first = points[0];
  return (
    <figure className="space-y-1" data-testid="oh-hp-trend-chart">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`${first.label} over time`}>
        <line x1={pad} x2={W - pad} y1={H - pad} y2={H - pad} stroke="currentColor" className="text-dash-border" />
        <path d={line("value")} fill="none" stroke="currentColor" strokeWidth={2} className="text-brand-primary" />
        {points.some((p) => p.second != null) ? (
          <path d={line("second")} fill="none" stroke="currentColor" strokeWidth={2} strokeDasharray="4 3" className="text-amber-600" />
        ) : null}
        {points.map((p, i) => (
          <circle key={p.r.uuid} cx={x(i)} cy={y(p.value as number)} r={3} className="fill-brand-primary" />
        ))}
        <text x={pad} y={14} className="fill-dash-muted text-[11px]">
          {max}
        </text>
        <text x={pad} y={H - 6} className="fill-dash-muted text-[11px]">
          {fmtDate(points[0].r.performed_at)}
        </text>
        <text x={W - pad} y={H - 6} textAnchor="end" className="fill-dash-muted text-[11px]">
          {fmtDate(points[points.length - 1].r.performed_at)}
        </text>
      </svg>
      <figcaption className="flex gap-4 text-[12px] text-dash-muted">
        <span className="text-brand-primary">— {first.label}</span>
        {first.secondLabel ? <span className="text-amber-600">- - {first.secondLabel}</span> : null}
      </figcaption>
    </figure>
  );
}
