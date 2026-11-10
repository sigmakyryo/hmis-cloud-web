"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { ImmPageShell } from "@/app/(app)/immunizations/_components/shared/ImmPageShell";
import { ImmPrimaryCell, ImmRecordTable } from "@/app/(app)/immunizations/_components/shared/ImmRecordTable";
import { ImmFilterBar } from "@/app/(app)/immunizations/_components/shared/ImmTabsBar";
import { LoadError, QuietLoading } from "@/app/(app)/immunizations/_components/shared/QuietLoading";
import { Field } from "@/app/(app)/immunizations/_components/shared/Field";
import { DaCell, DaRow } from "@/app/(app)/drug-alcohol/_components/shared/da-ui";
import { errorText } from "@/app/(app)/fitness/_components/shared/fit-format";
import { fetchHpReports } from "@/features/occupational-health/services/health-programs.service";
import { flagText } from "../shared/hp-format";

function MonthBars({ months }: { months: Array<{ month: string; tests: number; referrals: number }> }) {
  if (months.length === 0) return <span className="text-dash-muted">—</span>;
  const max = Math.max(...months.map((m) => m.tests), 1);
  return (
    <span className="flex h-6 items-end gap-0.5" aria-label="Tests per month">
      {months.slice(-12).map((m) => (
        <span
          key={m.month}
          title={`${m.month}: ${m.tests} tests, ${m.referrals} referrals`}
          className={m.referrals > 0 ? "w-2 bg-amber-500" : "w-2 bg-brand-primary"}
          style={{ height: `${Math.max(8, (m.tests / max) * 100)}%` }}
        />
      ))}
    </span>
  );
}

export function HpReportsPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const query = useQuery({ queryKey: ["oh-hp", "reports", from, to], queryFn: () => fetchHpReports({ from, to }) });
  return (
    <ImmPageShell title="Health programme reports" testId="oh-hp-reports-page">
      <ImmFilterBar>
        <Field label="From" type="date" value={from} onChange={setFrom} />
        <Field label="To" type="date" value={to} onChange={setTo} />
      </ImmFilterBar>
      {query.isLoading ? <QuietLoading /> : null}
      {query.isError ? <LoadError>{errorText(query.error, "Could not load reports.")}</LoadError> : null}
      {query.data ? (
        <ImmRecordTable columns={["Programme", "Tests", "Workers", "Fit", "Restricted", "Not fit", "Referrals", "Overdue", "Main findings", "Trend"]}>
          {query.data.programs.map((p) => (
            <DaRow key={p.program} testId="oh-hp-report-row">
              <DaCell first>
                <ImmPrimaryCell title={p.label} />
              </DaCell>
              <DaCell>{p.tests}</DaCell>
              <DaCell>{p.workers}</DaCell>
              <DaCell>{p.fit}</DaCell>
              <DaCell>{p.restricted}</DaCell>
              <DaCell>{p.unfit}</DaCell>
              <DaCell>{p.referrals}</DaCell>
              <DaCell>{p.overdue}</DaCell>
              <DaCell>
                {Object.keys(p.flags).length
                  ? Object.entries(p.flags)
                      .map(([k, n]) => `${flagText([k])} ${n}`)
                      .join(", ")
                  : "—"}
              </DaCell>
              <DaCell>
                <MonthBars months={p.by_month} />
              </DaCell>
            </DaRow>
          ))}
        </ImmRecordTable>
      ) : null}
    </ImmPageShell>
  );
}
