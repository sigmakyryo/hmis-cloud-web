import { describe, expect, it } from "vitest";

import {
  CHECKLIST_BADGE,
  checklistProgress,
  fitVisitChecklist,
  fitVisitPrimaryAction,
  fitVisitSecondaryActions,
} from "@/features/occupational-health/lib/oh-fitness-visit";
import type { FitWorker } from "@/features/occupational-health/services/fitness.service";
import type { FitnessCertificate } from "@/features/occupational-health/types";

const BASE: FitWorker = {
  customer_uuid: "c1",
  worker_label: "Tom Miner",
  employee_number: "E100",
  employer_uuid: null,
  employer_name: "Acme",
  site: "North pit",
  department: "Plant",
  job_title: "Rigger",
  overall: "unknown",
  reasons: [],
  restrictions: [],
  earliest_expiry: null,
  items: [],
  zones: [],
  role_clearance: { job_title: "Rigger", status: "unknown" },
  computed_at: "2026-11-13T12:00:00Z",
};

function cert(overrides: Partial<FitnessCertificate> = {}): FitnessCertificate {
  return {
    id: 1,
    uuid: "cert-1",
    assessment: 10,
    version: 2,
    status: "issued",
    valid_from: "2026-01-01",
    valid_to: "2027-01-01",
    signed_at: "2026-01-02T08:00:00Z",
    signed_by: 7,
    payload: {},
    previous_certificate: null,
    created_at: "2026-01-02T08:00:00Z",
    updated_at: "2026-01-02T08:00:00Z",
    ...overrides,
  };
}

describe("fitVisitChecklist", () => {
  it("lists every source as Missing when nothing is on file", () => {
    const rows = fitVisitChecklist(BASE);
    expect(rows.map((row) => row.source)).toEqual([
      "medical",
      "immunisation",
      "drug_alcohol",
      "fit_test",
      "training",
      "programme",
    ]);
    expect(rows.every((row) => row.status === "missing" && row.badge === CHECKLIST_BADGE.missing)).toBe(true);
    expect(checklistProgress(rows)).toEqual({ done: 0, flagged: 0, total: 6 });
    expect(rows.find((row) => row.source === "medical")?.nav).toEqual({
      panel: "medical-examinations",
      label: "Exam",
    });
  });

  it("uses the worst item status, highlights blockers, and keeps Done / Flagged badges", () => {
    const rows = fitVisitChecklist({
      ...BASE,
      overall: "not_fit",
      reasons: [{ source: "training", status: "blocked", message: "Training missing: Working at height" }],
      items: [
        { source: "medical", label: "Medical", status: "ok", message: "Medical: fit", expires_on: "2027-01-01", restriction: null },
        { source: "training", label: "Working at height", status: "blocked", message: "Training missing: Working at height", expires_on: null, restriction: null },
        { source: "training", label: "First aid", status: "ok", message: "First aid in date", expires_on: "2027-06-01", restriction: null },
      ],
    });
    const medical = rows.find((row) => row.source === "medical");
    const training = rows.find((row) => row.source === "training");
    expect(medical?.badge).toBe("Done");
    expect(medical?.isBlocker).toBe(false);
    expect(medical?.expiresOn).toBe("2027-01-01");
    expect(training?.badge).toBe("Flagged");
    expect(training?.isBlocker).toBe(true);
    expect(training?.detail).toBe("Training missing: Working at height");
    expect(training?.extraCount).toBe(1);
    expect(training?.nav.href).toBe("fitnessTraining");
    expect(checklistProgress(rows)).toEqual({ done: 1, flagged: 1, total: 6 });
  });
});

describe("fitVisitPrimaryAction", () => {
  const now = new Date("2026-11-13T12:00:00Z");

  it("sends a worker with no medical on file to the exam", () => {
    expect(fitVisitPrimaryAction(BASE, [], now)).toEqual({
      key: "exam",
      label: "Go to exam",
      panel: "medical-examinations",
    });
  });

  it("offers Issue certificate when the worker is cleared and has no certificate in force", () => {
    const worker: FitWorker = {
      ...BASE,
      overall: "fit",
      items: [
        { source: "medical", label: "Medical", status: "ok", message: "Medical: fit", expires_on: "2027-06-01", restriction: null },
      ],
    };
    expect(fitVisitPrimaryAction(worker, [], now)).toEqual({
      key: "issue",
      label: "Issue certificate",
      panel: "certificate",
    });
  });

  it("offers Renew when a certificate in force expires within 60 days", () => {
    const worker: FitWorker = {
      ...BASE,
      overall: "fit",
      items: [
        { source: "medical", label: "Medical", status: "ok", message: "Medical: fit", expires_on: "2027-01-01", restriction: null },
      ],
    };
    const issued = cert({ valid_to: "2027-01-01" });
    expect(fitVisitPrimaryAction(worker, [issued], now)?.key).toBe("renew");
    expect(fitVisitPrimaryAction(worker, [issued], now)?.label).toBe("Renew");
  });

  it("does not offer Issue certificate as primary when the worker is not cleared", () => {
    const worker: FitWorker = {
      ...BASE,
      overall: "not_fit",
      reasons: [{ source: "training", status: "blocked", message: "Training missing: Working at height" }],
      items: [
        { source: "medical", label: "Medical", status: "ok", message: "Medical: fit", expires_on: "2027-01-01", restriction: null },
        { source: "training", label: "Working at height", status: "blocked", message: "Training missing: Working at height", expires_on: null, restriction: null },
      ],
    };
    expect(fitVisitPrimaryAction(worker, [], now)).toBeNull();
    const secondary = fitVisitSecondaryActions(null).map((action) => action.key);
    expect(secondary).toEqual(["issue", "exam", "board"]);
  });

  it("prefers Go to exam over Renew when the medical itself is overdue", () => {
    const worker: FitWorker = {
      ...BASE,
      overall: "not_fit",
      items: [
        { source: "medical", label: "Medical", status: "overdue", message: "Medical expired", expires_on: "2026-01-01", restriction: null },
      ],
    };
    expect(fitVisitPrimaryAction(worker, [cert()], now)?.key).toBe("exam");
  });
});
