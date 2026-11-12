import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  TheatreCaseTimings,
  TheatrePerformanceReport,
  TheatrePreOpAssessment,
  TheatreReadiness,
  TheatreWaitingListEntry,
} from "@/features/clinical-theatre/types/theatre-planning.types";

const READY: TheatreReadiness = {
  status: "not_assessed",
  label: "Not assessed",
  warning: "No pre-op assessment on record.",
  assessment_uuid: null,
  clearance: "",
  valid_until: null,
  cleared_at: null,
  cleared_by_name: "",
};

function timings(values: Partial<Record<string, string | null>> = {}): TheatreCaseTimings {
  const keys = [
    ["in_suite", "In suite"],
    ["anaesthesia_start", "Anaesthesia start"],
    ["anaesthesia_ready", "Anaesthesia ready"],
    ["knife_to_skin", "Knife to skin"],
    ["closure", "Closure"],
    ["out_of_theatre", "Out of theatre"],
    ["in_recovery", "In recovery"],
  ] as const;
  const milestones = keys.map(([key, label], index) => ({
    key,
    label,
    sequence: index + 1,
    value: values[key] ?? null,
  }));
  const next = milestones.find((row) => !row.value);
  return {
    milestones,
    next_milestone: next?.key ?? null,
    next_milestone_label: next?.label ?? "",
    intervals: [{ key: "in_room", label: "In theatre (in suite to out)", minutes: null }],
    events: [
      {
        milestone: "in_suite",
        milestone_label: "In suite",
        action: "captured",
        source: "status",
        previous_value: null,
        new_value: "2026-11-12T08:00:00Z",
        reason: "",
        actor_name: "Sr Phiri",
        created_at: "2026-11-12T08:00:00Z",
      },
    ],
  };
}

function entry(overrides: Partial<TheatreWaitingListEntry> = {}): TheatreWaitingListEntry {
  return {
    uuid: "entry-1",
    status: "waiting",
    status_label: "Waiting",
    patient: { uuid: "c-1", name: "Chikondi Banda", identifier: "PT-001", gender: "Female", age: 54 },
    clinic: { uuid: "clinic-1", name: "Main" },
    surgeon_id: 7,
    surgeon_name: "Dr Mwale",
    category: { uuid: "cat-p3", code: "P3", label: "Within 90 days", target_days: 90, sort_order: 3 },
    added_on: "2026-07-01",
    clinical_priority_notes: "Symptomatic gallstones",
    notes: "",
    anticipated_duration_minutes: 90,
    preferred_room: null,
    visit_uuid: null,
    stay_uuid: null,
    case: null,
    scheduled_at: null,
    removed_at: null,
    removal_reason: "",
    removal_reason_label: "",
    removal_note: "",
    removed_by_name: "",
    procedures: [
      {
        uuid: "wp-1",
        product_uuid: "prod-lap",
        name: "Laparoscopic cholecystectomy",
        code: "LAPCHOL",
        laterality: "",
        notes: "",
      },
    ],
    wait: { days_waited: 134, target_days: 90, target_date: "2026-09-29", days_remaining: -44, breached: true },
    readiness: READY,
    created_at: "2026-07-01T08:00:00Z",
    ...overrides,
  };
}

