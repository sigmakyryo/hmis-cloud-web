import { BFF_CLINICAL_THEATRE_ROUTES as ROUTES } from "@/constants/clinical-theatre-api";
import { planningQuery } from "@/features/clinical-theatre/services/theatre-planning.service";
import type {
  TheatreCaseTray,
  TheatreCountCategory,
  TheatreCountPhase,
  TheatreCountResolvePayload,
  TheatreCountState,
  TheatreCountWitness,
  TheatreCycle,
  TheatreCycleCreatePayload,
  TheatreCycleFilters,
  TheatreCycleResultPayload,
  TheatreImplantBatch,
  TheatreImplantRecallFilters,
  TheatreImplantRecallResult,
  TheatreSteriliser,
  TheatreSteriliserPayload,
  TheatreTray,
  TheatreTrayDetail,
  TheatreTrayFilters,
  TheatreTrayIssuePayload,
  TheatreTraySet,
  TheatreTraySetPayload,
} from "@/features/clinical-theatre/types/theatre-cssd.types";
import { bffRequest } from "@/lib/bff-client";

// --- setup -----------------------------------------------------------------

export function fetchTheatreSterilisers(includeArchived = false) {
  return bffRequest<TheatreSteriliser[]>(
    `${ROUTES.sterilisers}${planningQuery({ include_archived: includeArchived })}`,
  );
}

export function saveTheatreSteriliser(payload: TheatreSteriliserPayload, uuid?: string) {
  return bffRequest<TheatreSteriliser>(uuid ? ROUTES.steriliser(uuid) : ROUTES.sterilisers, {
    method: uuid ? "PATCH" : "POST",
    body: payload,
  });
}

export function fetchTheatreTraySets(includeArchived = false) {
  return bffRequest<TheatreTraySet[]>(
    `${ROUTES.traySets}${planningQuery({ include_archived: includeArchived })}`,
  );
}

export function saveTheatreTraySet(payload: TheatreTraySetPayload, uuid?: string) {
  return bffRequest<TheatreTraySet>(uuid ? ROUTES.traySet(uuid) : ROUTES.traySets, {
    method: uuid ? "PATCH" : "POST",
    body: payload,
  });
}

export function archiveTheatreTraySet(uuid: string) {
  return bffRequest<void>(ROUTES.traySet(uuid), { method: "DELETE" });
}

export function fetchTheatreTrays(filters: TheatreTrayFilters = {}) {
  return bffRequest<TheatreTray[]>(`${ROUTES.trays}${planningQuery(filters)}`);
}

export function fetchTheatreTray(uuid: string) {
  return bffRequest<TheatreTrayDetail>(ROUTES.tray(uuid));
}

export function createTheatreTray(payload: {
  tray_set_uuid: string;
  barcode: string;
  label?: string;
  notes?: string;
}) {
  return bffRequest<TheatreTray>(ROUTES.trays, { method: "POST", body: payload });
}

export function retireTheatreTray(uuid: string) {
  return bffRequest<void>(ROUTES.tray(uuid), { method: "DELETE" });
}

export function quarantineTheatreTray(uuid: string, reason: string) {
  return bffRequest<TheatreTray>(ROUTES.trayQuarantine(uuid), {
    method: "POST",
    body: { reason },
  });
}

export function releaseTheatreTrayQuarantine(uuid: string, reason = "") {
  return bffRequest<TheatreTray>(ROUTES.trayReleaseQuarantine(uuid), {
    method: "POST",
    body: { reason },
  });
}

// --- cycles ----------------------------------------------------------------

export function fetchTheatreCycles(filters: TheatreCycleFilters = {}) {
  return bffRequest<TheatreCycle[]>(`${ROUTES.cycles}${planningQuery(filters)}`);
}

export function fetchTheatreCycle(uuid: string) {
  return bffRequest<TheatreCycle>(ROUTES.cycle(uuid));
}

export function startTheatreCycle(payload: TheatreCycleCreatePayload) {
  return bffRequest<TheatreCycle>(ROUTES.cycles, { method: "POST", body: payload });
}

export function recordTheatreCycleResult(uuid: string, payload: TheatreCycleResultPayload) {
  return bffRequest<TheatreCycle>(ROUTES.cycleResult(uuid), { method: "POST", body: payload });
}

export function recallTheatreCycle(uuid: string, reason: string) {
  return bffRequest<TheatreCycle>(ROUTES.cycleRecall(uuid), {
    method: "POST",
    body: { reason },
  });
}

// --- case trays ------------------------------------------------------------

