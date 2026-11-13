import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const transitionTheatreCase = vi.fn().mockResolvedValue({});
const updateTheatreCaseDetails = vi.fn().mockResolvedValue({});
const fetchTheatreTeam = vi.fn().mockResolvedValue([]);
const fetchTheatreRooms = vi.fn().mockResolvedValue([]);
const routerReplace = vi.fn();
const routerPush = vi.fn();
let capabilities: string[] = [];
let search = new URLSearchParams();

const STAGES = ["sign_in", "time_out", "sign_out"].map((stage) => ({
  stage,
  label: stage === "sign_in" ? "Sign in" : stage === "time_out" ? "Time out" : "Sign out",
  items: [{ key: `${stage}-item`, label: `${stage} item`, checked: false }],
  notes: "",
  is_complete: false,
  completed_at: null,
  completed_by_name: "",
}));

vi.mock("@/features/clinical-theatre/services/clinical-theatre.service", () => ({
  fetchTheatreCases: vi.fn().mockResolvedValue([]),
  transitionTheatreCase: (...args: unknown[]) => transitionTheatreCase(...args),
  updateTheatreCaseDetails: (...args: unknown[]) => updateTheatreCaseDetails(...args),
  fetchTheatreTeam: (...args: unknown[]) => fetchTheatreTeam(...args),
  fetchTheatreRooms: (...args: unknown[]) => fetchTheatreRooms(...args),
  fetchTheatreChecklist: () => Promise.resolve(STAGES),
  recordTheatreChecklistStage: vi.fn(),
  fetchTheatreAnaesthesia: vi.fn().mockResolvedValue({ pending_device_vitals: 2, signed_at: null }),
  fetchTheatreOperationNote: vi.fn().mockResolvedValue({ signed_at: null }),
}));

vi.mock("@/features/clinical-opd/components/detail/opd-encounter-workspace-context", () => ({
  useOpdEncounterWorkspace: () => ({ capabilities }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: routerReplace, push: routerPush }),
  usePathname: () => "/clinical/theatre/v1/e1/case",
  useSearchParams: () => search,
}));

import { TheatreCaseFlow } from "@/features/clinical-theatre/components/case-flow/TheatreCaseFlow";
import { bookingGlanceGaps } from "@/features/clinical-theatre/components/case-flow/TheatreFlowSteps";
import type {
  TheatreCase,
  TheatreTeamMember,
  TheatreTeamRole,
} from "@/features/clinical-theatre/types/clinical-theatre.types";
import {
  buildTheatreFlow,
  currentTheatreFlowStep,
  paperworkStep,
  resolveTheatreFlowLocation,
  theatreFlowStepHref,
  theatreOperationParts,
  whoStepFor,
} from "@/features/clinical-theatre/utils/theatre-case-flow";

afterEach(() => cleanup());

function wrap(node: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{node}</QueryClientProvider>);
}

const SAFE = { sign_in: false, time_out: false, sign_out: false, pre_op_ready: false };

function makeCase(overrides: Partial<TheatreCase> = {}): TheatreCase {
  return {
    uuid: "case-1",
    status: "booked",
    urgency: "elective",
    is_crash: false,
    procedure_description: "Lap chole",
    notes: "",
    procedures: [],
    customer_name: "Ada Patient",
    customer_gender: "Female",
    room: { uuid: "r1", name: "OT 1", code: "OT1", kind: "major" },
    scheduled_start: null,
    scheduled_end: null,
    lead_surgeon_name: "",
    allowed_transitions: ["waiting", "postponed", "cancelled"],
    safety: SAFE,
    paperwork: {
      required: false,
      outstanding: [],
      is_complete: true,
      decision_to_incision_minutes: null,
    },
    ...overrides,
  } as TheatreCase;
}


function makeMember(role: TheatreTeamRole, name: string): TheatreTeamMember {
  return {
    uuid: `tm-${role}`,
    role,
    role_label: role,
    user_id: 1,
    user_name: name,
    user_role: "",
    notes: "",
    created_at: "",
  };
}

const stateOf = (steps: ReturnType<typeof buildTheatreFlow>, id: string) =>
  steps.find((step) => step.id === id);