function assessment(overrides: Partial<TheatrePreOpAssessment> = {}): TheatrePreOpAssessment {
  return {
    uuid: "assess-1",
    patient: { uuid: "c-1", name: "Chikondi Banda", identifier: "PT-001", gender: "Female", age: 54 },
    clinic: { uuid: "clinic-1", name: "Main" },
    waiting_list_entry_uuid: "entry-1",
    category_code: "P3",
    case: null,
    encounter: null,
    asa_grade: "2",
    comorbidities: ["hypertension"],
    weight_kg: null,
    height_cm: null,
    airway_notes: "",
    findings: "",
    plan: "",
    assessed_by_name: "Dr Mwale",
    clearance: "",
    clearance_label: "",
    clearance_notes: "",
    cleared_by_name: "",
    cleared_at: null,
    valid_until: null,
    clearance_valid: false,
    required_tests: [
      {
        uuid: "test-ecg",
        product: { uuid: "p-ecg", name: "ECG", code: "ECG", order_type: "procedure" },
        reasons: ["ECG for over 50s (age 54)"],
        status: "required",
        status_label: "Required",
        visit_order_uuid: null,
        order_status: "",
        result_status: "",
        ordered_by_name: "",
        ordered_at: null,
        waived_reason: "",
        result_summary: "",
      },
      {
        uuid: "test-fbc",
        product: { uuid: "p-fbc", name: "Full blood count", code: "FBC", order_type: "laboratory" },
        reasons: ["FBC for all"],
        status: "resulted",
        status_label: "Resulted",
        visit_order_uuid: "vo-1",
        order_status: "completed",
        result_status: "Completed",
        ordered_by_name: "Dr Mwale",
        ordered_at: "2026-11-10T08:00:00Z",
        waived_reason: "",
        result_summary: "Recent result reused",
      },
    ],
    outstanding_tests: 1,
    created_at: "2026-11-10T08:00:00Z",
    updated_at: "2026-11-10T08:00:00Z",
    ...overrides,
  };
}

const fetchTheatreTimings = vi.fn();
const captureTheatreTiming = vi.fn();
const fetchTheatreWaitingList = vi.fn();
const fetchTheatreUrgencyCategories = vi.fn();
const generateTheatrePreOpOrders = vi.fn();
const reinstateTheatreWaitingListEntry = vi.fn();

vi.mock("@/features/clinical-theatre/services/theatre-planning.service", () => ({
  fetchTheatreTimings: (...args: unknown[]) => fetchTheatreTimings(...args),
  captureTheatreTiming: (...args: unknown[]) => captureTheatreTiming(...args),
  fetchTheatreWaitingList: (...args: unknown[]) => fetchTheatreWaitingList(...args),
  fetchTheatreUrgencyCategories: (...args: unknown[]) => fetchTheatreUrgencyCategories(...args),
  generateTheatrePreOpOrders: (...args: unknown[]) => generateTheatrePreOpOrders(...args),
  reinstateTheatreWaitingListEntry: (...args: unknown[]) =>
    reinstateTheatreWaitingListEntry(...args),
  fetchTheatreWaitingListEntry: vi.fn().mockResolvedValue(null),
  fetchTheatreSessions: vi.fn().mockResolvedValue({ sessions: [] }),
}));

vi.mock("@/features/clinical-theatre/services/clinical-theatre.service", () => ({
  fetchTheatreRooms: vi.fn().mockResolvedValue([]),
}));

const capabilities = { current: [] as string[] };
vi.mock("@/features/clinical-opd/hooks/use-clinical-opd", () => ({
  useMyClinicalCapabilities: () => ({ data: { capabilities: capabilities.current } }),
}));

import {
  BFF_CLINICAL_THEATRE_ROUTES,
  CLINICAL_THEATRE_API_PATHS,
} from "@/constants/clinical-theatre-api";
import { ROUTES } from "@/constants/routes";
import { TheatrePerformanceReportBody } from "@/features/clinical-theatre/components/TheatrePlanningReports";
import {
  TheatrePreOpAssessmentPanel,
  fitClearanceBlocker,
  orderableTests,
} from "@/features/clinical-theatre/components/TheatrePreOpAssessmentPanel";
import { describeRule } from "@/features/clinical-theatre/components/TheatrePreOpRulesSettingsPanel";
import {
  TheatreTimingPanel,
  TheatreTimingQuickCapture,
} from "@/features/clinical-theatre/components/TheatreTimingPanel";
import { buildWaitingListPayload } from "@/features/clinical-theatre/components/TheatreWaitingListDialogs";
import { TheatreWaitingListPage } from "@/features/clinical-theatre/pages/TheatreWaitingListPage";
import {
  canRecordTimings,
  combineLocalDateTime,
  milestoneOrderProblem,
  waitSummary,
} from "@/features/clinical-theatre/utils/theatre-planning-display";
import { THEATRE_INTRA_OP_SECTIONS } from "@/features/clinical-theatre/utils/theatre-workflow";
import { THEATRE_ROLE_CAPABILITIES } from "@/features/settings/constants/clinical-role-capability-config";
import { THEATRE_QUERY_KEYS } from "@/lib/server/theatre-bff";

