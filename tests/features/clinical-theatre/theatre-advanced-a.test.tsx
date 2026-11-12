import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const addTheatreCaseProcedure = vi.fn().mockResolvedValue({});
const updateTheatreCaseProcedure = vi.fn().mockResolvedValue({});
const removeTheatreCaseProcedure = vi.fn().mockResolvedValue({});
const updateTheatreCaseDetails = vi.fn().mockResolvedValue({});
const fetchTheatreCases = vi.fn().mockResolvedValue([]);

vi.mock("@/features/clinical-theatre/services/clinical-theatre.service", () => ({
  addTheatreCaseProcedure: (...args: unknown[]) => addTheatreCaseProcedure(...args),
  updateTheatreCaseProcedure: (...args: unknown[]) => updateTheatreCaseProcedure(...args),
  removeTheatreCaseProcedure: (...args: unknown[]) => removeTheatreCaseProcedure(...args),
  updateTheatreCaseDetails: (...args: unknown[]) => updateTheatreCaseDetails(...args),
  fetchTheatreCases: (...args: unknown[]) => fetchTheatreCases(...args),
}));

import { CLINICAL_THEATRE_API_PATHS, BFF_CLINICAL_THEATRE_ROUTES } from "@/constants/clinical-theatre-api";
import { TheatreCrashBanner } from "@/features/clinical-theatre/components/TheatreCrashBanner";
import { crashCaseWorkspaceHref } from "@/features/clinical-theatre/components/TheatreCrashCaseDialog";
import { TheatreProceduresPanel } from "@/features/clinical-theatre/components/TheatreProceduresPanel";
import { TheatreReturnLinkPanel } from "@/features/clinical-theatre/components/TheatreReturnLinkPanel";
import { TheatreReportBody } from "@/features/clinical-theatre/pages/TheatreReportsPage";
import type {
  TheatreCase,
  TheatreCaseProcedure,
  TheatreReportSummary,
} from "@/features/clinical-theatre/types/clinical-theatre.types";
import {
  buildCrashCasePayload,
  crashPaperworkOutstanding,
  formatMinutes,
  procedureDetailLine,
  procedurePerformedText,
  returnCandidates,
  returnLinkLabel,
} from "@/features/clinical-theatre/utils/theatre-advanced-display";
import { theatreNextAction } from "@/features/clinical-theatre/utils/theatre-workflow";

afterEach(() => cleanup());
beforeEach(() => vi.clearAllMocks());

function wrap(node: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{node}</QueryClientProvider>);
}

function procedure(overrides: Partial<TheatreCaseProcedure> = {}): TheatreCaseProcedure {
  return {
    uuid: "p1",
    name: "Laparotomy",
    code: "",
    is_primary: true,
    sequence: 1,
    laterality: "",
    laterality_label: "",
    approach: "open",
    approach_label: "Open",
    product_uuid: null,
    product_name: "",
    visit_order_uuid: null,
    visit_order_description: "",
    surgeon_id: null,
    surgeon_name: "",
    notes: "",
    ...overrides,
  };
}

function makeCase(overrides: Partial<TheatreCase> = {}): TheatreCase {
  return {
    uuid: "case-1",
    status: "in_theatre",
    urgency: "emergency",
    procedure_description: "Laparotomy",
    customer_uuid: "cust-1",
    customer_name: "Ada Patient",
    allowed_transitions: ["sign_out"],
    safety: { sign_in: false, time_out: false, sign_out: false, pre_op_ready: false },
    is_crash: true,
    ncepod_category: "immediate",
    ncepod_category_label: "1 - Immediate",
    decision_at: null,
    procedures: [procedure()],
    paperwork: {
      required: true,
      is_complete: false,
      decision_to_incision_minutes: 18,
      outstanding: [
        { key: "consent", label: "Consent (or emergency consent record)", section: "pre-op" },
        { key: "time_out", label: "WHO time out (retrospective)", section: "intra-op" },
      ],
    },
    return_of: null,
    return_reason: "",
    return_planned: null,
    return_interval_days: null,
    returns: [],
    ...overrides,
  } as TheatreCase;
}

