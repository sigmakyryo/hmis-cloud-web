"use client";

import { FitnessSummary } from "@/app/(app)/fitness/_components/shared/FitnessSummary";

/** Fitness tab on the OH employee record. */
export function OhEmployeeFitnessPanel({ customerUuid }: { customerUuid: string }) {
  return (
    <div className="px-4 py-4 md:px-6" data-testid="oh-employee-fitness-panel">
      <FitnessSummary customerUuid={customerUuid} />
    </div>
  );
}