function wrap(node: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{node}</QueryClientProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
  capabilities.current = [];
});

afterEach(() => cleanup());

describe("theatre pro P2 wiring", () => {
  it("maps BFF routes to the Django endpoints", () => {
    expect(BFF_CLINICAL_THEATRE_ROUTES.timings("c1")).toBe("/api/theatre/cases/c1/timings");
    expect(CLINICAL_THEATRE_API_PATHS.timings("c1")).toBe("/theatre/cases/c1/timings/");
    expect(CLINICAL_THEATRE_API_PATHS.waitingListSchedule("e1")).toBe(
      "/theatre/waiting-list/e1/schedule/",
    );
    expect(CLINICAL_THEATRE_API_PATHS.preOpTest("a1", "t1")).toBe(
      "/theatre/pre-op/assessments/a1/tests/t1/",
    );
    expect(CLINICAL_THEATRE_API_PATHS.sessionCancelOccurrence).toBe(
      "/theatre/sessions/cancel-occurrence/",
    );
    expect(ROUTES.clinicalTheatreWaitingList).toBe("/clinical/theatre/waiting-list");
    expect(ROUTES.clinicalTheatrePreOpClinic).toBe("/clinical/theatre/pre-op-clinic");
  });

  it("forwards the new list filters through the BFF", () => {
    for (const key of ["category", "breached", "readiness", "sort", "include_ready", "entry", "include_cancelled"]) {
      expect(THEATRE_QUERY_KEYS).toContain(key);
    }
  });

  it("exposes the new capabilities and the theatre times sub-section", () => {
    const keys = THEATRE_ROLE_CAPABILITIES.map((row) => row.key);
    for (const key of [
      "record_theatre_timings",
      "manage_theatre_sessions",
      "view_theatre_waiting_list",
      "manage_theatre_waiting_list",
      "manage_theatre_urgency_categories",
      "manage_theatre_pre_op_rules",
      "record_theatre_pre_op_clinic",
      "record_theatre_fitness_clearance",
    ]) {
      expect(keys).toContain(key);
    }
    expect(THEATRE_INTRA_OP_SECTIONS.map((row) => row.id)).toContain("timings");
  });
});

describe("timing helpers", () => {
  it("only times cases once the patient has arrived", () => {
    expect(canRecordTimings("booked")).toBe(false);
    expect(canRecordTimings("cancelled")).toBe(false);
    expect(canRecordTimings("pre_op")).toBe(true);
    expect(canRecordTimings("recovery")).toBe(true);
  });

  it("checks milestone order like the server", () => {
    const record = timings({
      in_suite: "2026-11-12T08:00:00Z",
      closure: "2026-11-12T10:00:00Z",
    });
    expect(
      milestoneOrderProblem(record, "knife_to_skin", new Date("2026-11-12T07:55:00Z")),
    ).toMatch(/cannot be before In suite/);
    expect(
      milestoneOrderProblem(record, "knife_to_skin", new Date("2026-11-12T10:05:00Z")),
    ).toMatch(/cannot be after Closure/);
    expect(
      milestoneOrderProblem(record, "knife_to_skin", new Date("2026-11-12T08:30:00Z")),
    ).toBeNull();
  });

  it("combines date and time inputs", () => {
    expect(combineLocalDateTime("", "08:00")).toBeNull();
    const iso = combineLocalDateTime("2026-11-13", "08:30");
    expect(iso && new Date(iso).getHours()).toBe(8);
  });
});

