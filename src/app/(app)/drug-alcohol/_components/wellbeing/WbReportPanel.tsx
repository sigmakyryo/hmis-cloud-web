"use client";

import { useQuery } from "@tanstack/react-query";

import { ImmInsightStrip } from "@/app/(app)/immunizations/_components/shared/ImmInsightStrip";
import { ImmRecordTable } from "@/app/(app)/immunizations/_components/shared/ImmRecordTable";
import { LoadError, QuietLoading } from "@/app/(app)/immunizations/_components/shared/QuietLoading";
import {
  WB_ACTION_LABEL,
  WB_ORIGIN_LABEL,
  WB_OUTCOME_LABEL,
  fetchWbReport,
} from "@/features/occupational-health/services/wellbeing.service";
import { errorText, isForbidden, label } from "../shared/da-format";
import { DaCell, DaRow } from "../shared/da-ui";

const show = (n: number | null) => (n === null ? "fewer than 5" : String(n));

export function WbReportPanel() {
  const query = useQuery({ queryKey: ["oh-wb", "report"], queryFn: () => fetchWbReport(), retry: false });
  if (query.isLoading) return <QuietLoading />;
  if (query.isError)
    return (
      <LoadError>
        {isForbidden(query.error) ? "Only the wellbeing team or an administrator can see these reports." : errorText(query.error, "Could not load the report.")}
      </LoadError>
    );
  const r = query.data;
  if (!r) return null;
  const rows = [
    ...r.by_origin.map((o) => ({ key: `o-${o.group}`, kind: "How it started", group: label(WB_ORIGIN_LABEL, o.group), value: o.cases })),
    ...r.by_outcome.map((o) => ({ key: `r-${o.group}`, kind: "Outcome", group: label(WB_OUTCOME_LABEL, o.group), value: o.cases })),
    ...r.discipline.map((o) => ({ key: `d-${o.group}`, kind: "Disciplinary", group: label(WB_ACTION_LABEL, o.group), value: o.count })),
  ];
  return (
    <div data-testid="oh-wb-report">
      <ImmInsightStrip
        testId="oh-wb-report-totals"
        items={[
          { label: "Support cases", value: show(r.totals.cases) },
          { label: "Still in support", value: show(r.totals.open) },
          { label: "Attended a session", value: r.totals.engagement_rate === null ? "—" : `${Math.round(r.totals.engagement_rate * 100)}%` },
          { label: "Days to first session", value: r.totals.median_days_to_first_session ?? "—", hint: "median" },
        ]}
      />
      <p className="px-4 py-2 text-[12px] text-dash-muted md:px-6">
        {`${r.from} to ${r.to}. Groups with fewer than ${r.k_threshold} people are hidden so nobody can be identified.`}
      </p>
      {rows.length > 0 ? (
        <ImmRecordTable columns={["Measure", "Group", "People"]}>
          {rows.map((row) => (
            <DaRow key={row.key}>
              <DaCell first>{row.kind}</DaCell>
              <DaCell>{row.group}</DaCell>
              <DaCell>{show(row.value)}</DaCell>
            </DaRow>
          ))}
        </ImmRecordTable>
      ) : null}
    </div>
  );
}
