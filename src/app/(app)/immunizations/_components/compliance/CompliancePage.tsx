"use client";

import { useQuery } from "@tanstack/react-query";

import { ImmPageShell } from "../shared/ImmPageShell";
import { ComplianceOverview } from "./ComplianceOverview";
import { fetchOhImmCompliance } from "@/features/occupational-health/services/immunisation.service";

export function CompliancePage() {
  const compliance = useQuery({
    queryKey: ["oh-imm-compliance", "employer"],
    queryFn: () => fetchOhImmCompliance("employer"),
  });

  return (
    <ImmPageShell
      testId="oh-immunizations-compliance-page"
      title="Compliance"
      description="Coverage by group for published schedules with a fitness gate."
    >
      {compliance.isError ? (
        <p className="text-sm text-destructive" role="alert">
          Could not load compliance. Check your connection and try again.
        </p>
      ) : (
        <ComplianceOverview data={compliance.data} loading={compliance.isLoading} />
      )}
    </ImmPageShell>
  );
}
