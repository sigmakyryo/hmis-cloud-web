"use client";

import { useQuery } from "@tanstack/react-query";
import { CheckListIcon } from "@hugeicons/core-free-icons";
import { useState } from "react";

import {
  PortalCell,
  PortalFootnote,
  PortalPage,
  PortalPageHeader,
  PortalPill,
  PortalRow,
  PortalStatStrip,
  PortalStatusPill,
  PortalTable,
  PortalToolbar,
} from "@/features/employer-portal/components/PortalPrimitives";
import { fetchPortalCompliance } from "@/features/employer-portal/services/employer-portal.service";

import { PortalState } from "./PortalShell";

export function PortalCompliancePage() {
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(String(thisYear));
  const query = useQuery({ queryKey: ["employer-portal", "compliance", year], queryFn: () => fetchPortalCompliance(Number(year)), retry: false });
  const rows = query.data ?? [];
  const behind = rows.filter((row) => !row.on_track).length;
  const drugDone = rows.reduce((sum, row) => sum + row.drug_tests_done, 0);
  const drugRequired = rows.reduce((sum, row) => sum + row.drug_tests_required, 0);
  const alcoholDone = rows.reduce((sum, row) => sum + row.alcohol_tests_done, 0);
  const alcoholRequired = rows.reduce((sum, row) => sum + row.alcohol_tests_required, 0);

  return (
    <PortalPage testId="employer-portal-compliance">
      <PortalPageHeader icon={CheckListIcon} title="Random testing" subtitle="How far your testing groups have got this year" />
      <PortalStatStrip
        loading={query.isLoading}
        stats={[
          { label: "Groups", value: String(rows.length) },
          { label: "Drug tests", value: `${drugDone} of ${drugRequired}` },
          { label: "Alcohol tests", value: `${alcoholDone} of ${alcoholRequired}` },
          { label: "Behind", value: String(behind), note: behind ? "Needs attention" : "All on track", tone: behind ? "bad" : "good" },
        ]}
      />
      <PortalToolbar>
        <div className="flex gap-2" role="group" aria-label="Years">
          {[thisYear, thisYear - 1, thisYear - 2].map((y) => (
            <PortalPill key={y} active={year === String(y)} onClick={() => setYear(String(y))}>
              {y}
            </PortalPill>
          ))}
        </div>
      </PortalToolbar>
      <PortalState loading={query.isLoading} error={query.error} empty={query.isSuccess && rows.length === 0 ? "No random testing groups for your company." : null} emptyIcon={CheckListIcon} emptyTitle="No groups yet">
        <PortalTable columns={["Group", "Draws", "Drug tests", "Alcohol tests", "Progress"]}>
          {rows.map((r) => (
            <PortalRow key={`${r.pool}-${r.year}`} testId="employer-portal-pool">
              <PortalCell>
                <p className="text-neutral-900">{r.pool}</p>
                <p className="text-[12px] text-neutral-500">About {r.average_population} people</p>
              </PortalCell>
              <PortalCell>{r.draws}</PortalCell>
              <PortalCell>{`${r.drug_tests_done} of ${r.drug_tests_required}`}</PortalCell>
              <PortalCell>{`${r.alcohol_tests_done} of ${r.alcohol_tests_required}`}</PortalCell>
              <PortalCell>
                <PortalStatusPill tone={r.on_track ? "good" : "bad"}>{r.on_track ? "On track" : "Behind"}</PortalStatusPill>
              </PortalCell>
            </PortalRow>
          ))}
        </PortalTable>
      </PortalState>
      <PortalFootnote>Counts only. Who was selected and their results stay with the clinic.</PortalFootnote>
    </PortalPage>
  );
}
