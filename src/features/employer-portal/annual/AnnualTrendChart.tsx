"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type TrendPoint = { year: string; value: number | null };

/** Line across the years. A year with no number (suppressed or missing) leaves a gap instead of a false zero. */
export default function AnnualTrendChart({ data, accent, label }: { data: TrendPoint[]; accent: string; label: string }) {
  return (
    <div className="h-[260px] w-full" role="img" aria-label={`${label} by year`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 16, bottom: 4, left: 0 }}>
          <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 4" vertical />
          <XAxis dataKey="year" padding={{ left: 24, right: 24 }} tickLine={false} axisLine={false} tick={{ fill: "#9ca3af", fontSize: 12 }} />
          <YAxis orientation="right" tickLine={false} axisLine={false} width={44} allowDecimals={false} tick={{ fill: "#9ca3af", fontSize: 12 }} />
          <Tooltip
            cursor={{ stroke: "#d1d5db" }}
            formatter={(value) => [typeof value === "number" ? value.toLocaleString() : "—", label]}
            contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", boxShadow: "0 8px 24px rgba(15,23,42,0.08)", fontSize: 13 }}
          />
          <Line type="linear" dataKey="value" stroke={accent} strokeWidth={2} dot={{ r: 3, fill: accent, strokeWidth: 0 }} activeDot={{ r: 5 }} connectNulls={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
