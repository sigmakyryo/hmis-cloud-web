"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { fetchPortalCompliance } from "@/features/employer-portal/services/employer-portal.service";

import { PortalState } from "./PortalShell";
import { DaCell, DaRow, ImmPrimaryCell, ImmRecordTable, ImmStatusBadge, ImmTabsBar } from "./portal-ui";

export function PortalCompliancePage() {
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(String(thisYear));
  const query = useQuery({ queryKey: ["employer-portal", "compliance", year], queryFn: () => fetchPortalCompliance(Number(year)), retry: false });
  const rows = query.data ?? [];

  return (
    <div data-testid="employer-portal-compliance">
      <h1 className="sr-only">Random testing</h1>
      <ImmTabsBar<string>
        label="Years"
        tabs={[thisYear, thisYear - 1, thisYear - 2].map((y) => ({ key: String(y), label: String(y) }))}
        active={year}
        onChange={setYear}
      />
      <PortalState loading={query.isLoading} error={query.error} empty={query.isSuccess && rows.length === 0 ? "No random testing groups for your company." : null}>
        <ImmRecordTable columns={["Group", "Draws", "Drug tests", "Alcohol tests", "Progress"]}>
          {rows.map((r) => (
            <DaRow key={`${r.pool}-${r.year}`} testId="employer-portal-pool">
              <DaCell first>
                <ImmPrimaryCell title={r.pool} detail={`About ${r.average_population} people`} />
              </DaCell>
              <DaCell>{r.draws}</DaCell>
              <DaCell>{`${r.drug_tests_done} of ${r.drug_tests_required}`}</DaCell>
              <DaCell>{`${r.alcohol_tests_done} of ${r.alcohol_tests_required}`}</DaCell>
              <DaCell>
                <ImmStatusBadge status={r.on_track ? "active" : "overdue"} label={r.on_track ? "On track" : "Behind"} />
              </DaCell>
            </DaRow>
          ))}
        </ImmRecordTable>
      </PortalState>
      <p className="px-5 py-3 text-[12px] text-dash-muted">Counts only. Who was selected and their results stay with the clinic.</p>
    </div>
  );
}
