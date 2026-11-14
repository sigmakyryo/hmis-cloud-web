"use client";

import { CartesianGrid, ReferenceLine, Scatter, ScatterChart, XAxis, YAxis } from "recharts";

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import type { ExposureAssessment, ExposureMeasurement } from "@/features/exposure-management/exposure.types";
import { formatDate, formatNumber } from "@/features/exposure-management/lib/exposure-format";

const config = { value: { label: "Result", color: "var(--color-brand-primary, #2563eb)" } } satisfies ChartConfig;

/** Results over time against the limit used by the latest assessment. Below-LOD points are listed, not plotted as zero. */
export function ExposureSeriesChart({ measurements, assessment }: { measurements: ExposureMeasurement[]; assessment: ExposureAssessment | null }) {
  const points = measurements
    .filter((m) => m.status === "valid" && m.sampled_at && m.normalised_value !== null && !m.below_lod)
    .map((m) => ({ t: new Date(m.sampled_at as string).getTime(), value: m.normalised_value as number, unit: m.normalised_unit }));
  const belowLod = measurements.filter((m) => m.below_lod).length;
  const limit = assessment?.oel_value ?? null;

  if (points.length === 0) {
    return <p className="text-[13px] text-dash-muted">No quantified results yet{belowLod ? ` (${belowLod} below the limit of detection)` : ""}.</p>;
  }
  const summary = points.map((p) => `${formatDate(new Date(p.t).toISOString())}: ${formatNumber(p.value)} ${p.unit}`).join("; ");

  return (
    <figure className="m-0" aria-label="Results over time against the limit">
      <div aria-hidden>
        <ChartContainer config={config} className="h-64 w-full">
          <ScatterChart margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="t" type="number" scale="time" domain={["dataMin", "dataMax"]} tickFormatter={(t: number) => formatDate(new Date(t).toISOString())} tick={{ fontSize: 11 }} />
            <YAxis dataKey="value" type="number" tick={{ fontSize: 11 }} width={48} />
            <ChartTooltip content={<ChartTooltipContent />} />
            {limit !== null ? <ReferenceLine y={limit} stroke="#dc2626" strokeDasharray="4 3" label={{ value: `Limit ${formatNumber(limit)} ${assessment?.oel_unit ?? ""}`, fontSize: 11, fill: "#dc2626", position: "insideTopRight" }} /> : null}
            <Scatter data={points} fill="var(--color-value)" />
          </ScatterChart>
        </ChartContainer>
      </div>
      <figcaption className="sr-only">{summary}</figcaption>
      {belowLod ? <p className="text-[12px] text-dash-muted">{belowLod} result{belowLod === 1 ? "" : "s"} below the limit of detection not plotted.</p> : null}
    </figure>
  );
}
