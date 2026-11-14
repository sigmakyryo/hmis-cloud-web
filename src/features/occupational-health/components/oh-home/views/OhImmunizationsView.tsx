"use client";

import { Building2, ListChecks } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { ROUTES } from "@/constants/routes";
import {
  OhImmCoverageByVaccine,
  OhImmDosesSection,
  OhImmStockSection,
} from "@/features/occupational-health/components/oh-home/views/OhImmunizationsSections";
import { ViewGrid } from "@/features/occupational-health/components/oh-home/views/OhViewCharts";
import {
  QueryState,
  ShareRow,
  TodoRow,
  ViewSection,
} from "@/features/occupational-health/components/oh-home/views/OhViewParts";
import {
  fetchOhImmCompliance,
  fetchOhImmDue,
  fetchOhImmExposureDueFollowups,
} from "@/features/occupational-health/services/immunisation.service";
import { useOhHomeSummary } from "@/features/occupational-health/components/oh-home/views/useOhHomeSummary";

const GROUPS_SHOWN = 6;

function coverageTone(percent: number) {
  return percent < 70
    ? "bg-red-600"
    : percent < 90
      ? "bg-amber-500"
      : "bg-brand-primary";
}

/** Immunizations: the doses to give, then how covered each employer is, weakest first. */
export function OhImmunizationsView() {
  const compliance = useQuery({
    queryKey: ["oh-home", "imm-compliance"],
    queryFn: () => fetchOhImmCompliance("employer"),
    staleTime: 60_000,
  });
  const due = useQuery({
    queryKey: ["oh-home", "imm-due"],
    queryFn: () => fetchOhImmDue(7),
    staleTime: 60_000,
  });
  const followups = useQuery({
    queryKey: ["oh-home", "imm-followups"],
    queryFn: () => fetchOhImmExposureDueFollowups(14),
    staleTime: 60_000,
  });
  const home = useOhHomeSummary("immunizations");
  const summary = compliance.data?.summary;
  const groups = [...(compliance.data?.groups ?? [])]
    .sort((a, b) => a.percent_compliant - b.percent_compliant)
    .slice(0, GROUPS_SHOWN);

  return (
    <div className="space-y-10" data-testid="oh-home-view-immunizations">
      <ViewGrid>
        <ViewSection title="To do" icon={ListChecks}>
          <QueryState
            isLoading={due.isLoading || followups.isLoading}
            isError={due.isError || followups.isError}
            onRetry={() => {
              void due.refetch();
              void followups.refetch();
            }}
          >
            <ul>
              <TodoRow
                value={summary?.overdue_rows ?? 0}
                label="Doses overdue"
                hint="Past their due date"
                href={ROUTES.immunizationsDue}
                alert
              />
              <TodoRow
                value={due.data?.length ?? 0}
                label="Doses due this week"
                hint="Next 7 days"
                href={ROUTES.immunizationsDue}
              />
              <TodoRow
                value={followups.data?.length ?? 0}
                label="Exposure follow-ups"
                hint="Next 14 days"
                href={ROUTES.exposureManagementIncidents}
              />
            </ul>
          </QueryState>
        </ViewSection>
        <OhImmStockSection summary={home} />
      </ViewGrid>
      <ViewGrid>
        <ViewSection
          title="Coverage by employer" icon={Building2}
          href={ROUTES.immunizationsCompliance}
          linkLabel="Full report"
        >
          <QueryState
            isLoading={compliance.isLoading}
            isError={compliance.isError}
            onRetry={() => void compliance.refetch()}
            rows={4}
          >
            {summary && summary.people > 0 ? (
              <>
                <p className="mb-2 text-[13.5px] text-dash-muted">
                  <span className="font-semibold text-brand-navy tabular-nums">
                    {summary.compliant}
                  </span>{" "}
                  of <span className="tabular-nums">{summary.people}</span>{" "}
                  workers are up to date (
                  {Math.round(summary.percent_compliant)}%). Lowest coverage
                  first.
                </p>
                <ul>
                  {groups.map((group) => (
                    <ShareRow
                      key={group.group}
                      name={group.group || "No employer"}
                      percent={group.percent_compliant}
                      note={`${group.overdue} overdue`}
                      tone={coverageTone(group.percent_compliant)}
                    />
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-[13.5px] text-dash-muted">
                No workers have a vaccine schedule yet.
              </p>
            )}
          </QueryState>
        </ViewSection>
        <OhImmCoverageByVaccine summary={home} />
      </ViewGrid>
      <OhImmDosesSection summary={home} />
    </div>
  );
}
