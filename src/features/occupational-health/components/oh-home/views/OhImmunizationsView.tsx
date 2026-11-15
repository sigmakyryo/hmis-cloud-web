"use client";

import { useQuery } from "@tanstack/react-query";

import { ROUTES } from "@/constants/routes";
import { OhImmCoverageGrid } from "@/features/occupational-health/components/oh-home/views/OhImmCoverageGrid";
import { OhImmCoverageHero } from "@/features/occupational-health/components/oh-home/views/OhImmCoverageHero";
import { OhImmDoses } from "@/features/occupational-health/components/oh-home/views/OhImmDoses";
import { OhImmShelfLife } from "@/features/occupational-health/components/oh-home/views/OhImmShelfLife";
import { ViewGrid } from "@/features/occupational-health/components/oh-home/views/OhViewCharts";
import { useOhHomeSummary } from "@/features/occupational-health/components/oh-home/views/useOhHomeSummary";
import {
  fetchOhImmCompliance,
  fetchOhImmDue,
  fetchOhImmExposureDueFollowups,
} from "@/features/occupational-health/services/immunisation.service";

/** Immunizations: overall coverage and what to do, where the gaps are, and the vaccine stock running out. */
export function OhImmunizationsView() {
  const compliance = useQuery({ queryKey: ["oh-home", "imm-compliance"], queryFn: () => fetchOhImmCompliance("employer"), staleTime: 60_000 });
  const due = useQuery({ queryKey: ["oh-home", "imm-due"], queryFn: () => fetchOhImmDue(7), staleTime: 60_000 });
  const followups = useQuery({ queryKey: ["oh-home", "imm-followups"], queryFn: () => fetchOhImmExposureDueFollowups(14), staleTime: 60_000 });
  const home = useOhHomeSummary("immunizations");
  const summary = compliance.data?.summary;

  return (
    <div className="space-y-10" data-testid="oh-home-view-immunizations">
      <OhImmCoverageHero
        summary={summary}
        isLoading={compliance.isLoading || due.isLoading || followups.isLoading}
        isError={compliance.isError || due.isError || followups.isError}
        onRetry={() => {
          void compliance.refetch();
          void due.refetch();
          void followups.refetch();
        }}
        todos={[
          { value: summary?.overdue_rows ?? 0, label: "doses overdue", href: ROUTES.immunizationsDue, tone: "red" },
          { value: due.data?.length ?? 0, label: "doses due this week", href: ROUTES.immunizationsDue, tone: "sky" },
          { value: followups.data?.length ?? 0, label: "exposure follow-ups in 14 days", href: ROUTES.exposureManagementIncidents, tone: "amber" },
        ]}
      />
      <OhImmCoverageGrid summary={home} />
      <ViewGrid>
        <OhImmShelfLife summary={home} />
        <OhImmDoses summary={home} />
      </ViewGrid>
    </div>
  );
}
