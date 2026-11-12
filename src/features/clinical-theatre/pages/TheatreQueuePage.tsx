"use client";

import { useMyClinicalCapabilities } from "@/features/clinical-opd/hooks/use-clinical-opd";
import { ClinicalQueuePage } from "@/features/clinical-opd/pages/ClinicalQueuePage";
import { TheatreCrashCaseDialog } from "@/features/clinical-theatre/components/TheatreCrashCaseDialog";
import { THEATRE_WORKSPACE_ROUTING } from "@/features/clinical-theatre/constants/theatre-workspace-routing";

export function TheatreQueuePage() {
  const { data } = useMyClinicalCapabilities();
  const canCrash = (data?.capabilities ?? []).includes("start_theatre_crash_case");
  return (
    <>
      {canCrash ? (
        <div className="flex justify-end px-4 pt-3 sm:px-6" data-testid="theatre-queue-toolbar">
          <TheatreCrashCaseDialog />
        </div>
      ) : null}
      <ClinicalQueuePage routing={THEATRE_WORKSPACE_ROUTING} />
    </>
  );
}
