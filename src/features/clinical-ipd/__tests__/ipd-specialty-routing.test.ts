import { describe, expect, it } from "vitest";

import { IPD_WORKSPACE_ROUTING } from "@/features/clinical-ipd/constants/ipd-workspace-routing";
import {
  clinicalSpecialtyForDepartmentType,
  getClinicalSpecialty,
} from "@/features/clinical-workspace/constants/clinical-specialties";
import { clinicalEncounterLandingHref } from "@/features/visits/utils/clinical-encounter-links";

describe("IPD specialty routing", () => {
  it("registers the ipd specialty under /clinical/ipd", () => {
    const specialty = getClinicalSpecialty("ipd");
    expect(specialty.basePath).toBe("/clinical/ipd");
    expect(specialty.moduleName).toBe("IPD");
    expect(specialty.departmentTypes).toContain("ipd");
    expect(specialty.procedureContext).toBe("ipd");
  });

  it("maps department_type ipd to the IPD workspace", () => {
    expect(clinicalSpecialtyForDepartmentType("ipd")?.code).toBe("ipd");
    expect(IPD_WORKSPACE_ROUTING.specialty.code).toBe("ipd");
  });

  it("builds encounter deep links for IPD departments", () => {
    const href = clinicalEncounterLandingHref(
      "ipd",
      "visit-uuid",
      "encounter-uuid",
      ["view_activity_tab"],
      "physician",
    );
    expect(href).toContain("/clinical/ipd/visit-uuid/encounter-uuid");
  });

  it("exposes ward board status labels via bed status values", () => {
    const statuses = ["available", "occupied", "blocked", "maintenance"] as const;
    expect(statuses).toHaveLength(4);
  });
});
