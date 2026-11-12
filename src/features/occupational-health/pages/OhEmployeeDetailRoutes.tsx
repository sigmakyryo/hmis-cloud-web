"use client";

import { OhEmployeeEmploymentPanel } from "@/features/occupational-health/components/OhEmployeeDetailSections";
import { OhEmployeeFormsTab } from "@/features/occupational-health/components/OhEmployeeFormsTab";
import { OhEmployeeImmunizationsPanel } from "@/features/occupational-health/components/OhEmployeeImmunizationsPanel";
import { OhEmployeeDrugAlcoholPanel } from "@/features/occupational-health/components/OhEmployeeDrugAlcoholPanel";
import { OhEmployeeFitnessPanel } from "@/features/occupational-health/components/OhEmployeeFitnessPanel";
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
  const { customer } = useOhEmployeeDetail();
  return <OhEmployeeDrugAlcoholPanel customerUuid={customer.uuid} />;
}

export function OhEmployeeFitnessRoute() {
  const { customer } = useOhEmployeeDetail();
  return <OhEmployeeFitnessPanel customerUuid={customer.uuid} />;
}
