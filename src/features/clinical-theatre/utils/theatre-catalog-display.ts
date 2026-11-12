import type {
  TheatreCaseProcedure,
  TheatreCaseStatus,
  TheatreProcedureCodeRef,
} from "@/features/clinical-theatre/types/clinical-theatre.types";
import type {
  TheatrePlannedItem,
  TheatrePriceSource,
  TheatreProcedureCodeSystem,
} from "@/features/clinical-theatre/types/theatre-catalog.types";

export const PROCEDURE_CODE_SYSTEM_LABELS: Record<TheatreProcedureCodeSystem, string> = {
  cpt: "CPT",
  icd10pcs: "ICD-10-PCS",
  local: "Local / payer",
};

export const PROCEDURE_CODE_SYSTEMS: TheatreProcedureCodeSystem[] = [
  "icd10pcs",
  "cpt",
  "local",
];

/** Statuses in which charges can be recorded on the case (as the API enforces). */
export const BILLABLE_CASE_STATUSES: ReadonlySet<TheatreCaseStatus> = new Set([
  "in_theatre",
  "sign_out",
  "recovery",
]);

export function priceSourceLabel(source: TheatrePriceSource): string {
  if (source === "pricelist") return "Pricelist price";
  if (source === "free_visit") return "Free visit";
  return "Catalogue price";
}

export function formatProcedureCode(code: Pick<TheatreProcedureCodeRef, "system" | "code">) {
  return `${PROCEDURE_CODE_SYSTEM_LABELS[code.system] ?? code.system} ${code.code}`;
}

/** Codes as one line, primary first: "ICD-10-PCS 0DTJ4ZZ, CPT 44970". */
export function formatProcedureCodes(codes: TheatreProcedureCodeRef[] | undefined): string {
  if (!codes?.length) return "";
  return [...codes]
    .sort((a, b) => Number(b.is_primary) - Number(a.is_primary))
    .map(formatProcedureCode)
    .join(", ");
}

export type ProcedureBillingState = "legacy" | "billed" | "unbilled";

export function procedureBillingState(
  procedure: Pick<TheatreCaseProcedure, "product_uuid" | "is_billed">,
): ProcedureBillingState {
  if (!procedure.product_uuid) return "legacy";
  return procedure.is_billed ? "billed" : "unbilled";
}

export function canBillProcedure(
  procedure: Pick<TheatreCaseProcedure, "product_uuid" | "is_billed">,
  status: TheatreCaseStatus,
): boolean {
  return (
    procedureBillingState(procedure) === "unbilled" && BILLABLE_CASE_STATUSES.has(status)
  );
}

export function plannedItemCounts(items: TheatrePlannedItem[]) {
  return items.reduce(
    (counts, item) => ({ ...counts, [item.status]: counts[item.status] + 1 }),
    { planned: 0, confirmed: 0, dismissed: 0 },
  );
}

/** One tray per line (or comma separated) → trimmed, de-duplicated names. */
export function parseTrayList(text: string): string[] {
  const seen = new Set<string>();
  for (const part of text.split(/[\n,]/)) {
    const name = part.trim();
    if (name) seen.add(name);
  }
  return [...seen];
}
