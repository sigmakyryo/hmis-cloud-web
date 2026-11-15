/** Where a clinic allows an injury-on-duty record on a fitness visit. */
export type OhIodApplicability = {
  cof: boolean;
  exam: boolean;
  visit_type_codes: string[];
};

export const IOD_APPLICABILITY_NONE: OhIodApplicability = {
  cof: false,
  exam: false,
  visit_type_codes: [],
};

/**
 * The readiness row shows when certificate or exam is on, or the visit type is selected.
 * Checking exam or certificate applies to every fitness visit.
 */
export function iodApplies(
  setting: OhIodApplicability,
  visitTypeCode: string | null | undefined,
): boolean {
  if (setting.cof || setting.exam) {
    return true;
  }
  if (!visitTypeCode) {
    return false;
  }
  return setting.visit_type_codes.includes(visitTypeCode);
}
