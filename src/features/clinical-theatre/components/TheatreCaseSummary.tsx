"use client";

import Link from "next/link";

import { StatusDotBadge } from "@/components/ui/status-dot-badge";
import { ROUTES } from "@/constants/routes";
import { TheatreCaseImplantsList } from "@/features/clinical-theatre/components/TheatreCaseImplantsList";
import type { TheatreCase } from "@/features/clinical-theatre/types/clinical-theatre.types";
import {
  THEATRE_STATUS_LABELS,
  formatTheatreSlot,
  theatreStatusTone,
} from "@/features/clinical-theatre/utils/theatre-case-display";

const SOURCE_LABELS: Record<TheatreCase["source"], string> = {
  ipd_stay: "Inpatient",
  existing_visit: "Existing visit",
  elective: "Day case",
};

type TheatreCaseSummaryProps = {
  theatreCase: TheatreCase;
  /** Show a link to the theatre workspace when the case has an encounter. */
  showWorkspaceLink?: boolean;
  /** List implants used on the case (fetched only once implants are possible). */
  showImplants?: boolean;
};

export function TheatreCaseSummary({
  theatreCase,
  showWorkspaceLink = false,
  showImplants = false,
}: TheatreCaseSummaryProps) {
  const workspaceHref =
    theatreCase.visit_uuid && theatreCase.encounter_uuid
      ? ROUTES.clinicalTheatreEncounter(
          theatreCase.visit_uuid,
          theatreCase.encounter_uuid,
        )
      : null;

  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="space-y-1 text-sm">
        <p className="font-medium text-brand-navy">
          {theatreCase.procedure_description || "Theatre case"}
        </p>
        <p className="text-muted-foreground">
          {formatTheatreSlot(theatreCase)} ·{" "}
          {theatreCase.room ? theatreCase.room.name : "No room yet"}
        </p>
        <p className="text-muted-foreground">
          {SOURCE_LABELS[theatreCase.source]} · {theatreCase.urgency}
          {theatreCase.lead_surgeon_name
            ? ` · Surgeon: ${theatreCase.lead_surgeon_name}`
            : ""}
        </p>
        {showImplants ? <TheatreCaseImplantsList theatreCase={theatreCase} /> : null}
        {showWorkspaceLink && workspaceHref ? (
          <Link className="text-brand-primary underline" href={workspaceHref}>
            Open theatre workspace
          </Link>
        ) : null}
      </div>
      <StatusDotBadge tone={theatreStatusTone(theatreCase.status)}>
        {THEATRE_STATUS_LABELS[theatreCase.status]}
      </StatusDotBadge>
    </div>
  );
}