describe("theatre case flow model", () => {
  it("follows the perioperative journey from the case status", () => {
    expect(currentTheatreFlowStep(makeCase())).toBe("booking");
    expect(currentTheatreFlowStep(makeCase({ status: "waiting" }))).toBe("pre-op");
    expect(
      currentTheatreFlowStep(
        makeCase({ status: "pre_op", safety: { ...SAFE, pre_op_ready: true } }),
      ),
    ).toBe("sign-in");
    // Emergencies may go in without the pre-op gate.
    expect(currentTheatreFlowStep(makeCase({ status: "pre_op", urgency: "emergency" }))).toBe(
      "sign-in",
    );
    expect(currentTheatreFlowStep(makeCase({ status: "in_theatre" }))).toBe("time-out");
    expect(
      currentTheatreFlowStep(
        makeCase({ status: "in_theatre", safety: { ...SAFE, time_out: true } }),
      ),
    ).toBe("intra-op");
    expect(currentTheatreFlowStep(makeCase({ status: "sign_out" }))).toBe("sign-out");
    expect(
      currentTheatreFlowStep(makeCase({ status: "sign_out", safety: { ...SAFE, sign_out: true } })),
    ).toBe("op-note");
    expect(currentTheatreFlowStep(makeCase({ status: "recovery" }))).toBe("recovery");
    expect(currentTheatreFlowStep(makeCase({ status: "discharged_home" }))).toBe("handover");
  });

  it("marks done, current, blocked and upcoming steps", () => {
    const steps = buildTheatreFlow(
      makeCase({
        status: "pre_op",
        allowed_transitions: ["in_theatre", "postponed"],
        safety: { ...SAFE, pre_op_ready: true },
      }),
    );
    expect(stateOf(steps, "booking")?.state).toBe("done");
    expect(stateOf(steps, "pre-op")?.state).toBe("done");
    expect(stateOf(steps, "sign-in")).toMatchObject({
      state: "blocked",
      issues: ["Complete the WHO sign in checklist first."],
    });
    expect(stateOf(steps, "time-out")?.state).toBe("upcoming");
    expect(stateOf(steps, "handover")?.state).toBe("upcoming");
  });

  it("puts the count and monitor blockers on the steps they hold up", () => {
    const steps = buildTheatreFlow(
      makeCase({
        status: "sign_out",
        allowed_transitions: ["recovery"],
        safety: {
          ...SAFE,
          sign_in: true,
          time_out: true,
          pre_op_ready: true,
          count_blocker: "Final count does not match.",
        },
      }),
      { pendingDeviceVitals: 3 },
    );
    const signOut = stateOf(steps, "sign-out");
    expect(signOut?.state).toBe("blocked");
    expect(signOut?.issues).toContain("Final count does not match.");
    expect(stateOf(steps, "intra-op")?.state).toBe("attention");
    expect(stateOf(steps, "intra-op")?.issues[0]).toMatch(/3 monitor readings awaiting review/);
  });

  it("flags crash paperwork on the steps that complete it", () => {
    const steps = buildTheatreFlow(
      makeCase({
        status: "in_theatre",
        is_crash: true,
        urgency: "emergency",
        allowed_transitions: ["sign_out"],
        safety: { ...SAFE, time_out: true },
        paperwork: {
          required: true,
          is_complete: false,
          decision_to_incision_minutes: 12,
          outstanding: [
            { key: "consent", label: "Consent", section: "pre-op" },
            { key: "sign_in", label: "WHO sign in (retrospective)", section: "pre-op" },
          ],
        },
      }),
    );
    expect(stateOf(steps, "pre-op")).toMatchObject({
      state: "attention",
      issues: ["Outstanding: Consent"],
    });
    expect(stateOf(steps, "sign-in")?.state).toBe("attention");
    expect(stateOf(steps, "intra-op")?.state).toBe("current");
    expect(paperworkStep({ key: "operation_note", section: "intra-op" })).toBe("op-note");
  });

  it("shows where a cancelled case stopped", () => {
    const steps = buildTheatreFlow(
      makeCase({ status: "cancelled", allowed_transitions: ["booked"] }),
    );
    expect(stateOf(steps, "booking")?.state).toBe("blocked");
    expect(stateOf(steps, "sign-in")?.state).toBe("stopped");
  });

  it("resolves step links, including the older section links", () => {
    const inTheatre = makeCase({ status: "in_theatre" });
    expect(resolveTheatreFlowLocation(inTheatre, null, null)).toEqual({
      step: "time-out",
      part: null,
    });
    expect(resolveTheatreFlowLocation(inTheatre, "intra-op", "counts")).toEqual({
      step: "intra-op",
      part: "counts",
    });
    expect(resolveTheatreFlowLocation(inTheatre, "intra-op", "op-note").step).toBe("op-note");
    expect(resolveTheatreFlowLocation(inTheatre, "checklist", null).step).toBe("time-out");
    expect(resolveTheatreFlowLocation(inTheatre, "intra-op", "checklist").step).toBe("time-out");
    expect(resolveTheatreFlowLocation(inTheatre, "nonsense", null).step).toBe("time-out");
    expect(whoStepFor(makeCase({ status: "waiting" }))).toBe("sign-in");
    expect(whoStepFor(makeCase({ status: "sign_out" }))).toBe("sign-out");
    expect(theatreFlowStepHref("/c", "intra-op", "trays")).toBe("/c?step=intra-op&section=trays");
  });

  it("offers the caesarean part only when it can apply", () => {
    expect(theatreOperationParts(makeCase()).map((part) => part.id)).toEqual([
      "anaesthesia",
      "timings",
      "trays",
      "counts",
      "consumables",
      "caesarean",
    ]);
    const male = makeCase({ customer_gender: "Male" });
    expect(theatreOperationParts(male).map((part) => part.id)).not.toContain("caesarean");
    expect(resolveTheatreFlowLocation(male, "intra-op", "caesarean").part).toBeNull();
  });
});

