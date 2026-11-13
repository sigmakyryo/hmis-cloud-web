import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetchTheatreCases = vi.fn();
const ensureTheatreCaseForEncounter = vi.fn().mockResolvedValue({});
const transitionTheatreCase = vi.fn().mockResolvedValue({});
let capabilities: string[] = [];

const STAGES = ["sign_in", "time_out", "sign_out"].map((stage) => ({
  stage,
  label:
    stage === "sign_in"
      ? "Sign in"
      : stage === "time_out"
        ? "Time out"
        : "Sign out",
  items: [{ key: `${stage}-item`, label: `${stage} item`, checked: false }],
  notes: "",
  is_complete: false,
  completed_at: null,
  completed_by_name: "",
}));

vi.mock(
  "@/features/clinical-theatre/services/clinical-theatre.service",
  () => ({
    fetchTheatreCases: (...args: unknown[]) => fetchTheatreCases(...args),
    ensureTheatreCaseForEncounter: (...args: unknown[]) =>
      ensureTheatreCaseForEncounter(...args),
    transitionTheatreCase: (...args: unknown[]) =>
      transitionTheatreCase(...args),
    fetchTheatreTeam: vi.fn().mockResolvedValue([
      { uuid: "m1", role: "surgeon", user_name: "Dr Banda" },
      { uuid: "m2", role: "anaesthetist", user_name: "Dr Phiri" },
    ]),
    fetchTheatreChecklist: () => Promise.resolve(STAGES),
    fetchTheatreAnaesthesia: vi
      .fn()
      .mockResolvedValue({ pending_device_vitals: 0, signed_at: null }),
    fetchTheatreOperationNote: vi.fn().mockResolvedValue({ signed_at: null }),
    recordTheatreChecklistStage: vi.fn(),
  }),
);

vi.mock(
  "@/features/clinical-opd/components/detail/opd-encounter-workspace-context",
  () => ({
    useOpdEncounterWorkspace: () => ({ capabilities }),
  }),
);

let search = new URLSearchParams();
let pathname = "/clinical/theatre/v1/e1/case";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => pathname,
  useSearchParams: () => search,
}));

import { TheatreCaseHeader } from "@/features/clinical-theatre/components/TheatreCaseHeader";
import { TheatreWorkspaceTabs } from "@/features/clinical-theatre/components/TheatreWorkspaceTabs";
import { TheatreChecklistPanel } from "@/features/clinical-theatre/components/TheatreChecklistPanel";
import type { TheatreCase } from "@/features/clinical-theatre/types/clinical-theatre.types";
import {
  defaultIntraOpSection,
  sectionForStatus,
  theatreNextAction,
  theatreSecondaryTransitions,
  theatreStageForStatus,
} from "@/features/clinical-theatre/utils/theatre-workflow";

afterEach(() => {
  cleanup();
  search = new URLSearchParams();
  pathname = "/clinical/theatre/v1/e1/case";
});

function wrap(node: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>{node}</QueryClientProvider>,
  );
}

const SAFE = {
  sign_in: false,
  time_out: false,
  sign_out: false,
  pre_op_ready: false,
};

function makeCase(overrides: Partial<TheatreCase> = {}): TheatreCase {
  return {
    uuid: "case-1",
    status: "booked",
    urgency: "elective",
    procedure_description: "Lap chole",
    customer_name: "Ada Patient",
    room: { uuid: "r1", name: "OT 1", code: "OT1", kind: "major" },
    scheduled_start: null,
    scheduled_end: null,
    lead_surgeon_name: "",
    allowed_transitions: ["waiting", "postponed", "cancelled"],
    safety: SAFE,
    ...overrides,
  } as TheatreCase;
}

