"use client";

import { Area, AreaChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts";

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import type { AnnualChange } from "@/features/occupational-health/components/annual/annual-changes";
import { toNumber } from "@/features/occupational-health/components/annual/annual-utils";
import { OhAnnualCard } from "@/features/occupational-health/components/annual/OhAnnualCard";
import type { AnnualTrendPoint } from "@/features/occupational-health/services/oh-annual-report.service";

type Row = { year: string; value: number | null; shown: string; current: boolean; openable: number | null };
type DotProps = { cx?: number; cy?: number; payload?: Row; index?: number };

const config = { value: { label: "Value", color: "#0b6e6e" } } satisfies ChartConfig;

/**
 * The chosen headline figure year by year as one soft area with every point labelled. This period is a
 * solid dot; earlier years are rings you can click to open. A hidden year ("<5") leaves a gap in the line.
 */
export function OhAnnualTrendPanel({
  change,
  earlier,
  currentLabel,
  onOpenYear,
  className,
}: {
  change: AnnualChange;
  earlier: AnnualTrendPoint[];
  currentLabel: string;
  onOpenYear: (year: number) => void;
  className?: string;
}) {
  const { figure, current } = change;
  const format = (value: unknown) => (value === null || value === undefined || value === "—" ? "–" : figure.percent && toNumber(value) !== null ? `${value}%` : String(value));
  const rows: Row[] = [
    ...earlier.map((point) => ({ year: String(point.year), value: toNumber(point[figure.key]), shown: format(point[figure.key]), current: false, openable: point.year })),
    { year: currentLabel, value: toNumber(current), shown: format(current), current: true, openable: null },
  ];
  const hasData = rows.some((row) => (row.value ?? 0) > 0);

  return (
    <OhAnnualCard
      id="oh-annual-trend-title"
      testId="oh-annual-trend"
      className={className}
      title={`${figure.label} by year`}
      description="Choose a figure above to chart it. Click a ring to open that year."
    >
      {hasData ? (
        <figure className="m-0 min-w-0" aria-label={`${figure.label} by year`}>
          <div aria-hidden>
            <ChartContainer config={config} className="h-72 w-full min-w-0">
              <AreaChart accessibilityLayer data={rows} margin={{ top: 24, right: 24, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="oh-annual-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0b6e6e" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="#0b6e6e" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 4" />
                <XAxis dataKey="year" tickLine={false} axisLine={false} tickMargin={12} tick={{ fontSize: 12, fill: "#6b7280" }} padding={{ left: 28, right: 28 }} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#6b7280" }} width={44} domain={[0, (max: number) => Math.ceil(max * 1.15)]} unit={figure.percent ? "%" : undefined} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideIndicator formatter={(_, __, item) => (item.payload as Row).shown} />} />
                <Area
                  dataKey="value"
                  type="monotone"
                  stroke="#0b6e6e"
                  strokeWidth={2.5}
                  fill="url(#oh-annual-fill)"
                  connectNulls={false}
                  isAnimationActive={false}
                  dot={(props: DotProps) => {
                    const { cx, cy, payload, index } = props;
                    if (cx === undefined || cy === undefined || !payload || payload.value === null) return <g key={`gap-${index}`} />;
                    return payload.current ? (
                      <circle key={payload.year} cx={cx} cy={cy} r={6} fill="#0b6e6e" stroke="#fff" strokeWidth={3} />
                    ) : (
                      <circle key={payload.year} cx={cx} cy={cy} r={5} fill="#fff" stroke="#0b6e6e" strokeWidth={2} className="cursor-pointer" onClick={() => payload.openable && onOpenYear(payload.openable)} />
                    );
                  }}
                  activeDot={false}
                >
                  <LabelList dataKey="value" position="top" offset={12} fontSize={13} fontWeight={600} fill="#1f2a24" formatter={(value: unknown) => (typeof value === "number" ? (figure.percent ? `${value}%` : value) : "")} />
                </Area>
              </AreaChart>
            </ChartContainer>
          </div>
          <figcaption className="sr-only">{rows.map((row) => `${row.year}: ${row.shown}`).join(", ")}</figcaption>
        </figure>
      ) : (
        <p className="flex h-72 items-center justify-center text-[13.5px] text-dash-muted">No {figure.label.toLowerCase()} recorded in these years.</p>
      )}
    </OhAnnualCard>
  );
}
