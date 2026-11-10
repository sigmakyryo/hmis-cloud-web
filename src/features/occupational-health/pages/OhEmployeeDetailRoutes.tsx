"use client";

import { FileWarning } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import { OhEmployeeEmploymentPanel } from "@/features/occupational-health/components/OhEmployeeDetailSections";
import { OhEmployeeFormsTab } from "@/features/occupational-health/components/OhEmployeeFormsTab";
import { OhEmployeeImmunizationsPanel } from "@/features/occupational-health/components/OhEmployeeImmunizationsPanel";
import { useOhEmployeeDetail } from "@/features/occupational-health/components/oh-employee-detail-context";

export function OhEmployeeEmploymentRoute() {
  const { episodes, names } = useOhEmployeeDetail();
  return <OhEmployeeEmploymentPanel episodes={episodes} names={names} />;
}

export function OhEmployeeFormsRoute() {
  const { customer, activeEpisode, employer, profile } = useOhEmployeeDetail();
  return (
    <OhEmployeeFormsTab
      customerUuid={customer.uuid}
      employerId={activeEpisode?.employer ?? null}
      employerUuid={employer?.uuid ?? profile?.employer_uuid ?? null}
      employerName={employer?.name ?? null}
      hazardProfileId={activeEpisode?.hazard_profile ?? null}
    />
  );
}

export function OhEmployeeImmunizationsRoute() {
  const { customer } = useOhEmployeeDetail();
  return <OhEmployeeImmunizationsPanel customerUuid={customer.uuid} />;
}

export function OhEmployeeDrugAlcoholRoute() {
  return (
    <EmptyState
      icon={FileWarning}
      title="Drug and alcohol testing is not recorded here yet"
      description="Test results for this employee will appear in this section."
      data-testid="oh-employee-drug-alcohol"
    />
  );
}
