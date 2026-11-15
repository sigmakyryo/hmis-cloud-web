import { ROUTES } from "@/constants/routes";
import type { OhFamilyModule } from "@/features/app-shell/constants/navigation-config";
import {
  OH_CLINICAL_MODULES,
  type OhClinicalModuleId,
} from "@/features/occupational-health/lib/oh-visit-workspace";

/** Optional clinical areas one clinic can switch on or off together. */
export const OH_WORKSPACE_AREAS = [
  "immunizations",
  "drug-alcohol",
  "health-programs",
  "fitness",
  "injuries",
  "employment",
  "exposure",
] as const;

export type OhWorkspaceArea = (typeof OH_WORKSPACE_AREAS)[number];

export const OH_WORKSPACE_AREA_LABEL: Record<OhWorkspaceArea, string> = {
  immunizations: "Immunizations",
  "drug-alcohol": "Drug & alcohol",
  "health-programs": "Health programmes",
  fitness: "Fitness",
  injuries: "Injuries on duty",
  employment: "Employment",
  exposure: "Exposure management",
};

const CLINICAL_RECORD_AREA: Record<OhClinicalModuleId, OhWorkspaceArea> = {
  immunizations: "immunizations",
  "drug-alcohol": "drug-alcohol",
  "health-checks": "health-programs",
  injuries: "injuries",
  fitness: "fitness",
  employment: "employment",
};

const MODULE_AREA: Partial<Record<OhFamilyModule, OhWorkspaceArea>> = {
  Immunizations: "immunizations",
  DrugAlcohol: "drug-alcohol",
  Fitness: "fitness",
  HealthPrograms: "health-programs",
  ExposureManagement: "exposure",
};

const PDF_KEY_AREA: Record<string, OhWorkspaceArea> = {
  immunizations: "immunizations",
  drug_alcohol: "drug-alcohol",
  vision: "health-programs",
  hearing: "health-programs",
  lung: "health-programs",
  ergonomics: "health-programs",
  fatigue: "health-programs",
  fitness: "fitness",
};

/** Keep known area ids, in the checklist order. */
export function orderedWorkspaceAreas(value: readonly string[]): OhWorkspaceArea[] {
  return OH_WORKSPACE_AREAS.filter((area) => value.includes(area));
}

export function visibleClinicalModules(included: readonly OhWorkspaceArea[]) {
  return OH_CLINICAL_MODULES.filter((module) =>
    included.includes(CLINICAL_RECORD_AREA[module.id]),
  );
}

/** Session steps stay visible. A Records panel stays visible only while its area is on. */
export function isRecordPanelIncluded(
  panel: string,
  included: readonly OhWorkspaceArea[],
): boolean {
  const record = OH_CLINICAL_MODULES.find((item) => item.id === panel);
  if (!record) {
    return true;
  }
  return included.includes(CLINICAL_RECORD_AREA[record.id]);
}

export function pdfSectionAllowed(
  key: string,
  included: readonly OhWorkspaceArea[] | undefined,
): boolean {
  if (!included) {
    return true;
  }
  const area = PDF_KEY_AREA[key];
  if (!area) {
    return true;
  }
  return included.includes(area);
}

export function filterPdfExportSections<T extends { key: string }>(
  sections: T[],
  included: readonly OhWorkspaceArea[] | undefined,
): T[] {
  if (!included) {
    return sections;
  }
  return sections.filter((section) => pdfSectionAllowed(section.key, included));
}

/** OHS clinic has no area, so it always stays. */
export function ohFamilyModuleAllowed(
  moduleName: string,
  included: readonly OhWorkspaceArea[] | undefined,
): boolean {
  if (!included) {
    return true;
  }
  const area = MODULE_AREA[moduleName as OhFamilyModule];
  if (!area) {
    return true;
  }
  return included.includes(area);
}

/** Injuries live under OHS clinic, so the page is filtered on its own. */
export function ohNavHrefAllowed(
  href: string,
  included: readonly OhWorkspaceArea[] | undefined,
): boolean {
  if (!included) {
    return true;
  }
  if (href === ROUTES.occupationalHealthInjuries) {
    return included.includes("injuries");
  }
  return true;
}
