"use client";

import Link from "next/link";

import { FitnessSummary } from "@/app/(app)/fitness/_components/shared/FitnessSummary";
import { ROUTES } from "@/constants/routes";

/** Fit-for-duty summary inside the OH visit: medical, vaccinations, D&A, fit test, training, health checks. */
export function OhFitnessVisitPanel({ customerUuid }: { customerUuid: string }) {
  return (
    <div className="space-y-3" data-testid="oh-fitness-visit-panel">
      <p className="text-[13px] text-dash-muted">
        One answer from every check on file. It updates when this visit&apos;s certificate, tests or training are saved.
      </p>
      <FitnessSummary customerUuid={customerUuid} />
      <Link href={ROUTES.fitnessBoard} className="text-[13px] font-medium text-brand-primary hover:underline">
        Open the fitness board
      </Link>
    </div>
  );
}
