"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { PageActionButton } from "@/components/ui/app-buttons";
import { ListPageDataTableCell, ListPageDataTableRow } from "@/features/app-shell/components/page-layout";
import { EmptyAction } from "@/app/(app)/immunizations/_components/shared/EmptyAction";
import { ImmPageShell } from "@/app/(app)/immunizations/_components/shared/ImmPageShell";
import { ImmPrimaryCell, ImmRecordTable, ImmStatusBadge } from "@/app/(app)/immunizations/_components/shared/ImmRecordTable";
import { ImmTabsBar } from "@/app/(app)/immunizations/_components/shared/ImmTabsBar";
import { LoadError, QuietLoading } from "@/app/(app)/immunizations/_components/shared/QuietLoading";
import { InstrumentSheet, PlanSheet } from "@/features/exposure-management/components/ExposureSamplingSheets";
import { errorMessage, formatDate } from "@/features/exposure-management/lib/exposure-format";
import { exposureKeys, fetchInstruments, fetchPlans } from "@/features/exposure-management/services/exposure.service";

type Tab = "plans" | "instruments";
const DUE_TONE: Record<string, string> = { overdue: "overdue", due_soon: "due", ok: "up_to_date", not_scheduled: "pending", unknown: "pending", retired: "pending" };
const DUE_LABEL: Record<string, string> = { overdue: "Overdue", due_soon: "Due soon", ok: "Up to date", not_scheduled: "Not scheduled", unknown: "No date", retired: "Retired" };

export function ExposureSamplingPage() {
  const [tab, setTab] = useState<Tab>("plans");
  const [sheet, setSheet] = useState(false);
  const plans = useQuery({ queryKey: exposureKeys.plans, queryFn: () => fetchPlans() });
  const instruments = useQuery({ queryKey: exposureKeys.instruments, queryFn: fetchInstruments });
  const active = tab === "plans" ? plans : instruments;

  return (
    <ImmPageShell testId="exposure-sampling-page" title="Sampling plans and instruments">
      <ImmTabsBar
        label="Sampling"
        active={tab}
        onChange={setTab}
        tabs={[{ key: "plans", label: "Sampling plans", count: plans.data?.length }, { key: "instruments", label: "Instruments", count: instruments.data?.length }]}
        actions={<PageActionButton onClick={() => setSheet(true)}>{tab === "plans" ? "New plan" : "New instrument"}</PageActionButton>}
      />
      {active.isPending ? <QuietLoading /> : null}
      {active.isError ? <LoadError>{errorMessage(active.error, "Could not load this list.")}</LoadError> : null}
      {tab === "plans" && plans.data ? (
        plans.data.length === 0 ? <EmptyAction title="No sampling plans" description="Plans keep sampling on schedule and raise reminders when it is due." icon="activity" /> : (
          <ImmRecordTable columns={["Group", "Agent", "Frequency", "Last sampled", "Next due", "State"]}>
            {plans.data.map((p) => (
              <ListPageDataTableRow key={p.uuid}>
                <ListPageDataTableCell className="pl-4 md:pl-6">{p.group_name ?? "—"}</ListPageDataTableCell>
                <ListPageDataTableCell>{p.agent_name ?? "—"}</ListPageDataTableCell>
                <ListPageDataTableCell>Every {p.frequency_months} mo · min {p.min_samples}</ListPageDataTableCell>
                <ListPageDataTableCell>{formatDate(p.last_sampled_on)}</ListPageDataTableCell>
                <ListPageDataTableCell>{formatDate(p.next_due_on)}</ListPageDataTableCell>
                <ListPageDataTableCell><ImmStatusBadge status={DUE_TONE[p.due_state] ?? "pending"} label={DUE_LABEL[p.due_state]} /></ListPageDataTableCell>
              </ListPageDataTableRow>
            ))}
          </ImmRecordTable>
        )
      ) : null}
      {tab === "instruments" && instruments.data ? (
        instruments.data.length === 0 ? <EmptyAction title="No instruments" description="Register sampling pumps, dosimeters and meters to track calibration." icon="activity" /> : (
          <ImmRecordTable columns={["Instrument", "Type", "Last calibrated", "Calibration due", "State"]}>
            {instruments.data.map((i) => (
              <ListPageDataTableRow key={i.uuid}>
                <ListPageDataTableCell className="pl-4 md:pl-6"><ImmPrimaryCell title={i.name} detail={i.serial} /></ListPageDataTableCell>
                <ListPageDataTableCell>{i.type || "—"}</ListPageDataTableCell>
                <ListPageDataTableCell>{formatDate(i.last_calibrated_on)}</ListPageDataTableCell>
                <ListPageDataTableCell>{formatDate(i.calibration_due_on)}</ListPageDataTableCell>
                <ListPageDataTableCell><ImmStatusBadge status={DUE_TONE[i.calibration_state] ?? "pending"} label={DUE_LABEL[i.calibration_state]} /></ListPageDataTableCell>
              </ListPageDataTableRow>
            ))}
          </ImmRecordTable>
        )
      ) : null}
      {sheet && tab === "plans" ? <PlanSheet onClose={() => setSheet(false)} /> : null}
      {sheet && tab === "instruments" ? <InstrumentSheet onClose={() => setSheet(false)} /> : null}
    </ImmPageShell>
  );
}
