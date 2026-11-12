"use client";

import { StatusDotBadge } from "@/components/ui/status-dot-badge";
import type { TheatreReadiness } from "@/features/clinical-theatre/types/theatre-planning.types";
import {
  READINESS_LABELS,
  READINESS_TONE,
} from "@/features/clinical-theatre/utils/theatre-planning-display";

/** Pre-op readiness (fitness clearance) for a waiting-list entry or case. */
export function TheatreReadinessBadge({
  readiness,
  showWarning = false,
}: {
  readiness: TheatreReadiness;
  showWarning?: boolean;
}) {
  return (
    <span className="inline-flex flex-col gap-0.5" data-testid="theatre-readiness">
      <StatusDotBadge tone={READINESS_TONE[readiness.status]}>
        {READINESS_LABELS[readiness.status]}
        {readiness.status === "ready" && readiness.valid_until
          ? ` · until ${readiness.valid_until}`
          : ""}
      </StatusDotBadge>
      {showWarning && readiness.warning ? (
        <span className="text-xs text-amber-700">{readiness.warning}</span>
      ) : null}
    </span>
  );
}
