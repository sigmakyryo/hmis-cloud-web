"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { SecondaryButton } from "@/components/ui/app-buttons";
import { downloadBlob } from "@/app/(app)/immunizations/_components/shared/download-blob";
import { ImmInsightStrip } from "@/app/(app)/immunizations/_components/shared/ImmInsightStrip";
import { ImmPageShell } from "@/app/(app)/immunizations/_components/shared/ImmPageShell";
import { ImmRecordTable, ImmStatusBadge } from "@/app/(app)/immunizations/_components/shared/ImmRecordTable";
import { ImmFilterBar, ImmNotice, ImmTabsBar } from "@/app/(app)/immunizations/_components/shared/ImmTabsBar";
import { LoadError, QuietLoading } from "@/app/(app)/immunizations/_components/shared/QuietLoading";
import { Input } from "@/components/ui/input";
import {
  downloadDaReportCsv,
  fetchDaReport,
  type DaReportCell,
} from "@/features/occupational-health/services/drug-alcohol.service";
import { useToast } from "@/providers/toast-provider";
import { REASON_LABEL, errorText, label } from "../shared/da-format";
import { DaCell, DaRow } from "../shared/da-ui";

type View = "reason" | "employer" | "month" | "substance" | "random";

const hidden = "Hidden";

function CellRows({ rows, map }: { rows: DaReportCell[]; map?: Record<string, string> }) {
  return (
    <ImmRecordTable columns={["Group", "Tests", "Finished", "Non-negative", "Rate"]}>
      {rows.map((row) => (
        <DaRow key={row.group} testId="oh-da-report-row">
          <DaCell first>{map ? label(map, row.group) : row.group}</DaCell>
          <DaCell>{row.tests}</DaCell>
          <DaCell>{row.verified}</DaCell>
          <DaCell>{row.suppressed ? hidden : (row.non_negative ?? "—")}</DaCell>
          <DaCell>{row.suppressed ? hidden : row.rate != null ? `${row.rate}%` : "—"}</DaCell>
        </DaRow>
      ))}
    </ImmRecordTable>
  );
}

export function DaReportsPage() {
  const { toast } = useToast();
  const [view, setView] = useState<View>("reason");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);
  const query = useQuery({
    queryKey: ["oh-da", "reports", from, to],
    queryFn: () => fetchDaReport({ from: from || undefined, to: to || undefined }),
  });
  const data = query.data;

  async function exportCsv() {
    setBusy(true);
    try {
      const file = await downloadDaReportCsv({ from: from || undefined, to: to || undefined });
      downloadBlob(file.blob, file.filename);
    } catch (error) {
      toast({ variant: "error", title: "Could not export", description: errorText(error) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <ImmPageShell title="Reports" testId="oh-da-reports-page">
      <ImmTabsBar<View>
        label="Report views"
        tabs={[
          { key: "reason", label: "By reason" },
          { key: "employer", label: "By employer" },
          { key: "month", label: "By month" },
          { key: "substance", label: "By substance" },
          { key: "random", label: "Random compliance" },
        ]}
        active={view}
        onChange={setView}
        actions={
          <SecondaryButton className="h-8" disabled={busy} onClick={exportCsv}>
            Export CSV
          </SecondaryButton>
        }
      />
      <ImmFilterBar>
        <label className="space-y-1 text-[12px] text-dash-muted">
          From
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8" />
        </label>
        <label className="space-y-1 text-[12px] text-dash-muted">
          To
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8" />
        </label>
      </ImmFilterBar>
      {query.isLoading ? <QuietLoading /> : null}
      {query.isError ? <LoadError>{errorText(query.error, "Could not load the report.")}</LoadError> : null}
      {data ? (
        <>
          <ImmInsightStrip
            testId="oh-da-report-insights"
            items={[
              { label: "Tests", value: data.totals.tests, hint: `${data.from} to ${data.to}` },
              { label: "Finished", value: data.totals.verified },
              { label: "Non-negative", value: data.totals.non_negative ?? hidden },
              { label: "Positivity", value: data.totals.positivity_rate != null ? `${data.totals.positivity_rate}%` : hidden },
              {
                label: "Collection to result (median)",
                value: data.turnaround_hours.collection_to_verified != null ? `${data.turnaround_hours.collection_to_verified} h` : "—",
              },
              {
                label: "Medical review (median)",
                value: data.turnaround_hours.mro_review != null ? `${data.turnaround_hours.mro_review} h` : "—",
              },
            ]}
          />
          <ImmNotice>
            Numbers below {data.k_threshold} are hidden so nobody can be identified from the report.
          </ImmNotice>
          {view === "reason" ? <CellRows rows={data.by_reason} map={REASON_LABEL} /> : null}
          {view === "employer" ? <CellRows rows={data.by_employer} /> : null}
          {view === "month" ? <CellRows rows={data.by_month} /> : null}
          {view === "substance" ? (
            <ImmRecordTable columns={["Substance", "Positives"]}>
              {data.by_substance.map((row) => (
                <DaRow key={row.substance}>
                  <DaCell first>{row.substance}</DaCell>
                  <DaCell>{row.suppressed ? hidden : row.positives}</DaCell>
                </DaRow>
              ))}
            </ImmRecordTable>
          ) : null}
          {view === "random" ? (
            <ImmRecordTable columns={["Pool", "Avg. people", "Drug tests", "Alcohol tests", "No-shows", "On track"]}>
              {data.random_compliance.map((row) => (
                <DaRow key={row.pool_uuid}>
                  <DaCell first>{row.pool_name}</DaCell>
                  <DaCell>{row.average_population}</DaCell>
                  <DaCell>
                    {row.drug_tests_done} / {row.drug_tests_required}
                  </DaCell>
                  <DaCell>
                    {row.alcohol_tests_done} / {row.alcohol_tests_required}
                  </DaCell>
                  <DaCell>{row.no_shows}</DaCell>
                  <DaCell>
                    <ImmStatusBadge
                      status={row.drug_on_track && row.alcohol_on_track ? "complete" : "due"}
                      label={row.drug_on_track && row.alcohol_on_track ? "On track" : "Behind"}
                    />
                  </DaCell>
                </DaRow>
              ))}
            </ImmRecordTable>
          ) : null}
        </>
      ) : null}
    </ImmPageShell>
  );
}