export function fetchTheatreCaseTrays(caseUuid: string) {
  return bffRequest<TheatreCaseTray[]>(ROUTES.caseTrays(caseUuid));
}

export function fetchTheatreAvailableTrays(caseUuid: string, q = "") {
  return bffRequest<TheatreTray[]>(
    `${ROUTES.caseTraysAvailable(caseUuid)}${planningQuery({ q })}`,
  );
}

export function assignTheatreTray(
  caseUuid: string,
  payload: { tray_uuid?: string; barcode?: string },
) {
  return bffRequest<TheatreCaseTray[]>(ROUTES.caseTrays(caseUuid), {
    method: "POST",
    body: payload,
  });
}

export function releaseTheatreCaseTray(caseUuid: string, itemUuid: string, reason = "") {
  return bffRequest<TheatreCaseTray[]>(ROUTES.caseTrayRelease(caseUuid, itemUuid), {
    method: "POST",
    body: { reason },
  });
}

export function returnTheatreCaseTray(
  caseUuid: string,
  itemUuid: string,
  payload: { issues: TheatreTrayIssuePayload[]; notes?: string },
) {
  return bffRequest<TheatreCaseTray[]>(ROUTES.caseTrayReturn(caseUuid, itemUuid), {
    method: "POST",
    body: payload,
  });
}

// --- counts ----------------------------------------------------------------

export function fetchTheatreCounts(caseUuid: string) {
  return bffRequest<TheatreCountState>(ROUTES.counts(caseUuid));
}

export function startTheatreCount(caseUuid: string) {
  return bffRequest<TheatreCountState>(ROUTES.counts(caseUuid), { method: "POST", body: {} });
}

export function addTheatreCountItem(
  caseUuid: string,
  payload: {
    category: TheatreCountCategory;
    name?: string;
    product_uuid?: string | null;
    quantity: number;
  },
) {
  return bffRequest<TheatreCountState>(ROUTES.countItems(caseUuid), {
    method: "POST",
    body: payload,
  });
}

export function updateTheatreCountItem(
  caseUuid: string,
  itemUuid: string,
  payload: { name?: string; initial?: number },
) {
  return bffRequest<TheatreCountState>(ROUTES.countItem(caseUuid, itemUuid), {
    method: "PATCH",
    body: payload,
  });
}

export function removeTheatreCountItem(caseUuid: string, itemUuid: string) {
  return bffRequest<TheatreCountState>(ROUTES.countItem(caseUuid, itemUuid), {
    method: "DELETE",
  });
}

export function addToTheatreCountItem(caseUuid: string, itemUuid: string, quantity: number) {
  return bffRequest<TheatreCountState>(ROUTES.countItemAdd(caseUuid, itemUuid), {
    method: "POST",
    body: { quantity },
  });
}

export function recordTheatreCounts(
  caseUuid: string,
  phase: TheatreCountPhase,
  counts: Record<string, number | null>,
) {
  return bffRequest<TheatreCountState>(ROUTES.countRecord(caseUuid), {
    method: "POST",
    body: { phase, counts },
  });
}

export function confirmTheatreCount(
  caseUuid: string,
  payload: { phase: TheatreCountPhase; witness_id: number; notes?: string },
) {
  return bffRequest<TheatreCountState>(ROUTES.countConfirm(caseUuid), {
    method: "POST",
    body: payload,
  });
}

export function resolveTheatreCount(caseUuid: string, payload: TheatreCountResolvePayload) {
  return bffRequest<TheatreCountState>(ROUTES.countResolve(caseUuid), {
    method: "POST",
    body: payload,
  });
}

export function fetchTheatreCountWitnesses(caseUuid: string, q = "") {
  return bffRequest<TheatreCountWitness[]>(
    `${ROUTES.countWitnesses(caseUuid)}${planningQuery({ q })}`,
  );
}

// --- implants --------------------------------------------------------------

export function fetchTheatreImplantRecall(filters: TheatreImplantRecallFilters) {
  return bffRequest<TheatreImplantRecallResult>(
    `${ROUTES.implantRecall}${planningQuery(filters)}`,
  );
}

/** Same-origin URL of the CSV export for the given filters. */
export function theatreImplantRecallExportUrl(filters: TheatreImplantRecallFilters): string {
  return `${ROUTES.implantRecallExport}${planningQuery(filters)}`;
}

export function fetchTheatreImplantBatches(productUuid: string) {
  return bffRequest<TheatreImplantBatch[]>(
    `${ROUTES.implantBatches}${planningQuery({ product: productUuid })}`,
  );
}
