import { describe, expect, it } from "vitest";

import { sessionFormSteps } from "@/features/occupational-health/lib/oh-session-forms";
import {
  collectWorkspaceBillingCharges,
  encounterMatchesQuery,
  encounterMatchesQueue,
  isNativeOhVisit,
  isReferredOhVisit,
  isViewingLiveSessionStep,
  ohJumpButtonLabel,
  panelForSessionStep,
  resolveLiveSessionStep,
  shortSessionStepTitle,
} from "@/features/occupational-health/lib/oh-visit-workspace";
import type { OhVisitEncounter } from "@/features/occupational-health/types";

function encounter(
  overrides: Partial<OhVisitEncounter> = {},
): OhVisitEncounter {
  return {
    id: 1,
    uuid: "enc-1",
    visit: "visit-1",
    department: "dept",
    department_name: "Occupational Health",
    department_type: "occupational_health",
    location: null,
    location_name: null,
    clinician: null,
    clinician_name: "Dr OH",
    customer_name: "Jane Doe",
    customer_identifier: "C-001",
    first_name: "Jane",
    last_name: "Doe",
    employer_name: "Mine Co",
    hazard_profile_name: "Welding",
    status: "waiting",
    billing_mode: null,
    started_at: null,
    ended_at: null,
    notes: "",
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("oh visit workspace helpers", () => {
  it("matches queue search on client and employer names", () => {
    const row = encounter();
    expect(encounterMatchesQuery(row, "jane")).toBe(true);
    expect(encounterMatchesQuery(row, "C-001")).toBe(true);
    expect(encounterMatchesQuery(row, "mine")).toBe(true);
    expect(encounterMatchesQuery(row, "weld")).toBe(true);
    expect(encounterMatchesQuery(row, "zzz")).toBe(false);
  });

  it("filters the queue by status", () => {
    const row = encounter({ status: "waiting" });
    expect(encounterMatchesQueue(row, "", "all")).toBe(true);
    expect(encounterMatchesQueue(row, "", "waiting")).toBe(true);
    expect(encounterMatchesQueue(row, "", "completed")).toBe(false);
    expect(encounterMatchesQueue(row, "mine", "waiting")).toBe(true);
    expect(encounterMatchesQueue(row, "zzz", "waiting")).toBe(false);
  });

  it("resolves the first incomplete session step as the live step", () => {
    const steps = sessionFormSteps({ code: "periodic", forms: [] });
    expect(steps.map((step) => step.kind)).toEqual([
      "examination",
      "certificate",
    ]);
    expect(
      resolveLiveSessionStep(steps, {
        examination: "in_progress",
        certificate: "locked",
      }),
    ).toBe("examination");
    expect(
      resolveLiveSessionStep(steps, {
        examination: "done",
        certificate: "not_started",
      }),
    ).toBe("certificate");
    expect(
      resolveLiveSessionStep(steps, {
        examination: "done",
        certificate: "done",
      }),
    ).toBe("certificate");
  });

  it("treats clinical modules as away from the live step", () => {
    expect(
      isViewingLiveSessionStep(
        "medical-examinations",
        "examination",
        "examination",
      ),
    ).toBe(true);
    expect(
      isViewingLiveSessionStep("certificate", "certificate", "certificate"),
    ).toBe(true);
    expect(
      isViewingLiveSessionStep("employment", "examination", "examination"),
    ).toBe(false);
    expect(
      isViewingLiveSessionStep("drug-alcohol", "examination", "examination"),
    ).toBe(false);
    expect(panelForSessionStep("certificate")).toBe("certificate");
    expect(ohJumpButtonLabel("Certificate of fitness")).toBe(
      "Go to Certificate",
    );
    expect(shortSessionStepTitle("Examination")).toBe("Exam");
  });

  it("distinguishes native and referred visits", () => {
    expect(isNativeOhVisit({ origin: "laravel" })).toBe(true);
    expect(isReferredOhVisit({ origin: "laravel" })).toBe(false);
    expect(isReferredOhVisit({ origin: "core" })).toBe(true);
    expect(isReferredOhVisit({})).toBe(true);
  });

  it("collects unique billing charges from exam and form records", () => {
    const charges = collectWorkspaceBillingCharges(
      [
        {
          billing_charges: [
            {
              uuid: "a",
              billing_key: "k-a",
              scope: "item",
              item_code: "SPIRO",
              product_uuid: "p1",
              destination: "lab",
              status: "sent",
            },
          ],
        },
      ],
      [
        {
          billing_charges: [
            {
              uuid: "a",
              billing_key: "k-a",
              scope: "item",
              item_code: "SPIRO",
              product_uuid: "p1",
              destination: "lab",
              status: "sent",
            },
            {
              uuid: "b",
              billing_key: "k-b",
              scope: "form",
              product_uuid: "p2",
              destination: "billing_only",
              status: "pending",
              ui_status: "Sending to billing…",
            },
          ],
        },
      ],
    );
    expect(charges).toHaveLength(2);
    expect(charges.map((row) => row.uuid)).toEqual(["a", "b"]);
  });
});
