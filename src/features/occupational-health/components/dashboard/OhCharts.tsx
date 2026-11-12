"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { OH_COLORS } from "@/features/occupational-health/components/dashboard/oh-dashboard-colors";
import { cn } from "@/lib/utils";

const AXIS_TICK = { fontSize: 11 };

/** A chart with a screen-reader summary; the visual chart is decorative for assistive tech. */
function ChartFigure({ label, summary, className, children }: { label: string; summary: string; className?: string; children: React.ReactNode }) {
  return (
    <figure className={cn("m-0 min-w-0", className)} aria-label={label}>
      <div aria-hidden>{children}</div>
      <figcaption className="sr-only">{summary}</figcaption>
    </figure>
  );
}

// ---- Compliance trend: completed vs open bars with the compliance-rate line ----------------

export type OhTrendPoint = { label: string; completed: number; open: number; rate: number | null };

const trendConfig = {
  completed: { label: "Completed", color: OH_COLORS.completed },
  open: { label: "Still open", color: OH_COLORS.due },
  rate: { label: "Compliance %", color: OH_COLORS.primary },
} satisfies ChartConfig;

export function OhComplianceTrendChart({ data, height = 260 }: { data: OhTrendPoint[]; height?: number }) {
  const summary = data
    .map((p) => `${p.label}: ${p.completed} completed, ${p.open} open${p.rate === null ? "" : `, ${p.rate}% compliant`}`)
    .join("; ");
  return (
    <ChartFigure label="Compliance by month due" summary={summary}>
      <ChartContainer config={trendConfig} className="w-full min-w-0" style={{ height }}>
        <ComposedChart accessibilityLayer data={data} margin={{ top: 8, right: 4, left: -12, bottom: 0 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} tick={AXIS_TICK} minTickGap={8} />
          <YAxis yAxisId="count" allowDecimals={false} tickLine={false} axisLine={false} tick={AXIS_TICK} width={40} />
          <YAxis yAxisId="rate" orientation="right" domain={[0, 100]} tickLine={false} axisLine={false} tick={AXIS_TICK} width={36} unit="%" />
          <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
          <ChartLegend content={<ChartLegendContent />} />
          <Bar yAxisId="count" dataKey="completed" stackId="due" fill="var(--color-completed)" radius={[0, 0, 0, 0]} maxBarSize={28} />
          <Bar yAxisId="count" dataKey="open" stackId="due" fill="var(--color-open)" radius={[4, 4, 0, 0]} maxBarSize={28} />
          <Line yAxisId="rate" dataKey="rate" type="monotone" stroke="var(--color-rate)" strokeWidth={2} dot={{ r: 2.5 }} connectNulls />
        </ComposedChart>
      </ChartContainer>
    </ChartFigure>
  );
}

// ---- Horizontal stacked bars: due vs overdue per category ----------------------------------

export type OhBreakdownDatum = { key: string; due: number; overdue: number };

const breakdownConfig = {
  overdue: { label: "Overdue", color: OH_COLORS.overdue },
  due: { label: "Due", color: OH_COLORS.due },
} satisfies ChartConfig;

function truncate(text: string, max = 18) {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/** Single-line category tick (recharts wraps long labels by default). */
function CategoryTick({ x, y, payload, max = 18 }: { x?: number | string; y?: number | string; payload?: { value?: unknown }; max?: number }) {
  const text = String(payload?.value ?? "");
  return (
    <text x={Number(x)} y={Number(y)} dy={4} textAnchor="end" fontSize={11} className="fill-muted-foreground">
      <title>{text}</title>
      {truncate(text, max)}
    </text>
  );
}

export function OhBreakdownBars({ data, label, max = 8 }: { data: OhBreakdownDatum[]; label: string; max?: number }) {
  const rows = data.slice(0, max);
  const height = Math.max(120, rows.length * 34 + 40);
  const summary = rows.map((r) => `${r.key}: ${r.overdue} overdue, ${r.due} due`).join("; ");
  return (
    <ChartFigure label={label} summary={summary}>
      <ChartContainer config={breakdownConfig} className="w-full min-w-0" style={{ height }}>
        <BarChart accessibilityLayer data={rows} layout="vertical" margin={{ top: 0, right: 12, left: 4, bottom: 0 }} barCategoryGap={8}>
          <CartesianGrid horizontal={false} />
          <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} tick={AXIS_TICK} />
          <YAxis
            type="category"
            dataKey="key"
            tickLine={false}
            axisLine={false}
            width={118}
            tick={<CategoryTick max={18} />}
            interval={0}
          />
          <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
          <ChartLegend content={<ChartLegendContent />} />
          <Bar dataKey="overdue" stackId="open" fill="var(--color-overdue)" maxBarSize={18} />
          <Bar dataKey="due" stackId="open" fill="var(--color-due)" radius={[0, 4, 4, 0]} maxBarSize={18} />
        </BarChart>
      </ChartContainer>
    </ChartFigure>
  );
}

// ---- Simple coloured columns ---------------------------------------------------------------

export type OhColumnDatum = { key: string; label: string; value: number; color?: string };

export function OhColumnChart({
  data,
  label,
  height = 220,
  color = OH_COLORS.primary,
  horizontal = false,
  valueLabel = "Count",
}: {
  data: OhColumnDatum[];
  label: string;
  height?: number;
  color?: string;
  horizontal?: boolean;
  valueLabel?: string;
}) {
  const config = { value: { label: valueLabel, color } } satisfies ChartConfig;
  const summary = data.map((d) => `${d.label}: ${d.value}`).join("; ");
  const h = horizontal ? Math.max(120, data.length * 32 + 24) : height;
  return (
    <ChartFigure label={label} summary={summary}>
      <ChartContainer config={config} className="w-full min-w-0" style={{ height: h }}>
        {horizontal ? (
          <BarChart accessibilityLayer data={data} layout="vertical" margin={{ top: 0, right: 12, left: 4, bottom: 0 }} barCategoryGap={8}>
            <CartesianGrid horizontal={false} />
            <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} tick={AXIS_TICK} />
            <YAxis type="category" dataKey="label" tickLine={false} axisLine={false} width={130} tick={<CategoryTick max={20} />} interval={0} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel={false} indicator="dot" />} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={18}>
              {data.map((d) => (
                <Cell key={d.key} fill={d.color ?? color} />
              ))}
            </Bar>
          </BarChart>
        ) : (
          <BarChart accessibilityLayer data={data} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} tick={AXIS_TICK} interval={0} tickFormatter={(v: string) => truncate(String(v), 12)} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={AXIS_TICK} width={40} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={40}>
              {data.map((d) => (
                <Cell key={d.key} fill={d.color ?? color} />
              ))}
            </Bar>
          </BarChart>
        )}
      </ChartContainer>
    </ChartFigure>
  );
}

