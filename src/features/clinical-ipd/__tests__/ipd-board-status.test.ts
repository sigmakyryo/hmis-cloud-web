import { describe, expect, it } from "vitest";

import type { IpdBedStatus } from "@/features/clinical-ipd/types/clinical-ipd.types";

const BOARD_STATUS_LABELS: Record<IpdBedStatus, string> = {
  available: "available",
  occupied: "occupied",
  blocked: "blocked",
  maintenance: "maintenance",
};

describe("IPD ward board status labels", () => {
  it("covers every bed status used on the census board", () => {
    expect(Object.keys(BOARD_STATUS_LABELS).sort()).toEqual(
      ["available", "blocked", "maintenance", "occupied"].sort(),
    );
  });
});