describe("theatre case flow workspace", () => {
  beforeEach(() => {
    transitionTheatreCase.mockClear();
    updateTheatreCaseDetails.mockClear();
    fetchTheatreTeam.mockReset();
    fetchTheatreTeam.mockResolvedValue([]);
    fetchTheatreRooms.mockReset();
    fetchTheatreRooms.mockResolvedValue([]);
    routerReplace.mockClear();
    search = new URLSearchParams();
  });

  it("opens on the live step with one move and its blocker", async () => {
    capabilities = ["view_theatre_queue", "transition_theatre_case", "record_theatre_checklist"];
    wrap(
      <TheatreCaseFlow
        theatreCase={makeCase({
          status: "pre_op",
          allowed_transitions: ["in_theatre", "postponed"],
          safety: { ...SAFE, pre_op_ready: true },
        })}
      />,
    );
    expect(screen.getByTestId("theatre-flow-step-sign-in")).toBeTruthy();
    expect(screen.queryByText(/Step \d+ of \d+/)).toBeNull();
    expect(screen.queryByText("Jump to where the case is now")).toBeNull();
    expect(await screen.findByTestId("checklist-stage-sign_in")).toBeTruthy();
    expect(screen.queryByTestId("checklist-stage-time_out")).toBeNull();
    const move = screen.getByTestId("theatre-flow-move");
    expect(move).toHaveProperty("disabled", true);
    expect(screen.getByTestId("theatre-flow-move-blocker")).toHaveTextContent(
      "Complete the WHO sign in checklist first.",
    );
    // Next / previous steps are plain links on the case route.
    const footer = screen.getByTestId("theatre-flow-footer");
    const links = Array.from(footer.querySelectorAll("a")).map((link) => link.getAttribute("href"));
    expect(links).toEqual([
      "/clinical/theatre/v1/e1/case?step=pre-op",
      "/clinical/theatre/v1/e1/case?step=time-out",
    ]);
  });

  it("moves the case on and follows it to the new live step", async () => {
    capabilities = ["view_theatre_queue", "transition_theatre_case"];
    wrap(
      <TheatreCaseFlow
        theatreCase={makeCase({
          status: "pre_op",
          allowed_transitions: ["in_theatre"],
          safety: { ...SAFE, pre_op_ready: true, sign_in: true },
        })}
      />,
    );
    const move = screen.getByTestId("theatre-flow-move");
    expect(move).toHaveTextContent("Into theatre");
    fireEvent.click(move);
    await waitFor(() =>
      expect(transitionTheatreCase).toHaveBeenCalledWith("case-1", {
        status: "in_theatre",
        reason: undefined,
      }),
    );
    await waitFor(() =>
      expect(routerReplace).toHaveBeenCalledWith("/clinical/theatre/v1/e1/case", { scroll: false }),
    );
  });

  it("shows the count blocker inline at sign out with a link to the counts", async () => {
    capabilities = ["view_theatre_queue"];
    search = new URLSearchParams({ step: "sign-out" });
    wrap(
      <TheatreCaseFlow
        theatreCase={makeCase({
          status: "sign_out",
          allowed_transitions: ["recovery"],
          safety: {
            ...SAFE,
            sign_in: true,
            time_out: true,
            pre_op_ready: true,
            count_blocker: "Swab count short by 1.",
          },
        })}
      />,
    );
    expect(screen.getByText("The surgical count blocks sign out")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Open counts" }).getAttribute("href")).toBe(
      "/clinical/theatre/v1/e1/case?step=intra-op&section=counts",
    );
    // Without the transition capability there is no move button.
    expect(screen.queryByTestId("theatre-flow-move")).toBeNull();
    expect(await screen.findByTestId("checklist-stage-sign_out")).toBeTruthy();
  });
});

