"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { FitnessSummary } from "@/app/(app)/fitness/_components/shared/FitnessSummary";
import { ROUTES } from "@/constants/routes";

/** Fit-for-duty summary inside the OH visit: medical, vaccinations, D&A, fit test, training, health checks. */
export function OhFitnessVisitPanel({ customerUuid }: { customerUuid: string }) {
  return (
    <div data-testid="oh-fitness-visit-panel">
      <FitnessSummary
        customerUuid={customerUuid}
        showWorker
        note="Recalculated whenever this visit's certificate, tests or training are saved."
        action={
          <Link
            href={ROUTES.fitnessBoard}
            className="inline-flex shrink-0 items-center gap-0.5 text-[12.5px] font-medium text-brand-primary hover:underline"
          >
            Fitness board
            <ArrowUpRight className="size-3.5" aria-hidden />
          </Link>
        }
      />
    </div>
  );
}
