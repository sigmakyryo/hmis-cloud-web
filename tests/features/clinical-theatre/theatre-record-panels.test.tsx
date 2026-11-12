import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const updateTheatreOperationNote = vi.fn().mockResolvedValue({});
const signTheatreOperationNote = vi.fn().mockResolvedValue({});
const dischargeTheatreRecovery = vi.fn().mockResolvedValue({});

const NOTE = {
  uuid: "note-1",
  surgeon: 1,
  surgeon_name: "Dr Banda",
  assistants: "",
  procedure_performed: "Appendicectomy",
  indication: "",
  incision: "",
  findings: "Inflamed appendix",
  procedure_details: "",
  implants: "",
  specimens: "",
  specimens_sent_to_lab: false,
  drains: "",
  closure: "",
  estimated_blood_loss_ml: null,
  complications: "",
  post_op_instructions: "",
  signed_at: null,
  signed_by_name: "",
  updated_at: "2026-11-12T08:00:00Z",
};

const observation = (total: number) => ({
  uuid: `obs-${total}`,
  recorded_at: "2026-11-12T10:00:00Z",
  activity: 2,
  respiration: 2,
  circulation: 2,
  consciousness: 2,
  oxygen_saturation: 2,
  aldrete_total: total,
  heart_rate: 80,
  systolic_bp: 120,
  diastolic_bp: 80,
  spo2: 98,
  pain_score: 2,
  notes: "",
});

let recovery: Record<string, unknown> = {};

vi.mock("@/features/clinical-theatre/services/clinical-theatre.service", () => ({
  fetchTheatreOperationNote: () => Promise.resolve(NOTE),
  updateTheatreOperationNote: (...args: unknown[]) => updateTheatreOperationNote(...args),
  signTheatreOperationNote: (...args: unknown[]) => signTheatreOperationNote(...args),
  fetchTheatreRecovery: () => Promise.resolve(recovery),
  dischargeTheatreRecovery: (...args: unknown[]) => dischargeTheatreRecovery(...args),
  updateTheatreRecovery: vi.fn().mockResolvedValue({}),
  addTheatreRecoveryObservation: vi.fn().mockResolvedValue({}),
  transitionTheatreCase: vi.fn().mockResolvedValue({}),
}));

import { TheatreOperationNotePanel } from "@/features/clinical-theatre/components/TheatreOperationNotePanel";
import { TheatreRecoveryPanel } from "@/features/clinical-theatre/components/TheatreRecoveryPanel";
import { TheatreReportBody } from "@/features/clinical-theatre/pages/TheatreReportsPage";
import type {
  TheatreCase,
  TheatreReportSummary,
} from "@/features/clinical-theatre/types/clinical-theatre.types";

afterEach(() => cleanup());

function wrap(node: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{node}</QueryClientProvider>);
}

const theatreCase = (status: string) =>
  ({ uuid: "case-1", status, urgency: "elective", lead_surgeon_name: "" }) as unknown as TheatreCase;

describe("operation note panel", () => {
  it("saves changes, then signs", async () => {
    wrap(<TheatreOperationNotePanel theatreCase={theatreCase("sign_out")} />);
    const findings = await screen.findByLabelText("Findings");
    const sign = screen.getByRole("button", { name: "Sign and lock" });
    expect(sign).toHaveProperty("disabled", false);
    fireEvent.change(findings, { target: { value: "Perforated appendix" } });
    // Unsaved edits must be saved before signing.
    expect(sign).toHaveProperty("disabled", true);
    fireEvent.click(screen.getByRole("button", { name: "Save operation note" }));
    await waitFor(() =>
      expect(updateTheatreOperationNote).toHaveBeenCalledWith("case-1", {
        findings: "Perforated appendix",
      }),
    );
  });

  it("is read-only before the patient is in theatre", async () => {
    wrap(<TheatreOperationNotePanel theatreCase={theatreCase("pre_op")} />);
    expect(await screen.findByText(/opens once the patient is in theatre/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Save operation note" })).toBeNull();
  });
});

describe("recovery panel", () => {
  it("blocks discharge until the Aldrete score is high enough", async () => {
    recovery = {
      uuid: "rec-1",
      arrived_at: "2026-11-12T09:30:00Z",
      handover_destination: "ward",
      handed_over_to: "",
      notes: "",
      observations: [observation(7)],
      latest_aldrete: 7,
      discharge_score: null,
      discharged_at: null,
      discharged_by_name: "",
      updated_at: "2026-11-12T09:30:00Z",
    };
    wrap(<TheatreRecoveryPanel theatreCase={theatreCase("recovery")} />);
    const button = await screen.findByRole("button", { name: "Discharge from recovery" });
    expect(button).toHaveProperty("disabled", true);
    expect(screen.getByText(/Latest Aldrete score is 7/)).toBeTruthy();
    expect(screen.getByTestId("theatre-aldrete-total").textContent).toContain("10/10");
  });

  it("discharges when ready", async () => {
    recovery = {
      ...recovery,
      observations: [observation(10)],
      latest_aldrete: 10,
    };
    wrap(<TheatreRecoveryPanel theatreCase={theatreCase("recovery")} />);
    const button = await screen.findByRole("button", { name: "Discharge from recovery" });
    expect(button).toHaveProperty("disabled", false);
    fireEvent.click(button);
    await waitFor(() =>
      expect(dischargeTheatreRecovery).toHaveBeenCalledWith("case-1", {}),
    );
  });
});

describe("theatre report body", () => {
  it("renders totals, rooms and cancellation reasons", () => {
    const report: TheatreReportSummary = {
      date_from: "2026-11-01",
      date_to: "2026-11-12",
      days: 12,
      session_hours: 8,
      totals: {
        cases: 3,
        completed: 1,
        cancelled: 1,
        postponed: 1,
        in_progress: 0,
        operating_minutes: 96,
        average_case_minutes: 96,
      },
      by_status: [{ status: "cancelled", label: "Cancelled", count: 1 }],
      by_urgency: [{ urgency: "elective", label: "Elective", count: 3 }],
      by_room: [
        {
          room_uuid: "r1",
          room_name: "OT 1",
          cases: 3,
          completed: 1,
          cancelled: 2,
          operating_minutes: 96,
          utilisation_percent: 1.7,
        },
      ],
      by_surgeon: [],
      cancellations: [
        {
          case_uuid: "c1",
          status: "cancelled",
          procedure_description: "Hernia repair",
          scheduled_start: null,
          room_name: "OT 1",
          surgeon_name: "Dr Banda",
          reason: "Patient unfit",
          recorded_at: null,
          recorded_by: "",
        },
      ],
    };
    render(<TheatreReportBody report={report} />);
    expect(screen.getAllByText("1 h 36 min").length).toBeGreaterThan(0);
    expect(screen.getByText("1.7%")).toBeTruthy();
    expect(screen.getByText("Patient unfit")).toBeTruthy();
  });
});
