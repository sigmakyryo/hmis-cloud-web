import { describe, expect, it } from "vitest";

import {
  formatOrganizationTypeLabel,
  getInternalReferenceLabel,
  getInternalReferenceShortLabel,
  isEmployeeBasedOrganization,
  normalizeOrganizationType,
} from "@/features/settings/utils/organization-type";

describe("organization-type helpers", () => {
  it("defaults unknown values to public", () => {
    expect(normalizeOrganizationType(undefined)).toBe("public");
    expect(normalizeOrganizationType("nope")).toBe("public");
    expect(isEmployeeBasedOrganization({ organization_type: "public" })).toBe(
      false,
    );
    expect(isEmployeeBasedOrganization({ organization_type: "employee" })).toBe(
      true,
    );
  });

  it("labels internal reference for each mode", () => {
    expect(getInternalReferenceLabel({ organization_type: "public" })).toBe(
      "Internal reference",
    );
    expect(getInternalReferenceLabel({ organization_type: "employee" })).toBe(
      "Employee number",
    );
    expect(
      getInternalReferenceShortLabel({ organization_type: "employee" }),
    ).toBe("Employee number");
    expect(formatOrganizationTypeLabel("employee")).toBe("Employee-based");
  });
});
