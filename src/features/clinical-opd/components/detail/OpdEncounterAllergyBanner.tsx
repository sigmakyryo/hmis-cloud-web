"use client";

import { useState } from "react";

import { OpdManageAllergiesDialog } from "@/features/clinical-opd/components/detail/OpdManageAllergiesDialog";
import { useOpdEncounterWorkspace } from "@/features/clinical-opd/components/detail/opd-encounter-workspace-context";
import type { ChartAllergy } from "@/features/clinical-opd/types/clinical-opd.types";

const HIGH_SEVERITY = new Set(["severe", "life_threatening"]);

type OpdEncounterAllergyBannerProps = {
  allergies: ChartAllergy[];
};

export function OpdEncounterAllergyBanner({
  allergies,
}: OpdEncounterAllergyBannerProps) {
  const {
    visitUuid,
    encounterUuid,
    visibleTabIds,
    capabilities,
    isChartLocked,
  } = useOpdEncounterWorkspace();
  const [manageOpen, setManageOpen] = useState(false);
  const active = allergies.filter(Boolean);
  const canManage =
    visibleTabIds.includes("allergies") ||
    (capabilities.includes("record_allergy") && !isChartLocked);

  if (active.length === 0) {
    return null;
  }

  const highRisk = active.some((allergy) =>
    HIGH_SEVERITY.has(allergy.severity),
  );
  const names = active
    .map((allergy) => `${allergy.allergy_name} (${allergy.severity})`)
    .join(", ");

  return (
    <>
      <p
        className={
          highRisk
            ? "px-4 py-2.5 text-sm text-red-800 sm:px-6"
            : "px-4 py-2.5 text-sm text-amber-800 sm:px-6"
        }
        data-testid="opd-encounter-allergy-banner"
      >
        <span className="font-medium">
          {highRisk ? "High-risk allergies on file" : "Allergies on file"}
        </span>
        {": "}
        {names}
        {canManage ? (
          <>
            {" "}
            <button
              type="button"
              className="font-medium text-brand-primary hover:underline"
              onClick={() => setManageOpen(true)}
              data-testid="opd-encounter-allergy-banner-review"
            >
              Review allergies
            </button>
          </>
        ) : null}
      </p>
      {canManage ? (
        <OpdManageAllergiesDialog
          open={manageOpen}
          onOpenChange={setManageOpen}
          visitUuid={visitUuid}
          encounterUuid={encounterUuid}
        />
      ) : null}
    </>
  );
}
