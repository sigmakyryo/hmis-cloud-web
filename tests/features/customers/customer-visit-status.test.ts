import { describe, expect, it } from "vitest";

import { formatCustomerVisitStatusLabel } from "@/features/customers/utils/customer-visit-status";

describe("formatCustomerVisitStatusLabel", () => {
  const now = new Date("2026-11-08T12:00:00.000Z");

  it("keeps active and cancelled labels", () => {
    expect(formatCustomerVisitStatusLabel("active")).toBe("Active");
    expect(formatCustomerVisitStatusLabel("cancelled")).toBe("Cancelled");
  });

  it("shows last visit for completed", () => {
    expect(
      formatCustomerVisitStatusLabel("completed", {
        lastVisitAt: "2026-11-08T10:00:00.000Z",
        now,
      }),
    ).toBe("Last visit 2h ago");
  });

  it("shows no visits when never visited", () => {
    expect(formatCustomerVisitStatusLabel("not_started")).toBe("No visits");
  });
});
