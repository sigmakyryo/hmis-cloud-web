import { describe, expect, it } from "vitest";

import {
  NON_STARTABLE_FROM_CUSTOMERS,
  startableFromCustomers,
} from "@/features/occupational-health/lib/oh-visit-types";

describe("startableFromCustomers", () => {
  it("removes Injury on Duty and keeps every other visit type in order", () => {
    const types = [
      { code: "pre_employment", name: "Pre-employment" },
      { code: "injury_on_duty", name: "Injury on Duty" },
      { code: "periodic", name: "Periodic" },
      { code: null, name: "Custom" },
      { name: "No code" },
    ];

    expect(startableFromCustomers(types).map((type) => type.name)).toEqual([
      "Pre-employment",
      "Periodic",
      "Custom",
      "No code",
    ]);
    expect(NON_STARTABLE_FROM_CUSTOMERS).toEqual(["injury_on_duty"]);
  });
});
