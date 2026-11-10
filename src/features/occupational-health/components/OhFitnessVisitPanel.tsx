"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { FitnessSummary } from "@/app/(app)/fitness/_components/shared/FitnessSummary";
import { ROUTES } from "@/constants/routes";

/** Fit-for-duty summary inside the OH visit: medical, vaccinations, D&A, fit test, training, health checks. */
export function OhFitnessVisitPanel({ customerUuid }: { customerUuid: string }) {
  return (
    <div className="max-w-3xl space-y-6" data-testid="oh-fitness-visit-panel">
      <FitnessSummary
        customerUuid={customerUuid}
        showWorker
        action={
          <Link
            href={ROUTES.fitnessBoard}
            className="inline-flex items-center gap-0.5 text-[12.5px] font-medium text-brand-primary hover:underline"
          >
            Fitness board
            <ArrowUpRight className="size-3.5" aria-hidden />
          </Link>
        }
      />
      <p className="text-[11.5px] text-dash-muted">
        Recalculated whenever this visit&apos;s certificate, tests or training are saved.
      </p>
    </div>
  );
}