describe("bookingGlanceGaps", () => {
  it("lists the missing slot, team and NCEPOD on a typical booked case", () => {
    const gaps = bookingGlanceGaps(makeCase(), [], true);
    expect(gaps.map((gap) => gap.label)).toEqual([
      "No slot scheduled",
      "No one on the team",
      "NCEPOD not classified",
    ]);
    expect(gaps.map((gap) => gap.tab)).toEqual(["slot", "team", "overview"]);
  });

  it("treats a procedure description as enough, and flags a missing room or procedure", () => {
    const gaps = bookingGlanceGaps(makeCase({ procedure_description: "", room: undefined }), [], true);
    expect(gaps.map((gap) => gap.label)).toEqual([
      "No procedure listed",
      "No slot scheduled",
      "No room",
      "No one on the team",
      "NCEPOD not classified",
    ]);
    expect(gaps[0]?.tab).toBe("procedures");
    expect(gaps[2]?.tab).toBe("slot");
  });

  it("flags the surgeon or anaesthetist when the rest of the team is present", () => {
    expect(
      bookingGlanceGaps(makeCase(), [makeMember("surgeon", "Dr Ada")], true).map((gap) => gap.label),
    ).toContain("Anaesthetist not assigned");
    expect(
      bookingGlanceGaps(makeCase(), [makeMember("anaesthetist", "Dr Bea")], true).map(
        (gap) => gap.label,
      ),
    ).toContain("Surgeon not assigned");
  });

  it("is silent about the team while it is loading, and empty when the case is complete", () => {
    expect(bookingGlanceGaps(makeCase(), [], false).map((gap) => gap.label)).toEqual([
      "No slot scheduled",
      "NCEPOD not classified",
    ]);
    expect(
      bookingGlanceGaps(
        makeCase({
          scheduled_start: "2026-11-13T08:00:00Z",
          ncepod_category: "elective",
          ncepod_category_label: "Elective",
        }),
        [makeMember("surgeon", "Dr Ada"), makeMember("anaesthetist", "Dr Bea")],
        true,
      ),
    ).toEqual([]);
  });
});