describe("theatre advanced A helpers", () => {
  it("exposes crash and procedure API paths", () => {
    expect(CLINICAL_THEATRE_API_PATHS.crash).toBe("/theatre/cases/crash/");
    expect(CLINICAL_THEATRE_API_PATHS.procedure("c", "p")).toBe(
      "/theatre/cases/c/procedures/p/",
    );
    expect(BFF_CLINICAL_THEATRE_ROUTES.procedures("c")).toBe(
      "/api/theatre/cases/c/procedures",
    );
  });

  it("builds a crash payload from the most specific episode", () => {
    expect(
      buildCrashCasePayload({
        customerUuid: "cust",
        visitUuid: "visit",
        procedure: "  Laparotomy ",
        ncepod: "immediate",
        clinicUuid: "clinic",
      }),
    ).toEqual({
      visit: "visit",
      clinic: "clinic",
      procedure_description: "Laparotomy",
      ncepod_category: "immediate",
      room: null,
    });
    expect(
      buildCrashCasePayload({ customerUuid: "cust", procedure: "X", ncepod: "urgent" }),
    ).toMatchObject({ customer: "cust", ncepod_category: "urgent" });
  });

  it("formats procedures for the op note", () => {
    const rows = [
      procedure(),
      procedure({
        uuid: "p2",
        name: "Appendicectomy",
        is_primary: false,
        laterality: "right",
        laterality_label: "Right",
        approach: "",
        approach_label: "",
        code: "44950",
      }),
    ];
    expect(procedureDetailLine(rows[1])).toBe("Appendicectomy · Right · 44950");
    expect(procedurePerformedText(rows)).toBe(
      "1. Laparotomy · Open\n2. Appendicectomy · Right · 44950",
    );
  });

  it("labels returns and filters candidates", () => {
    expect(returnLinkLabel(false, 2)).toBe("Unplanned return · 2 days after");
    expect(returnLinkLabel(true, 0)).toBe("Planned return · same day");
    expect(returnLinkLabel(null, null)).toBe("Return");
    const candidates = returnCandidates({ uuid: "me" }, [
      makeCase({ uuid: "me", actual_start: "2026-01-01T00:00:00Z" }),
      makeCase({ uuid: "old", actual_start: "2026-01-01T00:00:00Z" }),
      makeCase({ uuid: "never", actual_start: null }),
      makeCase({ uuid: "gone", status: "cancelled", actual_start: "2026-01-01T00:00:00Z" }),
    ]);
    expect(candidates.map((item) => item.uuid)).toEqual(["old"]);
  });

  it("formats minutes and detects outstanding paperwork", () => {
    expect(formatMinutes(null)).toBe("—");
    expect(formatMinutes(45)).toBe("45 min");
    expect(formatMinutes(125)).toBe("2 h 5 min");
    expect(crashPaperworkOutstanding(makeCase())).toBe(true);
    expect(
      crashPaperworkOutstanding(
        makeCase({ paperwork: { ...makeCase().paperwork, is_complete: true, outstanding: [] } }),
      ),
    ).toBe(false);
    expect(crashPaperworkOutstanding(makeCase({ is_crash: false }))).toBe(false);
  });

  it("does not block a crash case's next step on the WHO gate", () => {
    const action = theatreNextAction(makeCase());
    expect(action).toMatchObject({ kind: "transition", status: "sign_out", blocker: null });
    const normal = theatreNextAction(makeCase({ is_crash: false }));
    expect(normal).toMatchObject({ kind: "transition", status: "sign_out" });
    expect(normal.kind === "transition" && normal.blocker).toBeTruthy();
  });

  it("links to the workspace of a crash case", () => {
    expect(
      crashCaseWorkspaceHref(makeCase({ visit_uuid: "v", encounter_uuid: "e" })),
    ).toBe("/clinical/theatre/v/e/case");
    expect(crashCaseWorkspaceHref(makeCase({ visit_uuid: null, encounter_uuid: null }))).toBe(
      null,
    );
  });
});

