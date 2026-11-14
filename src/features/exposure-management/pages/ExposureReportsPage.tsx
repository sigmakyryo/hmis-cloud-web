"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { SecondaryButton } from "@/components/ui/app-buttons";
import { ListPageDataTableCell, ListPageDataTableRow } from "@/features/app-shell/components/page-layout";
import { downloadBlob } from "@/app/(app)/immunizations/_components/shared/download-blob";
import { Field } from "@/app/(app)/immunizations/_components/shared/Field";
import { ImmInsightStrip } from "@/app/(app)/immunizations/_components/shared/ImmInsightStrip";
import { ImmPageShell } from "@/app/(app)/immunizations/_components/shared/ImmPageShell";
import { ImmFilterBar, ImmNotice } from "@/app/(app)/immunizations/_components/shared/ImmTabsBar";
import { ImmRecordTable } from "@/app/(app)/immunizations/_components/shared/ImmRecordTable";
import { LoadError, QuietLoading } from "@/app/(app)/immunizations/_components/shared/QuietLoading";
import { errorMessage, formatRatio } from "@/features/exposure-management/lib/exposure-format";
import { downloadExposureReportCsv, exposureKeys, fetchExposureReport } from "@/features/exposure-management/services/exposure.service";

function yearStart(): string {
  return `${new Date().getFullYear()}-01-01`;
}

export function ExposureReportsPage() {
  const [from, setFrom] = useState(yearStart);
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [notice, setNotice] = useState("");
  const query = useQuery({ queryKey: exposureKeys.report(from, to), queryFn: () => fetchExposureReport(from, to) });
  const report = query.data;

  const exportCsv = async () => {
    try {
      const { blob, filename } = await downloadExposureReportCsv(from, to);
      downloadBlob(blob, filename);
    } catch (error) {
      setNotice(errorMessage(error, "Could not export the report."));
    }
  };

  return (
    <ImmPageShell testId="exposure-reports-page" title="Exposure reports">
      <ImmFilterBar trailing={<SecondaryButton onClick={exportCsv}>Export CSV</SecondaryButton>}>
        <div className="w-40"><Field label="From" type="date" value={from} onChange={setFrom} /></div>
        <div className="w-40"><Field label="To" type="date" value={to} onChange={setTo} /></div>
      </ImmFilterBar>
      {notice ? <ImmNotice tone="warning">{notice}</ImmNotice> : null}
      {query.isPending ? <QuietLoading /> : null}
      {query.isError ? <LoadError>{errorMessage(query.error, "Could not load the report.")}</LoadError> : null}
      {report ? (
        <>
          <ImmInsightStrip
            items={[
              { label: "Results", value: report.measurements.total },
              { label: "Over limit", value: report.measurements.over_limit, tone: report.measurements.over_limit ? "danger" : "success" },
              { label: "Events", value: report.events.total, hint: `${report.events.closed} closed` },
              { label: "Days to close", value: report.events.mean_days_to_close ?? "—" },
              { label: "Controls done", value: `${report.controls.done}/${report.controls.total}` },
              { label: "Sampling overdue", value: report.sampling.overdue, tone: report.sampling.overdue ? "warning" : "success" },
              { label: "Biological incidents", value: report.biological.last_90_days, hint: "last 90 days" },
            ]}
          />
          <ImmRecordTable columns={["Agent", "Results", "Over limit", "Highest % of limit"]}>
            {report.measurements.by_agent.length === 0 ? (
              <ListPageDataTableRow>
                <ListPageDataTableCell colSpan={4} className="pl-4 text-dash-muted md:pl-6">No results in this period.</ListPageDataTableCell>
              </ListPageDataTableRow>
            ) : (
              report.measurements.by_agent.map((row) => (
                <ListPageDataTableRow key={row.agent}>
                  <ListPageDataTableCell className="pl-4 font-medium text-brand-navy md:pl-6">{row.agent}</ListPageDataTableCell>
                  <ListPageDataTableCell className="tabular-nums">{row.n}</ListPageDataTableCell>
                  <ListPageDataTableCell className="tabular-nums">{row.over_limit}</ListPageDataTableCell>
                  <ListPageDataTableCell className="tabular-nums">{formatRatio(row.max_ratio)}</ListPageDataTableCell>
                </ListPageDataTableRow>
              ))
            )}
          </ImmRecordTable>
        </>
      ) : null}
    </ImmPageShell>
  );
}
