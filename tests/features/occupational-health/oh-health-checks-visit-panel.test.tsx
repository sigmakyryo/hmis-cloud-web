import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { healthProgramsProxy } from "@/lib/server/health-programs-bff";
import { healthCheckDeviceSource } from "@/features/occupational-health/lib/health-check-device";
import { healthCheckStatus } from "@/features/occupational-health/components/OhHealthChecksVisitPanel";
import { healthCheckSummaryLine } from "@/features/occupational-health/lib/health-check-status";
import type { HpResult } from "@/features/occupational-health/services/health-programs.service";

const mocks = vi.hoisted(() => ({
  results: vi.fn(),
  record: vi.fn(),
  update: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("@/providers/toast-provider", () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock("@/features/occupational-health/services/health-programs.service", async (orig) => {
  const actual = await orig<typeof import("@/features/occupational-health/services/health-programs.service")>();
  return {
    ...actual,
    fetchHpResults: (...a: unknown[]) => mocks.results(...a),
    recordHpResult: (...a: unknown[]) => mocks.record(...a),
    updateHpResult: (...a: unknown[]) => mocks.update(...a),
  };
});

import { OhHealthChecksVisitPanel } from "@/features/occupational-health/components/OhHealthChecksVisitPanel";

const CU = "11111111-2222-4333-8444-555555555555";
const VISIT = "4d7b3c2c-2fe4-585f-be14-3cbf7fee61ee";

function result(over: Partial<HpResult> = {}): HpResult {
  return {
    uuid: "r-hearing-1",
    customer_uuid: CU,
    worker_label: "Pat Fitter",
    program: "hearing",
    performed_at: "2026-11-01T08:00:00+02:00",
    is_baseline: false,
    data: { left: { "2000": 28, "3000": 28, "4000": 28 }, right: { "2000": 12, "3000": 12, "4000": 12 }, age: 40 },
    computed: {
      average_234: { left: 28, right: 12 },
      shift_db: { left: 18, right: 0 },
      flags: ["sts", "recordable"],
    },
    outcome: "restricted",
    outcome_overridden: false,
    referral: true,
    restrictions: ["Must wear hearing protection; refit and retrain"],
    next_due_on: "2027-11-01",
    visit_uuid: VISIT,
    billed: false,
    recorded_by_initials: "NN",
    notes: "",
    is_active: true,
    ...over,
  };
}

function renderWith(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

function renderPanel() {
  return renderWith(<OhHealthChecksVisitPanel customerUuid={CU} encounterUuid={VISIT} />);
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.results.mockResolvedValue([]);
  mocks.record.mockResolvedValue(result({ program: "fatigue", outcome: "fit", computed: { epworth: 5, risk_level: "low", flags: [] }, referral: false, restrictions: [] }));
  mocks.update.mockResolvedValue(result({ outcome: "fit", computed: { average_234: { left: 12, right: 12 }, flags: [] }, referral: false, restrictions: [] }));
});

afterEach(() => cleanup());

describe("health checks visit panel", () => {
  it("lists every test as not done with pull and manual entry", async () => {
    renderPanel();
    expect(await screen.findByTestId("oh-health-checks-visit-panel")).toBeTruthy();
    for (const program of ["hearing", "lung", "vision", "ergonomics", "fatigue"]) {
      const row = await screen.findByTestId(`oh-health-check-row-${program}`);
      expect(row.getAttribute("data-status")).toBe("not_done");
      expect(within(row).getByText("Not done")).toBeTruthy();
      expect(within(row).getByRole("button", { name: "Enter manually" })).toBeTruthy();
      expect(within(row).getByRole("button", { name: "Pull from device" })).toBeTruthy();
    }
    expect(screen.getByRole("button", { name: "Pull from devices" })).toBeTruthy();
    expect(screen.getByText(/0 of 5 done/)).toBeTruthy();
  });

  it("enters a result manually and posts a new record", async () => {
    renderPanel();
    fireEvent.click(await screen.findByTestId("oh-health-check-manual-fatigue"));
    const form = await screen.findByTestId("oh-hp-form-fatigue");
    expect(form).toBeTruthy();
    expect(screen.getByText("Enter Fatigue manually")).toBeTruthy();
    expect(within(form).getByText("Epworth score (0-24)")).toBeTruthy();
    const epworth = form.querySelector('input[type="number"]');
    expect(epworth).toBeTruthy();
    fireEvent.change(epworth as HTMLInputElement, { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: "Save result" }));
    await waitFor(() => expect(mocks.record).toHaveBeenCalledTimes(1));
    expect(mocks.update).not.toHaveBeenCalled();
    const body = mocks.record.mock.calls[0][0] as { program: string; customer_uuid: string; visit_uuid: string; data: { epworth: number } };
    expect(body).toMatchObject({ program: "fatigue", customer_uuid: CU, visit_uuid: VISIT });
    expect(body.data.epworth).toBe(5);
  });

  it("edits a recorded test and patches the existing result", async () => {
    mocks.results.mockResolvedValue([result()]);
    mocks.update.mockResolvedValue(result({ data: { left: { "2000": 20, "3000": 20, "4000": 20 }, right: { "2000": 12, "3000": 12, "4000": 12 }, age: 40 } }));
    renderPanel();
    const row = await screen.findByTestId("oh-health-check-row-hearing");
    expect(row.getAttribute("data-status")).toBe("abnormal");
    expect(within(row).getByText("Abnormal")).toBeTruthy();
    expect(within(row).getByText(/2-4 kHz avg/)).toBeTruthy();
    expect(within(row).getByText("dB")).toBeTruthy();
    expect(within(row).getByText(/Hearing shift/)).toBeTruthy();
    expect(within(row).getByText(/NN/)).toBeTruthy();
    fireEvent.click(within(row).getByRole("button", { name: "Edit" }));
    expect(await screen.findByTestId("oh-hp-form-hearing")).toBeTruthy();
    expect(screen.getByText("Edit Hearing")).toBeTruthy();
    const left2k = screen.getByLabelText("L 2k") as HTMLInputElement;
    expect(left2k.value).toBe("28");
    fireEvent.change(left2k, { target: { value: "20" } });
    fireEvent.click(screen.getByRole("button", { name: "Update result" }));
    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1));
    expect(mocks.record).not.toHaveBeenCalled();
    const [uuid, body] = mocks.update.mock.calls[0] as [string, { data: { left: Record<string, number> } }];
    expect(uuid).toBe("r-hearing-1");
    expect(body.data.left["2000"]).toBe(20);
  });

  it("shows Recorded and Flagged badges from outcome and flags", async () => {
    mocks.results.mockResolvedValue([
      result({
        uuid: "r-lung",
        program: "lung",
        outcome: "fit",
        referral: false,
        restrictions: [],
        computed: { fev1_fvc: 0.79, fev1_pct_pred: 95, flags: [] },
        data: { fev1: 3.8, fvc: 4.8 },
        recorded_by_initials: "AA",
      }),
      result({
        uuid: "r-vision",
        program: "vision",
        outcome: "fit",
        referral: false,
        restrictions: [],
        computed: { binocular_decimal: 0.5, flags: ["acuity_below_standard"] },
        recorded_by_initials: "BB",
      }),
    ]);
    renderPanel();
    const lung = await screen.findByTestId("oh-health-check-row-lung");
    expect(lung.getAttribute("data-status")).toBe("recorded");
    expect(within(lung).getByText("Recorded")).toBeTruthy();
    const vision = screen.getByTestId("oh-health-check-row-vision");
    expect(vision.getAttribute("data-status")).toBe("flagged");
    expect(within(vision).getByText("Flagged")).toBeTruthy();
    expect(within(vision).getByText(/Acuity below standard/)).toBeTruthy();
    expect(screen.getByTestId("oh-health-check-summary")).toHaveTextContent("2 of 5 done, 1 flagged");
  });

  it("shows a non-error empty state when pulling from a device and offers manual entry", async () => {
    renderPanel();
    fireEvent.click(await screen.findByTestId("oh-health-check-device-fatigue"));
    const banner = await screen.findByTestId("oh-health-check-no-device");
    expect(banner.getAttribute("role")).toBe("status");
    expect(within(banner).getByText("No device connected yet")).toBeTruthy();
    expect(within(banner).getByText(/enter them manually/i)).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(mocks.record).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(screen.queryByText(/20 dB|epworth 12|fake/i)).toBeNull();
    fireEvent.click(screen.getByTestId("oh-health-check-device-enter-manual"));
    expect(await screen.findByTestId("oh-hp-form-fatigue")).toBeTruthy();
    expect(screen.queryByTestId("oh-health-check-no-device")).toBeNull();
    expect(screen.getByText("Enter Fatigue manually")).toBeTruthy();
  });

  it("panel-level pull from devices also shows the empty state without inventing results", async () => {
    renderPanel();
    fireEvent.click(await screen.findByTestId("oh-health-check-pull-devices"));
    const banner = await screen.findByTestId("oh-health-check-no-device");
    expect(within(banner).getByText("No device connected yet")).toBeTruthy();
    expect(within(banner).queryByTestId("oh-health-check-device-enter-manual")).toBeNull();
    expect(mocks.record).not.toHaveBeenCalled();
    for (const program of ["hearing", "lung", "vision", "ergonomics", "fatigue"]) {
      expect(screen.getByTestId(`oh-health-check-row-${program}`).getAttribute("data-status")).toBe("not_done");
    }
  });

  it("device source reports not connected and never returns readings", async () => {
    expect(healthCheckDeviceSource.status).toBe("not_connected");
    expect(await healthCheckDeviceSource.pull("hearing")).toEqual({ ok: false, reason: "not_connected" });
    expect(await healthCheckDeviceSource.pull("lung")).toEqual({ ok: false, reason: "not_connected" });
  });

  it("status helper maps outcome and flags", () => {
    expect(healthCheckStatus(undefined)).toBe("not_done");
    expect(healthCheckStatus(result({ outcome: "fit", referral: false, computed: { flags: [] }, restrictions: [] }))).toBe("recorded");
    expect(healthCheckStatus(result({ outcome: "fit", referral: false, computed: { flags: ["sts"] }, restrictions: [] }))).toBe("flagged");
    expect(healthCheckStatus(result({ outcome: "unfit" }))).toBe("abnormal");
  });

  it("summary line counts completed and flagged tests", () => {
    expect(healthCheckSummaryLine([])).toBe("0 of 5 done");
    const clean = result({
      program: "lung",
      outcome: "fit",
      referral: false,
      restrictions: [],
      computed: { flags: [] },
    });
    expect(healthCheckSummaryLine([clean])).toBe("1 of 5 done");
    const flagged = result({
      program: "vision",
      outcome: "fit",
      referral: false,
      restrictions: [],
      computed: { flags: ["acuity_below_standard"] },
    });
    expect(healthCheckSummaryLine([clean, flagged])).toBe("2 of 5 done, 1 flagged");
  });

  it("BFF allows PATCH on a result id only", () => {
    expect(healthProgramsProxy.resolve("PATCH", ["results", CU])?.path).toBe(`/oh-hp/results/${CU}`);
    expect(healthProgramsProxy.resolve("PATCH", ["results"])).toBeNull();
    expect(healthProgramsProxy.resolve("PATCH", ["policies", CU])).toBeNull();
  });
});