describe("theatre advanced A components", () => {
  it("shows the crash banner with outstanding paperwork links", () => {
    wrap(
      <TheatreCrashBanner
        theatreCase={makeCase()}
        stepHref={(step) => `/x?step=${step}`}
      />,
    );
    expect(screen.getByTestId("theatre-crash-banner")).toHaveTextContent("Decision to incision: 18 min");
    const links = screen.getAllByRole("link");
    // Each outstanding record links to the case-flow step that completes it.
    expect(links[0]).toHaveAttribute("href", "/x?step=pre-op");
    expect(links[1]).toHaveAttribute("href", "/x?step=time-out");
  });

  it("hides the crash banner for ordinary cases", () => {
    wrap(<TheatreCrashBanner theatreCase={makeCase({ is_crash: false })} stepHref={() => "/"} />);
    expect(screen.queryByTestId("theatre-crash-banner")).toBeNull();
  });

  it("adds a free-text (legacy) procedure with side and approach", async () => {
    wrap(<TheatreProceduresPanel theatreCase={makeCase()} canEdit />);
    expect(screen.getByText("Primary")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Not in the catalogue/ }));
    fireEvent.change(screen.getByLabelText("Add procedure"), {
      target: { value: "Appendicectomy" },
    });
    fireEvent.change(screen.getByLabelText("Side"), { target: { value: "right" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    await waitFor(() =>
      expect(addTheatreCaseProcedure).toHaveBeenCalledWith("case-1", {
        name: "Appendicectomy",
        laterality: "right",
        approach: "",
      }),
    );
  });

  it("promotes and removes secondary procedures", async () => {
    const theatreCase = makeCase({
      procedures: [procedure(), procedure({ uuid: "p2", name: "Splenectomy", is_primary: false })],
    });
    wrap(<TheatreProceduresPanel theatreCase={theatreCase} canEdit />);
    fireEvent.click(screen.getByRole("button", { name: "Make Splenectomy primary" }));
    await waitFor(() =>
      expect(updateTheatreCaseProcedure).toHaveBeenCalledWith("case-1", "p2", {
        is_primary: true,
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Remove Splenectomy" }));
    await waitFor(() => expect(removeTheatreCaseProcedure).toHaveBeenCalledWith("case-1", "p2"));
  });

  it("shows the return link both ways", () => {
    wrap(
      <TheatreReturnLinkPanel
        canEdit={false}
        theatreCase={makeCase({
          return_of: {
            uuid: "orig",
            status: "discharged_ward",
            status_label: "Discharged to ward",
            procedure_description: "Anterior resection",
            actual_start: null,
            actual_end: null,
            visit_uuid: "v1",
            encounter_uuid: "e1",
            return_planned: false,
            return_reason: "",
          },
          return_reason: "Anastomotic leak",
          return_planned: false,
          return_interval_days: 3,
        })}
      />,
    );
    expect(screen.getByText("Unplanned return · 3 days after")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Anterior resection" })).toHaveAttribute(
      "href",
      "/clinical/theatre/v1/e1/case",
    );
    expect(screen.getByText("Reason: Anastomotic leak")).toBeInTheDocument();
  });

  it("links a case as an unplanned return", async () => {
    fetchTheatreCases.mockResolvedValueOnce([
      makeCase({ uuid: "old", procedure_description: "Hemicolectomy", actual_start: "2026-01-01T08:00:00Z" }),
    ]);
    wrap(<TheatreReturnLinkPanel canEdit theatreCase={makeCase({ status: "booked" })} />);
    fireEvent.click(screen.getByRole("button", { name: "Mark as return to theatre" }));
    await screen.findByRole("option", { name: /Hemicolectomy/ });
    fireEvent.change(screen.getByLabelText("Original operation"), { target: { value: "old" } });
    fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "Bleeding" } });
    fireEvent.click(screen.getByRole("button", { name: "Link case" }));
    await waitFor(() =>
      expect(updateTheatreCaseDetails).toHaveBeenCalledWith("case-1", {
        return_of: "old",
        return_reason: "Bleeding",
        return_planned: false,
      }),
    );
  });

  it("renders return, crash and procedure report sections", () => {
    const report = {
      date_from: "2026-01-01",
      date_to: "2026-01-31",
      days: 31,
      session_hours: 8,
      totals: {
        cases: 3,
        completed: 2,
        cancelled: 0,
        postponed: 0,
        in_progress: 1,
        operating_minutes: 120,
        average_case_minutes: 60,
      },
      by_status: [],
      by_urgency: [],
      by_room: [],
      by_surgeon: [],
      cancellations: [],
      returns: {
        window_days: 30,
        total: 1,
        planned: 0,
        unplanned: 1,
        unplanned_within_window: 1,
        operated_cases: 3,
        unplanned_return_rate_percent: 33.3,
        cases: [
          {
            case_uuid: "c2",
            original_case_uuid: "c1",
            procedure_description: "Relook laparotomy",
            reason: "Leak",
            planned: false,
            days_after: 2,
            surgeon_name: "Dr Banda",
          },
        ],
      },
      crash: {
        total: 1,
        paperwork_outstanding: 1,
        by_ncepod: [
          {
            category: "immediate",
            label: "1 - Immediate",
            cases: 1,
            median_decision_to_incision_minutes: 20,
          },
        ],
      },
      by_procedure: [{ procedure: "Laparotomy", count: 2, as_primary: 2 }],
    } as TheatreReportSummary;
    wrap(<TheatreReportBody report={report} />);
    expect(screen.getByText("33.3%")).toBeInTheDocument();
    expect(screen.getByText("Relook laparotomy")).toBeInTheDocument();
    expect(screen.getByText("20 min")).toBeInTheDocument();
    expect(screen.getByText("Top procedures")).toBeInTheDocument();
  });
});
