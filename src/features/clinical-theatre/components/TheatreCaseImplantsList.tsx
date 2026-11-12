"use client";

import { useTheatreConsumables } from "@/features/clinical-theatre/hooks/use-clinical-theatre";
import type { TheatreCase } from "@/features/clinical-theatre/types/clinical-theatre.types";
import {
  caseImplants,
  implantSummary,
} from "@/features/clinical-theatre/utils/theatre-cssd-display";

/** Statuses where implants may have been recorded on the case. */
export const IMPLANT_STATUSES = new Set([
  "in_theatre",
  "sign_out",
  "recovery",
  "completed",
]);

/** Read-only list of implants used on a case (traceability summary). */
export function TheatreCaseImplantsList({
  theatreCase,
  title = "Implants used",
  onCopy,
}: {
  theatreCase: TheatreCase;
  title?: string;
  /** When set, shows a button that hands the summary text to the caller. */
  onCopy?: (text: string) => void;
}) {
  const enabled = IMPLANT_STATUSES.has(theatreCase.status);
  const { data: items = [] } = useTheatreConsumables(enabled ? theatreCase.uuid : undefined);
  const implants = caseImplants(items);
  if (!enabled || implants.length === 0) return null;
  const lines = implants.map(implantSummary);
  return (
    <div className="rounded-md border bg-slate-50 px-3 py-2" data-testid="theatre-case-implants">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase text-muted-foreground">{title}</p>
        {onCopy ? (
          <button
            type="button"
            className="text-xs text-brand-primary underline"
            onClick={() => onCopy(lines.join("\n"))}
          >
            Copy into “Implants”
          </button>
        ) : null}
      </div>
      <ul className="mt-1 space-y-0.5 text-sm">
        {implants.map((item, index) => (
          <li key={item.uuid}>
            {lines[index]}
            {Number(item.quantity) !== 1 ? ` × ${Number(item.quantity)}` : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}
