"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { EmptyAction } from "@/app/(app)/immunizations/_components/shared/EmptyAction";
import { ImmInsightStrip } from "@/app/(app)/immunizations/_components/shared/ImmInsightStrip";
import { ImmPageShell } from "@/app/(app)/immunizations/_components/shared/ImmPageShell";
import { ImmPrimaryCell, ImmRecordTable, ImmRowAction, ImmStatusBadge } from "@/app/(app)/immunizations/_components/shared/ImmRecordTable";
import { ImmFilterSelect, ImmSearchBar } from "@/app/(app)/immunizations/_components/shared/ImmSearchBar";
import { ImmTabsBar } from "@/app/(app)/immunizations/_components/shared/ImmTabsBar";
import { LoadError, QuietLoading } from "@/app/(app)/immunizations/_components/shared/QuietLoading";
import { useImmList } from "@/app/(app)/immunizations/_components/shared/use-imm-list";
import { DaCell, DaRow } from "@/app/(app)/drug-alcohol/_components/shared/da-ui";
import { errorText, fmtDate } from "@/app/(app)/fitness/_components/shared/fit-format";
import { HP_PROGRAMS, fetchHpDue, type HpDueRow, type HpProgram } from "@/features/occupational-health/services/health-programs.service";
import { HpResultForm } from "../shared/HpResultForm";
import { DUE_LABEL, DUE_TONE, PROGRAM_LABEL } from "../shared/hp-format";

type Tab = "all" | HpProgram;

export function HpDuePage() {
  const [tab, setTab] = useState<Tab>("all");
  const [within, setWithin] = useState("30");
  const [recording, setRecording] = useState<HpDueRow | null>(null);
  const query = useQuery({ queryKey: ["oh-hp", "due", within], queryFn: () => fetchHpDue({ within: Number(within) }) });
  const counts = query.data?.counts ?? {};
  const rows = (query.data?.rows ?? []).filter((r) => tab === "all" || r.program === tab);
  const list = useImmList<HpDueRow>({
    rows,
    searchText: (r) => `${r.worker_label} ${r.employee_number} ${r.job_title} ${r.employer_name} ${r.site}`,
    sortValue: (r, key) => (key === "due" ? r.due_on : key === "state" ? r.state : r.worker_label),
    defaultSort: { key: "due", direction: "asc" },
  });

  return (
    <ImmPageShell title="Health checks due" testId="oh-hp-due-page">
      <ImmTabsBar<Tab>
        label="Programmes"
        tabs={[{ key: "all" as Tab, label: "All", count: counts.total }, ...HP_PROGRAMS.map((p) => ({ key: p as Tab, label: PROGRAM_LABEL[p], count: counts[p] }))]}
        active={tab}
        onChange={setTab}
      />
      <ImmInsightStrip
        testId="oh-hp-due-insights"
        items={[
          { label: "Overdue", value: counts.overdue ?? 0, tone: (counts.overdue ?? 0) > 0 ? "danger" : "default" },
          { label: "Never done", value: counts.never ?? 0, tone: "warning" },
          { label: "Due soon", value: counts.due ?? 0 },
        ]}
      />
      <ImmSearchBar
        value={list.query}
        onChange={list.setQuery}
        placeholder="Search worker, job or site"
        matched={list.controls.matched}
        total={list.total}
        onClear={() => list.setQuery("")}
        filters={
          <ImmFilterSelect label="Due within" value={within} onChange={setWithin}>
            <option value="0">Due now</option>
            <option value="30">Next 30 days</option>
            <option value="90">Next 90 days</option>
            <option value="365">Next year</option>
          </ImmFilterSelect>
        }
      />
      {query.isLoading ? <QuietLoading /> : null}
      {query.isError ? <LoadError>{errorText(query.error, "Could not load the due list.")}</LoadError> : null}
      {query.isSuccess && list.controls.matched === 0 ? (
        <EmptyAction icon="heartPulse" title="Nothing due" description="Workers appear here when a programme policy applies to their job, site or exposures." />
      ) : null}
      {query.isSuccess && list.controls.matched > 0 ? (
        <ImmRecordTable list={list.controls} columns={[{ label: "Worker", sortKey: "name" }, "Check", { label: "Due", sortKey: "due" }, { label: "State", sortKey: "state" }, "Actions"]}>
          {list.pageRows.map((r) => (
            <DaRow key={`${r.customer_uuid}-${r.program}`} testId="oh-hp-due-row">
              <DaCell first>
                <ImmPrimaryCell title={r.worker_label || "—"} detail={[r.job_title, r.employer_name, r.site].filter(Boolean).join(" · ") || undefined} />
              </DaCell>
              <DaCell>
                <ImmPrimaryCell title={PROGRAM_LABEL[r.program]} detail={r.policy_name} />
              </DaCell>
              <DaCell>{fmtDate(r.due_on)}</DaCell>
              <DaCell>
                <ImmStatusBadge status={DUE_TONE[r.state]} label={DUE_LABEL[r.state]} />
              </DaCell>
              <DaCell actions>
                <ImmRowAction onClick={() => setRecording(r)}>Record</ImmRowAction>
              </DaCell>
            </DaRow>
          ))}
        </ImmRecordTable>
      ) : null}
      {recording ? (
        <HpResultForm
          program={recording.program}
          customerUuid={recording.customer_uuid}
          workerLabel={recording.worker_label}
          policyUuid={recording.policy_uuid}
          onClose={() => setRecording(null)}
        />
      ) : null}
    </ImmPageShell>
  );
}