// ---- Donut with an HTML legend (values and shares) ------------------------------------------

export type OhDonutDatum = { key: string; label: string; value: number; color: string };

export function OhDonutChart({
  data,
  label,
  centerValue,
  centerLabel,
  size = 180,
  stacked = false,
}: {
  data: OhDonutDatum[];
  label: string;
  centerValue?: string;
  centerLabel?: string;
  size?: number;
  /** Always put the legend under the ring (for narrow panels). */
  stacked?: boolean;
}) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const config = Object.fromEntries(data.map((d) => [d.key, { label: d.label, color: d.color }])) satisfies ChartConfig;
  const summary = data.map((d) => `${d.label}: ${d.value}`).join("; ");
  return (
    <div className={stacked ? "flex flex-col items-center gap-4" : "flex flex-col items-center gap-4 sm:flex-row sm:items-center"}>
      <ChartFigure label={label} summary={summary} className="relative shrink-0">
        <ChartContainer config={config} style={{ width: size, height: size }}>
          <PieChart accessibilityLayer>
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel nameKey="key" />} />
            <Pie data={data} dataKey="value" nameKey="key" innerRadius={size * 0.32} outerRadius={size * 0.48} paddingAngle={data.length > 1 ? 2 : 0} strokeWidth={0}>
              {data.map((d) => (
                <Cell key={d.key} fill={d.color} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        {centerValue ? (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-semibold tabular-nums text-brand-navy">{centerValue}</span>
            {centerLabel ? <span className="text-[11px] text-dash-muted">{centerLabel}</span> : null}
          </div>
        ) : null}
      </ChartFigure>
      <ul className="w-full min-w-0 space-y-1.5 text-[13px]">
        {data.map((d) => (
          <li key={d.key} className="flex items-center gap-2">
            <span className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: d.color }} aria-hidden />
            <span className="min-w-0 flex-1 truncate text-brand-slate">{d.label}</span>
            <span className="tabular-nums font-medium text-brand-navy">{d.value}</span>
            <span className="w-10 text-right tabular-nums text-dash-muted">{total ? `${Math.round((100 * d.value) / total)}%` : "—"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---- Multi-series line (year-over-year) ----------------------------------------------------

export type OhLineSeries = { key: string; label: string; color: string };

export function OhLineTrendChart({
  data,
  series,
  xKey,
  label,
  height = 240,
}: {
  data: Array<Record<string, string | number | null>>;
  series: OhLineSeries[];
  xKey: string;
  label: string;
  height?: number;
}) {
  const config = Object.fromEntries(series.map((s) => [s.key, { label: s.label, color: s.color }])) satisfies ChartConfig;
  const summary = data
    .map((row) => `${row[xKey]}: ${series.map((s) => `${s.label} ${row[s.key] ?? "not shown"}`).join(", ")}`)
    .join("; ");
  return (
    <ChartFigure label={label} summary={summary}>
      <ChartContainer config={config} className="w-full min-w-0" style={{ height }}>
        <LineChart accessibilityLayer data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey={xKey} tickLine={false} axisLine={false} tickMargin={8} tick={AXIS_TICK} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={AXIS_TICK} width={44} />
          <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
          <ChartLegend content={<ChartLegendContent />} />
          {series.map((s) => (
            <Line key={s.key} dataKey={s.key} type="monotone" stroke={`var(--color-${s.key})`} strokeWidth={2} dot={{ r: 3 }} connectNulls={false} />
          ))}
        </LineChart>
      </ChartContainer>
    </ChartFigure>
  );
}

// ---- Stacked columns over a category axis (e.g. months) -------------------------------------

export function OhStackedColumns({
  data,
  series,
  xKey,
  label,
  height = 220,
}: {
  data: Array<Record<string, string | number>>;
  series: OhLineSeries[];
  xKey: string;
  label: string;
  height?: number;
}) {
  const config = Object.fromEntries(series.map((s) => [s.key, { label: s.label, color: s.color }])) satisfies ChartConfig;
  const summary = data.map((row) => `${row[xKey]}: ${series.map((s) => `${s.label} ${row[s.key] ?? 0}`).join(", ")}`).join("; ");
  return (
    <ChartFigure label={label} summary={summary}>
      <ChartContainer config={config} className="w-full min-w-0" style={{ height }}>
        <BarChart accessibilityLayer data={data} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey={xKey} tickLine={false} axisLine={false} tickMargin={8} tick={AXIS_TICK} minTickGap={6} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={AXIS_TICK} width={40} />
          <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
          <ChartLegend content={<ChartLegendContent />} />
          {series.map((s, i) => (
            <Bar key={s.key} dataKey={s.key} stackId="stack" fill={`var(--color-${s.key})`} radius={i === series.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} maxBarSize={32} />
          ))}
        </BarChart>
      </ChartContainer>
    </ChartFigure>
  );
}