describe("theatre workflow helpers", () => {
  it("maps statuses to stepper stages and sections", () => {
    expect(theatreStageForStatus("booked")).toBe("scheduled");
    expect(theatreStageForStatus("sign_out")).toBe("in_theatre");
    expect(theatreStageForStatus("discharged_home")).toBe("done");
    expect(sectionForStatus("waiting")).toBe("pre-op");
    expect(sectionForStatus("in_theatre")).toBe("intra-op");
    expect(defaultIntraOpSection("pre_op")).toBe("checklist");
    expect(defaultIntraOpSection("sign_out")).toBe("op-note");
  });

  it("picks one primary move and points blockers at the right section", () => {
    expect(theatreNextAction(makeCase())).toMatchObject({
      kind: "transition",
      status: "waiting",
      blocker: null,
    });
    const blockedPreOp = theatreNextAction(
      makeCase({
        status: "pre_op",
        allowed_transitions: ["in_theatre", "postponed"],
      }),
    );
    expect(blockedPreOp).toMatchObject({
      status: "in_theatre",
      fixSection: "pre-op",
    });
    const blockedTimeOut = theatreNextAction(
      makeCase({ status: "in_theatre", allowed_transitions: ["sign_out"] }),
    );
    expect(blockedTimeOut).toMatchObject({
      status: "sign_out",
      fixSection: "intra-op",
      fixSubSection: "checklist",
    });
    expect(
      theatreNextAction(
        makeCase({
          status: "recovery",
          allowed_transitions: ["discharged_ward"],
        }),
      ),
    ).toEqual({ kind: "recovery-discharge" });
    expect(theatreSecondaryTransitions(makeCase())).toEqual([
      "postponed",
      "cancelled",
    ]);
  });
});