describe("theatre booking step layout", () => {
  beforeEach(() => {
    transitionTheatreCase.mockClear();
    updateTheatreCaseDetails.mockClear();
    fetchTheatreTeam.mockReset();
    fetchTheatreTeam.mockResolvedValue([]);
    fetchTheatreRooms.mockReset();
    fetchTheatreRooms.mockResolvedValue([]);
    routerReplace.mockClear();
    search = new URLSearchParams({ step: "booking" });
    capabilities = ["view_theatre_queue", "book_theatre_case", "transition_theatre_case"];
  });

  it("uses one full-width tab bar for overview, procedures, team, slot and records", async () => {
    wrap(<TheatreCaseFlow theatreCase={makeCase()} />);
    expect(screen.getByTestId("theatre-flow-step-booking")).toBeTruthy();

    expect(screen.getAllByRole("tablist")).toHaveLength(1);
    expect(screen.getByRole("tablist", { name: "Booking" })).toBeTruthy();

    expect(screen.getAllByRole("tab")).toHaveLength(5);
    expect(screen.getByRole("tab", { name: /Overview/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: /Procedures/ })).toHaveAttribute("aria-selected", "false");
    expect(screen.queryByRole("tab", { name: /^Details/ })).toBeNull();
    expect(screen.getByRole("tab", { name: /^Team/ })).toBeTruthy();
    expect(screen.getByRole("tab", { name: /Slot & room/ })).toBeTruthy();
    expect(screen.getByRole("tab", { name: /^Records/ })).toBeTruthy();

    // Inactive panels stay mounted so form state is not lost.
    expect(screen.getByTestId("theatre-procedures-panel")).toBeTruthy();
    expect(screen.getByTestId("theatre-booking-tabs-panel-overview")).not.toHaveAttribute("hidden");
    expect(screen.getByTestId("theatre-booking-tabs-panel-procedures")).toHaveAttribute("hidden");
    expect(screen.queryByTestId("theatre-case-details-form")).toBeNull();

    fireEvent.click(screen.getByRole("tab", { name: /Procedures/ }));
    expect(screen.getByTestId("theatre-procedures-empty")).toHaveTextContent(
      "No procedures on the list yet",
    );
    expect(screen.getByRole("button", { name: "Add procedure" })).toBeTruthy();

    fireEvent.click(screen.getByRole("tab", { name: /^Team/ }));
    expect(await screen.findByTestId("theatre-flow-team")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Manage team" }).getAttribute("href")).toBe(
      "/clinical/theatre/v1/e1/case?step=booking&sheet=team",
    );
    expect(await screen.findByText("No one is on the team yet")).toBeTruthy();

    fireEvent.click(screen.getByRole("tab", { name: /Slot & room/ }));
    expect(await screen.findByTestId("theatre-case-actions")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Postpone" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cancel case" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Save slot" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Assign room" })).toBeTruthy();

    fireEvent.click(screen.getByRole("tab", { name: /^Records/ }));
    expect(screen.getByRole("link", { name: /Surgeon preference card/ })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Return to theatre/ })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Inpatient stay/ })).toBeTruthy();
  });

  it("shows a cleaner overview with grouped facts, compact safety and clickable gaps", async () => {
    wrap(<TheatreCaseFlow theatreCase={makeCase()} />);
    const overview = await screen.findByTestId("theatre-case-glance");
    expect(overview).toHaveTextContent("Lap chole");
    expect(overview).toHaveTextContent("Booked");
    expect(overview).toHaveTextContent("Elective");
    expect(overview).toHaveTextContent("OT 1");
    expect(overview).toHaveTextContent("Unscheduled");
    expect(overview).toHaveTextContent("Case");
    expect(overview).toHaveTextContent("Schedule");
    expect(overview).toHaveTextContent("Booking");
    expect(overview).toHaveTextContent("NCEPOD");
    expect(overview).toHaveTextContent("Notes");
    expect(overview).toHaveTextContent("Source");
    expect(screen.getByTestId("theatre-overview-safety")).toHaveTextContent("0/4 checks");
    const missing = await screen.findByTestId("theatre-case-glance-missing");
    expect(missing).toHaveTextContent("Needs attention");
    expect(missing.querySelectorAll("button")).toHaveLength(3);
    expect(missing).toHaveTextContent("No slot scheduled");
    expect(missing).toHaveTextContent("No one on the team");
    expect(missing).toHaveTextContent("NCEPOD not classified");
    expect(missing).not.toHaveTextContent("No procedure listed");

    fireEvent.click(screen.getByRole("button", { name: "No slot scheduled" }));
    expect(screen.getByRole("tab", { name: /Slot & room/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByTestId("theatre-booking-tabs-panel-slot")).not.toHaveAttribute("hidden");

    fireEvent.click(screen.getByRole("tab", { name: /Overview/ }));
    fireEvent.click(screen.getByRole("button", { name: "NCEPOD not classified" }));
    expect(screen.getByRole("dialog", { name: /Case details/ })).toBeTruthy();
    expect(screen.getByTestId("theatre-case-details-form")).toBeTruthy();
  });

  it("edits case details from the overview dialog and saves them", async () => {
    wrap(<TheatreCaseFlow theatreCase={makeCase()} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    const dialog = screen.getByRole("dialog", { name: /Case details/ });
    expect(dialog).toBeTruthy();
    const procedure = screen.getByLabelText("Procedure") as HTMLInputElement;
    expect(procedure.value).toBe("Lap chole");
    fireEvent.change(procedure, { target: { value: "Laparoscopic cholecystectomy" } });
    fireEvent.change(screen.getByLabelText("NCEPOD category"), { target: { value: "elective" } });
    fireEvent.change(screen.getByLabelText("Notes"), { target: { value: "Allergy to latex" } });
    fireEvent.click(screen.getByRole("button", { name: "Save details" }));
    await waitFor(() =>
      expect(updateTheatreCaseDetails).toHaveBeenCalledWith("case-1", {
        procedure_description: "Laparoscopic cholecystectomy",
        urgency: "elective",
        notes: "Allergy to latex",
        ncepod_category: "elective",
      }),
    );
  });

  it("shows a Ready badge when booking gaps are filled, and count badges on the tabs", async () => {
    fetchTheatreTeam.mockResolvedValue([
      makeMember("surgeon", "Dr Ada"),
      makeMember("anaesthetist", "Dr Bea"),
      makeMember("scrub_nurse", "Nurse Cee"),
    ]);
    wrap(
      <TheatreCaseFlow
        theatreCase={makeCase({
          scheduled_start: "2026-11-13T08:00:00Z",
          ncepod_category: "elective",
          ncepod_category_label: "Elective",
          preference_card_applied_at: "2026-11-12T10:00:00Z",
          stay_uuid: "stay-1",
          procedures: [
            { uuid: "p1", name: "Lap chole", is_primary: true },
            { uuid: "p2", name: "Cholangiogram", is_primary: false },
          ] as TheatreCase["procedures"],
        })}
      />,
    );
    expect(await screen.findByTestId("theatre-case-glance-ready")).toHaveTextContent("Ready");
    expect(screen.queryByTestId("theatre-case-glance-missing")).toBeNull();
    expect(screen.getByTestId("theatre-booking-tabs-tab-procedures")).toHaveTextContent("2");
    expect(await screen.findByTestId("theatre-booking-tabs-tab-team")).toHaveTextContent("3");
    expect(screen.getByTestId("theatre-booking-tabs-tab-records")).toHaveTextContent("2");
    expect(
      screen
        .getByTestId("theatre-booking-tabs-tab-overview")
        .querySelector('[aria-label="needs attention"]'),
    ).toBeNull();
    expect(
      screen
        .getByTestId("theatre-booking-tabs-tab-team")
        .querySelector('[aria-label="needs attention"]'),
    ).toBeNull();
    expect(
      screen
        .getByTestId("theatre-booking-tabs-tab-slot")
        .querySelector('[aria-label="needs attention"]'),
    ).toBeNull();
  });

  it("moves between booking tabs with the arrow keys", () => {
    wrap(<TheatreCaseFlow theatreCase={makeCase()} />);
    const tablist = screen.getByRole("tablist", { name: "Booking" });
    const overview = screen.getByTestId("theatre-booking-tabs-tab-overview");
    const procedures = screen.getByTestId("theatre-booking-tabs-tab-procedures");
    const records = screen.getByTestId("theatre-booking-tabs-tab-records");
    expect(overview).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(tablist, { key: "ArrowRight" });
    expect(procedures).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(tablist, { key: "Home" });
    expect(overview).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(tablist, { key: "End" });
    expect(records).toHaveAttribute("aria-selected", "true");
  });
});
