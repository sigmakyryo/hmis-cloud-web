import { BFF_CLINICAL_THEATRE_ROUTES as ROUTES } from "@/constants/clinical-theatre-api";
import type {
  SaveTheatrePreferenceCardPayload,
  TheatreCase,
  TheatreCasePlannedItems,
  TheatrePreferenceCard,
  TheatrePreferenceCardPayload,
  TheatreProcedureCode,
  TheatreProcedureCodeFilters,
  TheatreProcedureCodeImportPayload,
  TheatreProcedureCodeImportResult,
  TheatreProcedureCodeRef,
  TheatreProcedureCodeSystem,
  TheatreProcedureProduct,
} from "@/features/clinical-theatre/types/theatre-catalog.types";
import { bffRequest } from "@/lib/bff-client";

function theatreQueryString(params: Record<string, string | boolean | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "" || value === false) continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

/** Procedure products from the catalogue (theatre scope), with billing price. */
export function searchTheatreProcedureProducts(params: {
  q?: string;
  caseUuid?: string;
  limit?: number;
}) {
  return bffRequest<TheatreProcedureProduct[]>(
    `${ROUTES.procedureProducts}${theatreQueryString({
      q: params.q?.trim(),
      case: params.caseUuid,
      limit: params.limit ? String(params.limit) : undefined,
    })}`,
  );
}

export function billTheatreCaseProcedure(caseUuid: string, procedureUuid: string) {
  return bffRequest<TheatreCase>(ROUTES.procedureBill(caseUuid, procedureUuid), {
    method: "POST",
    body: {},
  });
}

export function fetchTheatreProcedureCodes(filters: TheatreProcedureCodeFilters = {}) {
  return bffRequest<TheatreProcedureCode[]>(
    `${ROUTES.procedureCodes}${theatreQueryString({
      system: filters.system || undefined,
      q: filters.q?.trim(),
      include_inactive: filters.includeInactive,
      page_size: "100",
    })}`,
  );
}

export function createTheatreProcedureCode(payload: {
  system: TheatreProcedureCodeSystem;
  code: string;
  description?: string;
}) {
  return bffRequest<TheatreProcedureCode>(ROUTES.procedureCodes, {
    method: "POST",
    body: payload,
  });
}

export function updateTheatreProcedureCode(
  uuid: string,
  payload: { description?: string; is_active?: boolean },
) {
  return bffRequest<TheatreProcedureCode>(ROUTES.procedureCode(uuid), {
    method: "PATCH",
    body: payload,
  });
}

export function importTheatreProcedureCodes(payload: TheatreProcedureCodeImportPayload) {
  return bffRequest<TheatreProcedureCodeImportResult>(ROUTES.procedureCodesImport, {
    method: "POST",
    body: payload,
    timeoutMs: 120_000,
  });
}

export function loadTheatreProcedureCodeSample() {
  return bffRequest<TheatreProcedureCodeImportResult>(ROUTES.procedureCodesLoadSample, {
    method: "POST",
    body: {},
  });
}

export function fetchTheatreProductCodes(productUuid: string) {
  return bffRequest<TheatreProcedureCodeRef[]>(ROUTES.procedureProductCodes(productUuid));
}

export function setTheatreProductCodes(
  productUuid: string,
  codes: Array<{ code: string; is_primary: boolean }>,
) {
  return bffRequest<TheatreProcedureCodeRef[]>(ROUTES.procedureProductCodes(productUuid), {
    method: "PUT",
    body: { codes },
  });
}

export function fetchTheatrePreferenceCards(
  params: { mine?: boolean; includeInactive?: boolean } = {},
) {
  return bffRequest<TheatrePreferenceCard[]>(
    `${ROUTES.preferenceCards}${theatreQueryString({
      mine: params.mine,
      include_inactive: params.includeInactive,
    })}`,
  );
}

export function createTheatrePreferenceCard(payload: TheatrePreferenceCardPayload) {
  return bffRequest<TheatrePreferenceCard>(ROUTES.preferenceCards, {
    method: "POST",
    body: payload,
  });
}

export function updateTheatrePreferenceCard(
  uuid: string,
  payload: TheatrePreferenceCardPayload,
) {
  return bffRequest<TheatrePreferenceCard>(ROUTES.preferenceCard(uuid), {
    method: "PATCH",
    body: payload,
  });
}

export function archiveTheatrePreferenceCard(uuid: string) {
  return bffRequest<void>(ROUTES.preferenceCard(uuid), { method: "DELETE" });
}

export function fetchTheatrePlannedItems(caseUuid: string) {
  return bffRequest<TheatreCasePlannedItems>(ROUTES.plannedItems(caseUuid));
}

export function loadTheatrePreferenceCard(caseUuid: string, cardUuid?: string | null) {
  return bffRequest<TheatreCasePlannedItems>(ROUTES.plannedItemsLoad(caseUuid), {
    method: "POST",
    body: cardUuid ? { card: cardUuid } : {},
  });
}

export function confirmTheatrePlannedItem(
  caseUuid: string,
  itemUuid: string,
  quantity?: string,
) {
  return bffRequest<TheatreCasePlannedItems>(
    ROUTES.plannedItemConfirm(caseUuid, itemUuid),
    { method: "POST", body: quantity ? { quantity } : {} },
  );
}

export function dismissTheatrePlannedItem(caseUuid: string, itemUuid: string) {
  return bffRequest<TheatreCasePlannedItems>(
    ROUTES.plannedItemDismiss(caseUuid, itemUuid),
    { method: "POST", body: {} },
  );
}

export function confirmAllTheatrePlannedItems(caseUuid: string) {
  return bffRequest<TheatreCasePlannedItems>(ROUTES.plannedItemsConfirmAll(caseUuid), {
    method: "POST",
    body: {},
  });
}

export function saveTheatreCaseAsPreferenceCard(
  caseUuid: string,
  payload: SaveTheatrePreferenceCardPayload = {},
) {
  return bffRequest<TheatrePreferenceCard>(ROUTES.savePreferenceCard(caseUuid), {
    method: "POST",
    body: payload,
  });
}
