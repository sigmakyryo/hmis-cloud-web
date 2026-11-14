import { ROUTES } from "@/constants/routes";
import type { OhVisitEncounter } from "@/features/occupational-health/types";

export const IOD_VISIT_TYPE_CODE = "injury_on_duty";

type QueueRoutable = Pick<OhVisitEncounter, "visit" | "uuid" | "visit_type" | "iod_case">;

export function isIodVisit(encounter: Pick<OhVisitEncounter, "visit_type">): boolean {
  return encounter.visit_type?.code === IOD_VISIT_TYPE_CODE;
}

/**
 * Where a queue entry opens. Injury on Duty visits open their IOD case in the
 * injuries module; every other OH visit keeps the visit workspace route.
 */
export function ohQueueEntryHref(encounter: QueueRoutable): string {
  if (isIodVisit(encounter) && encounter.iod_case?.uuid) {
    return ROUTES.occupationalHealthRecord("iod", encounter.iod_case.uuid);
  }
  return ROUTES.occupationalHealthEncounter(encounter.visit, encounter.uuid);
}
