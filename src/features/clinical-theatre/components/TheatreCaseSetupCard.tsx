"use client";

import { Scissors } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useEnsureTheatreCaseForEncounter } from "@/features/clinical-theatre/hooks/use-clinical-theatre";

type TheatreCaseSetupCardProps = {
  encounterUuid: string;
  canBook: boolean;
};

/** Shown when a theatre encounter has no case yet (e.g. opened before drafts). */
export function TheatreCaseSetupCard({
  encounterUuid,
  canBook,
}: TheatreCaseSetupCardProps) {
  const ensure = useEnsureTheatreCaseForEncounter();
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-brand-primary/40 bg-brand-primary/5 px-4 py-3"
      data-testid="theatre-case-setup"
    >
      <div className="flex items-start gap-3">
        <Scissors className="mt-0.5 size-4 text-brand-primary" aria-hidden />
        <div className="text-sm">
          <p className="font-medium text-brand-navy">Set up the theatre case</p>
          <p className="text-muted-foreground">
            This patient is on the theatre queue but has no case yet. Create it
            to record the procedure, team, checklist and notes.
          </p>
        </div>
      </div>
      {canBook ? (
        <Button
          type="button"
          size="sm"
          disabled={ensure.isPending}
          onClick={() => ensure.mutate(encounterUuid)}
          aria-label="Set up theatre case"
          title="Set up theatre case"
        >
          {ensure.isPending ? "Setting up…" : "Set up"}
        </Button>
      ) : (
        <p className="text-xs text-muted-foreground">
          Ask someone with the “Book theatre case” permission to set it up.
        </p>
      )}
      {ensure.error ? (
        <p className="w-full text-sm text-red-600">
          {ensure.error instanceof Error
            ? ensure.error.message
            : "Could not set up the case."}
        </p>
      ) : null}
    </div>
  );
}
