import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

const recordTheatreChecklistStage = vi.fn().mockResolvedValue([]);
const updateTheatrePreOp = vi.fn().mockResolvedValue({});

const STAGES = [
  {
    stage: "sign_in",
    label: "Sign in",
    items: [
      { key: "identity", label: "Identity confirmed", checked: false },
      { key: "site_marked", label: "Site marked", checked: false },
    ],
    notes: "",
    is_complete: false,
    completed_at: null,
    completed_by_name: "",
  },
  {
    stage: "time_out",
    label: "Time out",
    items: [{ key: "team_introduced", label: "Team introduced", checked: false }],
    notes: "",
    is_complete: false,
    completed_at: null,
    completed_by_name: "",
  },
  {
    stage: "sign_out",
    label: "Sign out",
    items: [{ key: "counts_complete", label: "Counts correct", checked: false }],
    notes: "",
    is_complete: false,
    completed_at: null,
    completed_by_name: "",
  },
];

const BOARD = {
  date: "2026-11-12",
  lanes: [
    {
      room: { uuid: "room-1", name: "OT 1", code: "OT1", kind: "major", is_active: true },
      cases: [
        {
          uuid: "case-1",
          status: "booked",
          urgency: "elective",
          customer_name: "Ada Patient",
          procedure_description: "Lap chole",
          scheduled_start: "2026-11-12T08:00:00Z",
          scheduled_end: "2026-11-12T09:00:00Z",
          lead_surgeon_name: "Dr Banda",
          visit_uuid: null,
          encounter_uuid: null,
          safety: { sign_in: false, time_out: false, sign_out: false, pre_op_ready: true },
        },
      ],
    },
    { room: { uuid: "room-2", name: "OT 2", code: "OT2", kind: "minor", is_active: true }, cases: [] },
    { room: null, cases: [] },
  ],
};

vi.mock("@/features/clinical-theatre/services/clinical-theatre.service", () => ({
  fetchTheatreChecklist: () => Promise.resolve(STAGES),
  recordTheatreChecklistStage: (...args: unknown[]) =>
    recordTheatreChecklistStage(...args),
  fetchTheatrePreOp: vi.fn().mockResolvedValue(null),
  updateTheatrePreOp: (...args: unknown[]) => updateTheatrePreOp(...args),
  fetchTheatreBoard: () => Promise.resolve(BOARD),
  fetchTheatreTeam: vi.fn().mockResolvedValue([]),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => "/clinical/theatre/board",
  useSearchParams: () => new URLSearchParams("date=2026-11-12"),
}));

import { TheatreChecklistPanel } from "@/features/clinical-theatre/components/TheatreChecklistPanel";
import { TheatrePreOpPanel } from "@/features/clinical-theatre/components/TheatrePreOpPanel";
import { TheatreBoardPage } from "@/features/clinical-theatre/pages/TheatreBoardPage";
import type { TheatreCase } from "@/features/clinical-theatre/types/clinical-theatre.types";

function wrap(node: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{node}</QueryClientProvider>);
}

const preOpCase = {
  uuid: "case-1",
  status: "pre_op",
  urgency: "elective",
} as unknown as TheatreCase;

describe("WHO checklist panel", () => {
  it("only allows completing sign in once every item is ticked", async () => {
    wrap(<TheatreChecklistPanel theatreCase={preOpCase} />);
    const complete = await screen.findByRole("button", { name: "Complete sign in" });
    expect(complete).toHaveProperty("disabled", true);
    // Time out waits for sign in.
    expect(screen.queryByRole("button", { name: "Complete time out" })).toBeNull();
    fireEvent.click(screen.getByLabelText("Identity confirmed"));
    fireEvent.click(screen.getByLabelText("Site marked"));
    expect(complete).toHaveProperty("disabled", false);
    fireEvent.click(complete);
    await waitFor(() =>
      expect(recordTheatreChecklistStage).toHaveBeenCalledWith("case-1", "sign_in", {
        responses: { identity: true, site_marked: true },
        notes: "",
        complete: true,
      }),
    );
  });
});

describe("pre-op panel", () => {
  it("saves only the changed fields", async () => {
    wrap(<TheatrePreOpPanel theatreCase={preOpCase} />);
    const save = await screen.findByRole("button", { name: "Save pre-op" });
    expect(save).toHaveProperty("disabled", true);
    fireEvent.click(screen.getByLabelText("Consent signed"));
    fireEvent.click(save);
    await waitFor(() =>
      expect(updateTheatrePreOp).toHaveBeenCalledWith("case-1", {
        consent_signed: true,
      }),
    );
  });

  it("locks once the patient is in theatre", async () => {
    wrap(
      <TheatrePreOpPanel
        theatreCase={{ ...preOpCase, status: "in_theatre" } as TheatreCase}
      />,
    );
    expect(await screen.findByText(/locked once the patient is in theatre/)).toBeTruthy();
  });
});

describe("theatre board", () => {
  it("shows a lane per room and hides an empty unassigned lane", async () => {
    wrap(<TheatreBoardPage />);
    expect(await screen.findByText("Ada Patient")).toBeTruthy();
    expect(screen.getAllByTestId("theatre-board-lane")).toHaveLength(2);
    expect(screen.getByText("Free all day.")).toBeTruthy();
    expect(screen.queryByText("Unassigned")).toBeNull();
    expect(screen.getByLabelText("Date")).toHaveProperty("value", "2026-11-12");
  });
});
