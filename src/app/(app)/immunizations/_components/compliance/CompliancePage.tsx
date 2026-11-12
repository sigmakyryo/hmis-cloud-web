"use client";

import { useQuery } from "@tanstack/react-query";

import { ImmPageShell } from "../shared/ImmPageShell";
import { LoadError } from "../shared/QuietLoading";
import { ComplianceOverview } from "./ComplianceOverview";
import { fetchOhImmCompliance } from "@/features/occupational-health/services/immunisation.service";

export function CompliancePage() {
  const compliance = useQuery({
    queryKey: ["oh-imm-compliance", "employer"],
    queryFn: () => fetchOhImmCompliance("employer"),
  });

  return (
    <ImmPageShell testId="oh-immunizations-compliance-page" title="Compliance">
      {compliance.isError ? (
        <LoadError>Could not load compliance. Check your connection and try again.</LoadError>
      ) : (
        <ComplianceOverview data={compliance.data} loading={compliance.isLoading} />
      )}
    </ImmPageShell>
  );
}
