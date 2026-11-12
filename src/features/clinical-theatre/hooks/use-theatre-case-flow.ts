"use client";

import {
  useTheatreAnaesthesia,
  useTheatreOperationNote,
} from "@/features/clinical-theatre/hooks/use-clinical-theatre";
import type { TheatreCase } from "@/features/clinical-theatre/types/clinical-theatre.types";
import {
  theatreStatusRank,
  type TheatreFlowExtras,
} from "@/features/clinical-theatre/utils/theatre-case-flow";

/**
 * Step facts that live outside the case list item: whether the op note is
 * signed and how many monitor readings await review. Only fetched once the
 * case is in theatre (same cache entries the panels use).
 */
export function useTheatreFlowExtras(
  theatreCase: Pick<TheatreCase, "uuid" | "status"> | undefined,
): TheatreFlowExtras {
  const rank = theatreCase ? theatreStatusRank(theatreCase.status) : -1;
  const anaesthesia = useTheatreAnaesthesia(rank >= 3 ? theatreCase?.uuid : undefined);
  const note = useTheatreOperationNote(rank >= 4 ? theatreCase?.uuid : undefined);
  return {
    operationNoteSigned: note.data ? Boolean(note.data.signed_at) : null,
    pendingDeviceVitals: anaesthesia.data?.pending_device_vitals ?? 0,
  };
}