describe("theatre case header", () => {
  beforeEach(() => {
    fetchTheatreCases.mockReset();
    ensureTheatreCaseForEncounter.mockClear();
    transitionTheatreCase.mockClear();
  });

  it("offers to set up a case instead of a dead end", async () => {
    capabilities = ["view_theatre_queue", "book_theatre_case"];
    fetchTheatreCases.mockResolvedValue([]);
    wrap(<TheatreCaseHeader visitUuid="v1" encounterUuid="e1" />);
    const setup = await screen.findByRole("button", {
      name: "Set up theatre case",
    });
    expect(screen.queryByText(/No theatre case is linked/)).toBeNull();
    fireEvent.click(setup);
    await waitFor(() =>
      expect(ensureTheatreCaseForEncounter).toHaveBeenCalled(),
    );
    expect(ensureTheatreCaseForEncounter.mock.calls[0][0]).toBe("e1");
    expect(fetchTheatreCases).toHaveBeenCalledWith({ encounter: "e1" });
  });

  it("hides set-up for roles that cannot book", async () => {
    capabilities = ["view_theatre_queue"];
    fetchTheatreCases.mockResolvedValue([]);
    wrap(<TheatreCaseHeader visitUuid="v1" encounterUuid="e1" />);
    await screen.findByTestId("theatre-case-setup");
    expect(
      screen.queryByRole("button", { name: "Set up theatre case" }),
    ).toBeNull();
  });

  it("shows the case, team and one primary action", async () => {
    capabilities = ["view_theatre_queue", "transition_theatre_case"];
    fetchTheatreCases.mockResolvedValue([makeCase()]);
    wrap(<TheatreCaseHeader visitUuid="v1" encounterUuid="e1" />);
    const procedure = await screen.findByTestId("theatre-procedure-badge");
    const header = screen.getByTestId("theatre-case-header");
    const chip = screen.getByTestId("theatre-patient-chip");
    expect(procedure).toHaveTextContent("Lap chole");
    expect(screen.queryByRole("heading", { name: "Lap chole" })).toBeNull();
    expect(chip).toHaveTextContent("Ada Patient");
    expect(chip).not.toHaveTextContent("Waiting");
    expect(chip).not.toHaveTextContent("Booked");
    expect(header).toContainElement(chip);
    expect(header).toContainElement(procedure);
    expect(header).toHaveTextContent("Booked");
    expect(screen.getByText("OT 1")).toBeTruthy();
    expect(await screen.findByText(/Surgeon: Dr Banda/)).toBeTruthy();
    expect(screen.queryByTestId("theatre-case-stepper")).toBeNull();
    expect(screen.queryByTestId("theatre-records-menu")).toBeNull();
    // Already on the live step, so no jump control.
    expect(screen.queryByTestId("theatre-go-to-current-step")).toBeNull();
    // Postpone / cancel live in Overview, not in the header.
    expect(screen.queryByRole("button", { name: "Postpone" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Check in" }));
    await waitFor(() =>
      expect(transitionTheatreCase).toHaveBeenCalledWith("case-1", {
        status: "waiting",
        reason: undefined,
      }),
    );
  });

  it("disables a gated move and links to where it is fixed", async () => {
    capabilities = ["view_theatre_queue", "transition_theatre_case"];
    fetchTheatreCases.mockResolvedValue([
      makeCase({
        status: "pre_op",
        allowed_transitions: ["in_theatre", "postponed"],
      }),
    ]);
    wrap(<TheatreCaseHeader visitUuid="v1" encounterUuid="e1" />);
    const action = await screen.findByRole("button", { name: "Into theatre" });
    expect(action).toHaveProperty("disabled", true);
    const fix = screen.getByRole("link", { name: "Go to step" });
    expect(fix.getAttribute("href")).toBe(
      "/clinical/theatre/v1/e1/case?step=sign-in",
    );
  });

  it("shows a jump button before the primary action when viewing another step", async () => {
    capabilities = ["view_theatre_queue", "transition_theatre_case"];
    search = new URLSearchParams({ step: "sign-in" });
    fetchTheatreCases.mockResolvedValue([makeCase()]);
    wrap(<TheatreCaseHeader visitUuid="v1" encounterUuid="e1" />);
    const jump = await screen.findByTestId("theatre-go-to-current-step");
    expect(jump).toHaveTextContent("Go to current step: Booking & team");
    expect(jump.getAttribute("href")).toBe(
      "/clinical/theatre/v1/e1/case?step=booking",
    );
    const primary = screen.getByTestId("theatre-next-action");
    expect(
      jump.compareDocumentPosition(primary) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("shows the jump button when the workspace is on a record section", async () => {
    capabilities = ["view_theatre_queue", "transition_theatre_case"];
    pathname = "/clinical/theatre/v1/e1/vital-signs";
    fetchTheatreCases.mockResolvedValue([
      makeCase({ status: "pre_op", safety: { ...SAFE, pre_op_ready: true } }),
    ]);
    wrap(<TheatreCaseHeader visitUuid="v1" encounterUuid="e1" />);
    const jump = await screen.findByTestId("theatre-go-to-current-step");
    expect(jump).toHaveTextContent("Go to current step: Sign in");
    expect(jump.getAttribute("href")).toBe(
      "/clinical/theatre/v1/e1/case?step=sign-in",
    );
  });
});

describe("theatre workspace nav", () => {
  beforeEach(() => {
    fetchTheatreCases.mockReset();
  });

  it("lists case-flow steps and record sections in a vertical rail", async () => {
    capabilities = [
      "view_theatre_queue",
      "view_vital_signs_tab",
      "view_nursing_notes_tab",
    ];
    fetchTheatreCases.mockResolvedValue([makeCase()]);
    wrap(<TheatreWorkspaceTabs visitUuid="v1" encounterUuid="e1" />);
    const rail = await screen.findByTestId("theatre-workspace-rail");
    await waitFor(() => {
      expect(rail.querySelector('[data-flow-step="booking"]')).toBeTruthy();
    });
    expect(rail.querySelector('[data-flow-step="sign-in"]')).toBeTruthy();
    expect(screen.queryByText("Patient records")).toBeNull();
    expect(
      screen.getByRole("navigation", { name: "Perioperative journey" }),
    ).toBeTruthy();
    const vitalSigns = screen.getByTestId("theatre-record-tab-vital-signs");
    expect(vitalSigns).toHaveTextContent("Vital signs");
    expect(vitalSigns.closest("nav")?.getAttribute("aria-label")).toBe(
      "Perioperative journey",
    );
    expect(vitalSigns.className).toContain("justify-between");
    expect(screen.getByTestId("theatre-record-tab-nursing")).toHaveTextContent(
      "Nursing",
    );
    expect(screen.getByTestId("theatre-flow-step-action-booking")).toBeTruthy();
    expect(rail).toHaveClass("overflow-y-auto");
    expect(screen.queryByTestId("theatre-records-menu")).toBeNull();
  });
});

describe("checklist stage filter", () => {
  it("shows only the requested WHO stages", async () => {
    wrap(
      <TheatreChecklistPanel
        theatreCase={makeCase({ status: "pre_op" })}
        stages={["sign_in"]}
        title="WHO sign-in"
      />,
    );
    expect(await screen.findByTestId("checklist-stage-sign_in")).toBeTruthy();
    expect(screen.queryByTestId("checklist-stage-time_out")).toBeNull();
    expect(screen.getByText("WHO sign-in")).toBeTruthy();
  });
});
