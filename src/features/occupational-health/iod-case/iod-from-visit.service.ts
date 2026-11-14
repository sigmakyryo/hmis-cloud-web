import { BFF_OCCUPATIONAL_HEALTH_ROUTES } from "@/constants/api";
import { bffRequest } from "@/lib/bff-client";

const routes = BFF_OCCUPATIONAL_HEALTH_ROUTES;

/** The case already recorded from an OPD encounter, or null when there is none. */
export type IodForEncounter = { uuid: string; status: string; ai_status: string } | null;

export const iodForEncounterKey = (encounterUuid: string) =>
  ["oh-iod-for-encounter", encounterUuid] as const;

export async function fetchIodForEncounter(encounterUuid: string): Promise<IodForEncounter> {
  return (await bffRequest<IodForEncounter | undefined>(routes.opdIodByEncounter(encounterUuid))) ?? null;
}

export type RecordIodFromEncounterInput = {
  visit_uuid: string;
  encounter_uuid: string;
  onset_date?: string;
  note?: string;
};

export const recordIodFromEncounter = (input: RecordIodFromEncounterInput) =>
  bffRequest<{ uuid: string; status: string }>(routes.opdIodCases, {
    method: "POST",
    body: input,
  });

export const draftIodFromVisit = (caseUuid: string) =>
  bffRequest<{ uuid: string; ai_status: string }>(routes.iodCaseDocument(caseUuid), {
    method: "POST",
    body: {},
  });