describe("TheatreTimingPanel", () => {
  it("captures the next milestone in one tap", async () => {
    fetchTheatreTimings.mockResolvedValue(timings({ in_suite: "2026-11-12T08:00:00Z" }));
    captureTheatreTiming.mockResolvedValue(timings());
    wrap(
      <TheatreTimingPanel theatreCase={{ uuid: "case-1", status: "in_theatre" }} canRecord />,
    );
    fireEvent.click(await screen.findByTestId("theatre-timing-next"));
    await waitFor(() =>
      expect(captureTheatreTiming).toHaveBeenCalledWith("case-1", {
        milestone: "anaesthesia_start",
      }),
    );
    expect(screen.getByTestId("theatre-timing-audit")).toHaveTextContent("from status change");
  });

  it("needs a reason to correct a recorded time", async () => {
    fetchTheatreTimings.mockResolvedValue(timings({ in_suite: "2026-11-12T08:00:00Z" }));
    wrap(
      <TheatreTimingPanel theatreCase={{ uuid: "case-1", status: "in_theatre" }} canRecord />,
    );
    const row = await screen.findByTestId("theatre-milestone-in_suite");
    fireEvent.click(within(row).getByRole("button", { name: "Correct" }));
    fireEvent.click(within(row).getByRole("button", { name: "Save" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/reason/i);
    expect(captureTheatreTiming).not.toHaveBeenCalled();
  });

  it("is read-only without the capability and hidden in the header for booked cases", async () => {
    fetchTheatreTimings.mockResolvedValue(timings());
    wrap(<TheatreTimingPanel theatreCase={{ uuid: "case-1", status: "in_theatre" }} canRecord={false} />);
    await screen.findByTestId("theatre-timing-panel");
    expect(screen.queryByTestId("theatre-timing-next")).toBeNull();
    cleanup();
    wrap(<TheatreTimingQuickCapture theatreCase={{ uuid: "case-1", status: "booked" }} canRecord />);
    expect(screen.queryByTestId("theatre-timing-quick")).toBeNull();
    expect(fetchTheatreTimings).toHaveBeenCalledTimes(1);
  });
});

describe("waiting list", () => {
  it("summarises waits and breaches", () => {
    expect(waitSummary(entry().wait)).toEqual({ text: "134 d / 90 d · breached", tone: "danger" });
    expect(
      waitSummary({ days_waited: 80, target_days: 90, target_date: "x", days_remaining: 10, breached: false })
        .tone,
    ).toBe("warning");
    expect(
      waitSummary({ days_waited: 10, target_days: 90, target_date: "x", days_remaining: 80, breached: false })
        .tone,
    ).toBe("neutral");
  });

  it("builds create and edit payloads", () => {
    const draft = {
      categoryUuid: "cat-p2",
      surgeon: { id: 7, name: "Dr Mwale" },
      procedures: [{ product: { uuid: "prod-1", name: "Hernia" }, laterality: "left" as const }],
      addedOn: "",
      duration: "75",
      priorityNotes: " Pain ",
      notes: "",
      changeReason: "Worse pain",
    };
    expect(
      buildWaitingListPayload(draft, { customerUuid: "c-1", clinicUuid: "cl-1", isEdit: false }),
    ).toEqual({
      urgency_category: "cat-p2",
      surgeon: 7,
      clinical_priority_notes: "Pain",
      notes: "",
      anticipated_duration_minutes: 75,
      procedures: [{ product: "prod-1", laterality: "left" }],
      customer: "c-1",
      clinic: "cl-1",
    });
    const edit = buildWaitingListPayload(draft, { isEdit: true, originalCategory: "cat-p3" });
    expect(edit.change_reason).toBe("Worse pain");
    expect(edit.customer).toBeUndefined();
  });

  it("lists entries with breach and readiness, and hides actions without the capability", async () => {
    fetchTheatreWaitingList.mockResolvedValue([entry()]);
    fetchTheatreUrgencyCategories.mockResolvedValue([]);
    wrap(<TheatreWaitingListPage />);
    const row = await screen.findByTestId("theatre-waiting-list-row");
    expect(row).toHaveTextContent("Chikondi Banda");
    expect(row).toHaveTextContent("breached");
    expect(row).toHaveTextContent("Not assessed");
    expect(within(row).queryByRole("button", { name: "Schedule" })).toBeNull();
    expect(fetchTheatreWaitingList).toHaveBeenCalledWith(
      expect.objectContaining({ status: "active", sort: "priority" }),
    );
  });

  it("offers schedule and remove to waiting-list managers", async () => {
    capabilities.current = ["manage_theatre_waiting_list"];
    fetchTheatreWaitingList.mockResolvedValue([entry()]);
    fetchTheatreUrgencyCategories.mockResolvedValue([]);
    wrap(<TheatreWaitingListPage />);
    const row = await screen.findByTestId("theatre-waiting-list-row");
    expect(within(row).getByRole("button", { name: "Schedule" })).toBeInTheDocument();
    expect(within(row).getByRole("button", { name: "Remove" })).toBeInTheDocument();
    expect(screen.getByTestId("theatre-waiting-list-add")).toBeInTheDocument();
  });
});

describe("pre-op clinic", () => {
  it("only lets required tests be ordered and blocks fit clearance while outstanding", () => {
    const record = assessment();
    expect(orderableTests(record.required_tests).map((test) => test.uuid)).toEqual(["test-ecg"]);
    expect(fitClearanceBlocker(record, false, "")).toMatch(/no result/);
    expect(fitClearanceBlocker(record, true, "")).toMatch(/Explain/);
    expect(fitClearanceBlocker(record, true, "ECG last week elsewhere")).toBeNull();
    expect(fitClearanceBlocker({ asa_grade: "", outstanding_tests: 0 }, false, "")).toMatch(/ASA/);
  });

  it("orders tests only after explicit confirmation", async () => {
    generateTheatrePreOpOrders.mockResolvedValue(assessment());
    wrap(<TheatrePreOpAssessmentPanel assessment={assessment()} canRecord canClear={false} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Select ECG" }));
    fireEvent.click(screen.getByTestId("theatre-pre-op-order"));
    expect(generateTheatrePreOpOrders).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByTestId("theatre-pre-op-order-confirm"));
    await waitFor(() =>
      expect(generateTheatrePreOpOrders).toHaveBeenCalledWith("assess-1", {
        tests: ["test-ecg"],
        confirm: true,
        encounter: undefined,
      }),
    );
    expect(screen.queryByTestId("theatre-pre-op-clear")).toBeNull();
  });

  it("describes rule conditions", () => {
    expect(
      describeRule({
        procedure_product: null,
        min_asa: "",
        min_age: null,
        max_age: null,
        sex: "",
        comorbidities: [],
      }),
    ).toBe("All patients");
    expect(
      describeRule({
        procedure_product: { uuid: "p", name: "Knee replacement", code: "", order_type: "procedure" },
        min_asa: "3",
        min_age: 50,
        max_age: null,
        sex: "",
        comorbidities: ["cardiac", "renal"],
      }),
    ).toBe("Knee replacement · ASA 3+ · age 50+ · Cardiac disease or Renal disease");
  });
});

describe("performance report", () => {
  it("shows utilisation, on-time starts and turnover", () => {
    const summary = {
      sessions: 1,
      sessions_with_cases: 1,
      session_minutes: 120,
      used_minutes: 70,
      utilisation_percent: 58.3,
      cases_timed: 2,
      in_room_minutes: 100,
      first_case_on_time: 0,
      first_case_on_time_rate_percent: 0,
      late_starts: 1,
      average_late_minutes: 20,
      overruns: 1,
      overrun_minutes: 30,
      turnovers: 1,
      average_turnover_minutes: 30,
      median_turnover_minutes: 30,
    };
    const report: TheatrePerformanceReport = {
      date_from: "2026-11-11",
      date_to: "2026-11-11",
      first_case_tolerance_minutes: 15,
      turnover_gap_cap_minutes: 120,
      totals: { ...summary, out_of_session_cases: 1, out_of_session_minutes: 30 },
      by_room: [{ ...summary, room_id: 1, room_name: "OT 1" }],
      by_surgeon: [{ ...summary, surgeon_id: 7, surgeon_name: "Dr Mwale" }],
      by_day: [{ ...summary, date: "2026-11-11" }],
      late_starts: [],
      overruns: [],
      sessions: [],
      intervals: [],
      out_of_session: [],
    };
    wrap(<TheatrePerformanceReportBody report={report} />);
    const body = screen.getByTestId("theatre-performance-report");
    expect(body).toHaveTextContent("58.3%");
    expect(body).toHaveTextContent("First case on time (±15 min)");
    expect(body).toHaveTextContent("30 min");
    expect(body).toHaveTextContent("OT 1");
  });
});
