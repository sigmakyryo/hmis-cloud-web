import { describe, expect, it } from "vitest";

import { isEmployeeBasedOrganization } from "@/features/settings/utils/organization-type";

describe("contractors tab org-type gate", () => {
  it("shows contractors only for employee-based organizations", () => {
    expect(
      isEmployeeBasedOrganization({ organization_type: "employee" }),
    ).toBe(true);
    expect(
      isEmployeeBasedOrganization({ organization_type: "public" }),
    ).toBe(false);
  });
});
