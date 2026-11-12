"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { EmptyAction } from "@/app/(app)/immunizations/_components/shared/EmptyAction";
import { ImmInsightStrip } from "@/app/(app)/immunizations/_components/shared/ImmInsightStrip";
import { ImmPageShell } from "@/app/(app)/immunizations/_components/shared/ImmPageShell";
import { ImmPrimaryCell, ImmRecordTable, ImmStatusBadge } from "@/app/(app)/immunizations/_components/shared/ImmRecordTable";
import { ImmSearchBar } from "@/app/(app)/immunizations/_components/shared/ImmSearchBar";
import { ImmTabsBar } from "@/app/(app)/immunizations/_components/shared/ImmTabsBar";
import { LoadError, QuietLoading } from "@/app/(app)/immunizations/_components/shared/QuietLoading";
import { useImmList } from "@/app/(app)/immunizations/_components/shared/use-imm-list";
import { DaCell, DaRow } from "@/app/(app)/drug-alcohol/_components/shared/da-ui";
import { errorText, fmtDate } from "@/app/(app)/fitness/_components/shared/fit-format";
import { fetchHpResults, type HpProgram, type HpResult } from "@/features/occupational-health/services/health-programs.service";
import { HpTrendDrawer } from "../shared/HpTrendDrawer";
import { OUTCOME_LABEL, OUTCOME_TONE, PROGRAM_LABEL, flagText, headline } from "../shared/hp-format";

type Tab = "all" | "referral" | "restricted" | "unfit";

const BLURB: Record<HpProgram, string> = {
  hearing: "Audiograms compared with each worker's baseline for a standard threshold shift.",
  lung: "Spirometry against the policy's reference values, with decline from baseline.",
  vision: "Acuity, colour and field checks for drivers and operators.",
  ergonomics: "RULA and REBA task scores with action levels.",
  fatigue: "Epworth sleepiness, hours worked and prior sleep.",
};

/** One page per programme: latest results, flags, and the worker trend drawer. */
export function HpProgramPage({ program }: { program: HpProgram }) {
  const [tab, setTab] = useState<Tab>("all");
  const [open, setOpen] = useState<string | null>(null);
  const query = useQuery({ queryKey: ["oh-hp", "results", program], queryFn: () => fetchHpResults({ program }) });
  const all = query.data ?? [];
  const latest = Array.from(new Map(all.map((r) => [r.customer_uuid, r])).values());
  const rows = all.filter((r) => (tab === "all" ? true : tab === "referral" ? r.referral : r.outcome === tab));
  const list = useImmList<HpResult>({
    rows,
    searchText: (r) => `${r.worker_label} ${headline(r)} ${flagText(r.computed?.flags)}`,
    sortValue: (r, key) => (key === "date" ? r.performed_at : key === "due" ? r.next_due_on : r.worker_label),
    defaultSort: { key: "date", direction: "desc" },
  });

  return (
    <ImmPageShell title={PROGRAM_LABEL[program]} testId={`oh-hp-program-${program}`}>
      <ImmTabsBar<Tab>
        label={`${PROGRAM_LABEL[program]} results`}
        tabs={[
          { key: "all", label: "All results", count: all.length },
          { key: "referral", label: "Referrals", count: all.filter((r) => r.referral).length },
          { key: "restricted", label: "With restrictions", count: all.filter((r) => r.outcome === "restricted").length },
          { key: "unfit", label: "Not fit", count: all.filter((r) => r.outcome === "unfit").length },
        ]}
        active={tab}
        onChange={setTab}
      />
      <ImmInsightStrip
        testId="oh-hp-program-insights"
        items={[
          { label: "Workers tested", value: latest.length },
          { label: "Latest: restricted", value: latest.filter((r) => r.outcome === "restricted").length, tone: "warning" },
          { label: "Latest: not fit", value: latest.filter((r) => r.outcome === "unfit").length, tone: "danger" },
          { label: "Open referrals", value: latest.filter((r) => r.referral).length, tone: "warning" },
        ]}
      />
      <ImmSearchBar
        value={list.query}
        onChange={list.setQuery}
        placeholder="Search worker or finding"
        matched={list.controls.matched}
        total={list.total}
        onClear={() => list.setQuery("")}
      />
      {query.isLoading ? <QuietLoading /> : null}
      {query.isError ? <LoadError>{errorText(query.error, "Could not load results.")}</LoadError> : null}
      {query.isSuccess && list.controls.matched === 0 ? (
        <EmptyAction icon="heartPulse" title="No results yet" description={`${BLURB[program]} Record results from the Due list or in a visit.`} />
      ) : null}
      {query.isSuccess && list.controls.matched > 0 ? (
        <ImmRecordTable list={list.controls} columns={[{ label: "Worker", sortKey: "name" }, "Result", { label: "Tested", sortKey: "date" }, "Outcome", { label: "Next due", sortKey: "due" }]}>
          {list.pageRows.map((r) => (
            <DaRow key={r.uuid} testId="oh-hp-result-row" onClick={() => setOpen(r.customer_uuid)}>
              <DaCell first>
                <ImmPrimaryCell title={r.worker_label || "—"} detail={r.is_baseline ? "Baseline" : undefined} />
              </DaCell>
              <DaCell>
                <ImmPrimaryCell title={headline(r)} detail={flagText(r.computed?.flags) || undefined} />
              </DaCell>
              <DaCell>{fmtDate(r.performed_at)}</DaCell>
              <DaCell>
                <span className="inline-flex items-center gap-1.5">
                  <ImmStatusBadge status={OUTCOME_TONE[r.outcome]} label={OUTCOME_LABEL[r.outcome]} />
                  {r.referral ? <ImmStatusBadge status="pending" label="Referral" /> : null}
                </span>
              </DaCell>
              <DaCell>{fmtDate(r.next_due_on)}</DaCell>
            </DaRow>
          ))}
        </ImmRecordTable>
      ) : null}
      {open ? <HpTrendDrawer customerUuid={open} program={program} onClose={() => setOpen(null)} /> : null}
    </ImmPageShell>
  );
}
