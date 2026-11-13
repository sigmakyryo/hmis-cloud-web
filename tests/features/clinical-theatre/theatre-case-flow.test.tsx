import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const transitionTheatreCase = vi.fn().mockResolvedValue({});
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
  fetchTheatreTeam: vi.fn().mockResolvedValue([]),
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
import type { TheatreCase } from "@/features/clinical-theatre/types/clinical-theatre.types";
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
