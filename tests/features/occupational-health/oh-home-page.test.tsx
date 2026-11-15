import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render as rtlRender, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ROUTES } from "@/constants/routes";
import { OhModuleBar } from "@/features/occupational-health/components/OhModuleBar";
import { OhHomePage } from "@/features/occupational-health/pages/OhHomePage";

const nav = vi.hoisted(() => ({
  replace: vi.fn(),
  push: vi.fn(),
  pathname: "/occupational-health/home",
  search: "",
}));

const data = vi.hoisted(() => ({
  encounters: [] as Array<Record<string, unknown>>,
  compliance: null as { overdue: number; due: number; completed: number } | null,
  exposure: vi.fn(),
  immCompliance: vi.fn(),
  immDue: vi.fn(),
  immFollowups: vi.fn(),
  daDue: vi.fn(),
  daMro: vi.fn(),
  daRtd: vi.fn(),
  daRandom: vi.fn(),
  fitBoard: vi.fn(),
  hpDue: vi.fn(),
  home: vi.fn(),
}));

function render(node: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return rtlRender(<QueryClientProvider client={client}>{node}</QueryClientProvider>);
}

const user = vi.hoisted(() => ({
  value: {
    userData: { groups: ["OccupationalHealth"], enabled_modules: ["OccupationalHealth"], is_admin: false },
    isLoading: false,
  } as { userData: unknown; isLoading: boolean },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: nav.push, replace: nav.replace, prefetch: vi.fn() }),
  usePathname: () => nav.pathname,
  useSearchParams: () => new URLSearchParams(nav.search),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@/providers/user-provider", () => ({
  useUser: () => user.value,
}));

vi.mock("@/features/occupational-health/hooks/use-occupational-health", () => ({
  useOhEncounters: () => ({
    data: data.encounters,
    isLoading: false,
    isSuccess: true,
    isError: false,
    refetch: vi.fn(),
  }),
  useOhComplianceDashboard: () => ({ data: data.compliance }),
}));

vi.mock("@/features/exposure-management/services/exposure.service", () => ({
  exposureKeys: { dashboard: ["exposure", "dashboard"] },
  fetchExposureDashboard: () => data.exposure(),
}));

vi.mock("@/features/occupational-health/services/immunisation.service", () => ({
  fetchOhImmCompliance: () => data.immCompliance(),
  fetchOhImmDue: () => data.immDue(),
  fetchOhImmExposureDueFollowups: () => data.immFollowups(),
}));

vi.mock("@/features/occupational-health/services/drug-alcohol.service", () => ({
  fetchDaDue: () => data.daDue(),
  fetchDaMroQueue: () => data.daMro(),
  fetchDaRtdCases: () => data.daRtd(),
  fetchDaCompliance: () => data.daRandom(),
}));

vi.mock("@/features/occupational-health/services/fitness.service", () => ({
  fetchFitBoard: () => data.fitBoard(),
}));

vi.mock("@/features/occupational-health/services/health-programs.service", () => ({
  HP_PROGRAMS: ["hearing", "lung", "vision", "ergonomics", "fatigue"],
  fetchHpDue: () => data.hpDue(),
}));

vi.mock("@/features/occupational-health/services/oh-home.service", () => ({
  ohHomeKeys: { summary: (module: string) => ["oh-home", "summary", module] },
  fetchOhHomeSummary: (module: string) => data.home(module),
}));

const HOME: Record<string, unknown> = {
  clinic: {
    visits_by_day: Array.from({ length: 14 }, (_, i) => ({ date: `2026-11-${String(i + 1).padStart(2, "0")}`, visits: i, cancelled: 0 })),
    iod: { open: 1, opened_30d: 2, closed_30d: 1, lost_days_open: 4, recent: [{ uuid: "iod-1", severity: "serious", body_part: "Left hand", mechanism: "Caught in roller", onset_date: "2026-11-12", status: "open" }] },
    certificates: { expiring_30d: 17, expired_30d: 3 },
  },
  immunizations: {
    stock: { lots: 4, expiring_60d: 1, low_stock: 1, quarantined: 1, recalled: 0, expiring: [{ uuid: "lot-1", vaccine: "Hepatitis B", lot_number: "HB-2291", expiry_date: "2026-11-26", quantity_on_hand: 8 }] },
    doses_by_week: [{ week_start: "2026-11-09", doses: 11 }],
    coverage_by_vaccine: [{ code: "HEPB", name: "Hepatitis B", people: 10, up_to_date: 6, percent: 60 }],
    coverage_matrix: {
      vaccines: [{ code: "HEPB", name: "Hepatitis B" }, { code: "FLU", name: "Influenza" }],
      employers: [{ employer: "Illovo", people: 8, cells: [{ code: "HEPB", people: 8, up_to_date: 4, percent: 50 }, null] }],
    },
    lots_timeline: { window_days: 120, lots: [{ uuid: "lot-1", vaccine: "Hepatitis B", lot_number: "HB-2291", expiry_date: "2026-11-26", days_left: 11, quantity_on_hand: 8 }] },
  },
  "drug-alcohol": {
    month: { tests: 4, verified: 2, positive: 1, refusals: 0, cancelled: 0, positivity_rate: 50 },
    by_reason: [{ reason: "random", tests: 3, positive: 0 }],
    recent: [{ uuid: "t1", customer_initials: "Y.C.", employer_name: "Press Cane", reason: "reasonable_suspicion", status: "verified", final_result: "positive", created_at: "2026-11-13T10:00:00Z" }],
  },
  fitness: {
    expiring: { count: 1, rows: [{ customer_uuid: "w9", worker_label: "Esther Nkhoma", employer_name: "Illovo", earliest_expiry: "2026-11-20" }] },
    by_employer: [{ employer: "Illovo", workers: 10, fit: 8, restricted: 1, not_fit: 1, unknown: 0 }],
    blockers_by_source: [
      { source: "medical", workers: 3, not_fit: 1, restricted: 2 },
      { source: "programme", workers: 0, not_fit: 0, restricted: 0 },
    ],
    expiring_by_week: [{ week_start: "2026-11-15", count: 1 }, { week_start: "2026-11-22", count: 2 }],
    training_expiring: { count: 2, by_course: [{ course: "Working at heights", count: 2 }] },
  },
  "health-programs": {
    by_month: [{ month: "2026-11", total: 5, hearing: 5, lung: 0, vision: 0, ergonomics: 0, fatigue: 0 }],
    outcomes_12m: { fit: 8, restricted: 1, unfit: 1, pending: 0 },
    referrals: { count_60d: 1, rows: [{ uuid: "r1", customer_uuid: "c1", program: "lung", performed_at: "2026-11-10T10:00:00Z", outcome: "unfit" }] },
  },
  "exposure-management": {
    recent_results: [{ uuid: "m1", agent: "Noise", group: "Mill operators", sampled_at: "2026-11-14T10:00:00Z", evaluation: "exceeds", worst_ratio: 1.26, below_lod: false, result_value: 89, result_unit: "dB(A)" }],
    controls: { open: 3, overdue: 2, by_hierarchy: [{ hierarchy: "engineering", open: 2 }, { hierarchy: "ppe", open: 1 }] },
  },
};

afterEach(cleanup);

const exposureDashboard = {
  kpis: { open_events: 2, open_critical: 1 },
  agents: [{ uuid: "a1", code: "SILICA", name: "Respirable silica", category: "dust" }],
  groups: [
    { uuid: "g1", code: "F", name: "Foundry", members: 12, cells: [{ agent_id: 1, band: 4, confidence: "ok", sample_count: 9, p95: 0.2, oel_value: 0.05, oel_unit: "mg/m3", status: "draft", open_events: 1 }] },
  ],
  events: [
    { uuid: "e1", severity: "critical", status: "open", agent_name: "Respirable silica", group_name: "Foundry", summary: "", overdue: true },
    { uuid: "e2", severity: "action_level", status: "closed", agent_name: "Noise", group_name: "Press shop", summary: "", overdue: false },
  ],
};

describe("OhHomePage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    data.encounters = [];
    data.compliance = null;
    for (const key of ["home", "exposure", "immCompliance", "immDue", "immFollowups", "daDue", "daMro", "daRtd", "daRandom", "fitBoard", "hpDue"] as const) {
      data[key].mockReset();
    }
    data.exposure.mockResolvedValue(exposureDashboard);
    data.home.mockReset();
    data.home.mockImplementation(async (module: string) => HOME[module]);
    nav.replace.mockReset();
    nav.push.mockReset();
    nav.pathname = "/occupational-health/home";
    nav.search = "";
    user.value = {
      userData: { groups: ["OccupationalHealth"], enabled_modules: ["OccupationalHealth"], is_admin: false },
      isLoading: false,
    };
  });

  it("has no header search or stats strip", () => {
    render(<OhHomePage />);

    expect(screen.queryByTestId("oh-home-search")).not.toBeInTheDocument();
    expect(screen.queryByTestId("oh-home-figures")).not.toBeInTheDocument();
  });

  it("opens on the clinic module with its pages and a start link", () => {
    render(<OhHomePage />);

    const detail = screen.getByTestId("oh-home-module-detail");
    expect(within(detail).getByRole("heading", { name: "OHS clinic" })).toBeInTheDocument();
    expect(within(detail).getByRole("link", { name: "Open queue" })).toHaveAttribute(
      "href",
      `${ROUTES.occupationalHealthHome}?module=queue`,
    );
    expect(within(detail).getByText("No visits in the queue.")).toBeInTheDocument();
    expect(within(detail).getByRole("link", { name: /^Employees/ })).toHaveAttribute("href", ROUTES.occupationalHealthEmployees);
    expect(screen.getByTestId("oh-home-module-clinic")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("heading", { level: 1, name: "Occupational Health" })).toBeInTheDocument();
  });

  it("lists the visits waiting in the clinic queue, with where compliance stands", () => {
    data.encounters = [
      {
        uuid: "enc-1",
        visit: "visit-1",
        customer_name: "Owen Onions",
        customer_uuid: "worker-1",
        employer_name: "Illovo",
        department_name: "OHS",
        status: "waiting",
        started_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      },
    ];
    data.compliance = { overdue: 4, due: 2, completed: 10 };

    render(<OhHomePage />);

    const row = screen.getByTestId("oh-home-queue-row");
    expect(row).toHaveAttribute("href", ROUTES.occupationalHealthEncounter("visit-1", "enc-1"));
    expect(row).toHaveTextContent("Owen Onions");
    expect(screen.getByTestId("oh-home-runway-behind")).toHaveTextContent("4checks overdue");
    expect(screen.getByTestId("oh-home-runway-now")).toHaveTextContent("2checks due");
    expect(screen.getAllByTestId("oh-home-runway-item")[0]).toHaveAttribute("href", ROUTES.occupationalHealthCompliance);
    const compliance = screen.getByTestId("oh-home-compliance");
    expect(compliance).toHaveTextContent("10 of 16 checks up to date");
    expect(within(compliance).getByTestId("oh-home-section-count")).toHaveTextContent(/63\s?% of checks up to date/);
  });

  it("shows three people in the clinic and the whole queue on its own tab", () => {
    data.encounters = Array.from({ length: 4 }, (_, index) => ({
      uuid: `enc-${index}`,
      visit: `visit-${index}`,
      customer_name: `Person ${index}`,
      status: "waiting",
      started_at: new Date(Date.now() - (index + 1) * 60_000).toISOString(),
      created_at: new Date().toISOString(),
    }));

    const { unmount } = render(<OhHomePage />);

    expect(screen.getAllByTestId("oh-home-queue-row")).toHaveLength(3);
    expect(screen.getByText(/and 1 more in the queue/)).toBeInTheDocument();
    const tabs = screen.getByRole("navigation", { name: "Modules" });
    const labels = within(tabs).getAllByRole("button").map((button) => button.textContent);
    const clinicIndex = labels.findIndex((label) => label?.includes("OHS clinic"));
    expect(labels[clinicIndex + 1]).toContain("Queue");

    fireEvent.click(screen.getByTestId("oh-home-module-queue"));
    expect(nav.replace).toHaveBeenCalledWith("/occupational-health/home?module=queue", { scroll: false });

    unmount();
    nav.search = "module=queue";
    render(<OhHomePage />);

    expect(screen.getByTestId("oh-home-module-queue")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("oh-home-module-clinic")).toHaveAttribute("aria-pressed", "false");
    expect(screen.getAllByTestId("oh-queue-board-row")).toHaveLength(4);
  });

  it("immunizations leads with overall coverage and what needs a dose", async () => {
    nav.search = "module=immunizations";
    data.immCompliance.mockResolvedValue({
      group_by: "employer",
      summary: { people: 15, compliant: 10, percent_compliant: 66.7, overdue_rows: 5 },
      groups: [
        { group: "Illovo", people: 10, compliant: 8, overdue: 2, percent_compliant: 80 },
        { group: "Mill", people: 5, compliant: 2, overdue: 3, percent_compliant: 40 },
      ],
      overdue: [],
    });
    data.immDue.mockResolvedValue([{}, {}, {}]);
    data.immFollowups.mockResolvedValue([{}]);

    render(<OhHomePage />);

    const view = await screen.findByTestId("oh-home-view-immunizations");
    await waitFor(() => expect(view).toHaveTextContent("10 of 15 workers have every vaccine their job needs."));
    expect(within(view).getByRole("img", { name: "67% of workers are fully covered" })).toBeInTheDocument();
    const todos = within(view).getAllByTestId("oh-home-todo");
    expect(todos[0]).toHaveTextContent("5doses overdue");
    expect(todos[1]).toHaveTextContent("3doses due this week");
    expect(todos[2]).toHaveAttribute("href", ROUTES.exposureManagementIncidents);
    expect(within(screen.getByTestId("oh-home-module-detail")).getByRole("link", { name: /^Due/ })).toHaveAttribute("href", ROUTES.immunizationsDue);
  });

  it("shows an error line, not zeros, when a module's data cannot be loaded", async () => {
    nav.search = "module=immunizations";
    data.immCompliance.mockRejectedValue(new Error("down"));
    data.immDue.mockResolvedValue([]);
    data.immFollowups.mockResolvedValue([]);

    render(<OhHomePage />);

    const view = await screen.findByTestId("oh-home-view-immunizations");
    expect(await within(view).findByRole("alert")).toHaveTextContent("Could not load this.");
  });

  it("drug and alcohol shows the flow from due, to the MRO, to return to duty", async () => {
    nav.search = "module=drug-alcohol";
    data.daDue.mockResolvedValue({ rows: [], counts: { total: 7, overdue: 2 } });
    data.daMro.mockResolvedValue([{}, {}]);
    data.daRtd.mockResolvedValue([{ rtd_passed_at: null }, { rtd_passed_at: "2026-01-01" }]);
    data.daRandom.mockResolvedValue([
      { pool_uuid: "p1", pool_name: "Mine crews", drug_tests_done: 3, drug_tests_required: 10, drug_on_track: false },
    ]);

    render(<OhHomePage />);

    const stages = await screen.findAllByTestId("oh-home-da-stage");
    expect(stages.map((stage) => stage.getAttribute("href"))).toEqual([ROUTES.drugAlcoholDue, ROUTES.drugAlcoholMro, ROUTES.drugAlcoholRtd]);
    expect(stages[0]).toHaveTextContent("7");
    expect(stages[0]).toHaveTextContent("2 overdue");
    expect(stages[1]).toHaveTextContent("2");
    expect(stages[2]).toHaveTextContent("1");
    expect(await screen.findByText(/3 of 10 drug tests · behind/)).toBeInTheDocument();
  });

  it("fitness leads with a roll call and puts the workers who are not fit first", async () => {
    nav.search = "module=fitness";
    data.fitBoard.mockResolvedValue({
      counts: { fit: 6, fit_with_restrictions: 2, not_fit: 1, unknown: 1, due_soon: 3 },
      employers: [],
      sites: [],
      results: [
        { customer_uuid: "w1", worker_label: "Worker A", overall: "fit_with_restrictions", reason: "No heights", employer_name: "Illovo" },
        { customer_uuid: "w2", worker_label: "Worker B", overall: "not_fit", reason: "Medical expired", employer_name: "Mill" },
        { customer_uuid: "w3", worker_label: "Worker C", overall: "fit", reason: null, employer_name: "Mill" },
      ],
    });

    render(<OhHomePage />);

    const view = await screen.findByTestId("oh-home-view-fitness");
    await waitFor(() => expect(screen.getByTestId("oh-home-fit-rollcall")).toHaveTextContent("6of 10 can work without limits today"));
    expect(screen.getByTestId("oh-home-fit-rollcall")).toHaveTextContent("3 clearances expire soon");
    const workers = within(view).getAllByTestId("oh-home-fit-worker");
    expect(workers.map((worker) => worker.textContent)).toEqual([
      expect.stringContaining("Worker B"),
      expect.stringContaining("Worker A"),
    ]);
    expect(workers[0]).toHaveAttribute("href", ROUTES.occupationalHealthEmployee("w2"));
  });

  it("health programs shows one lane per programme with how many are due", async () => {
    nav.search = "module=health-programs";
    data.hpDue.mockResolvedValue({ rows: [], counts: { total: 9, overdue: 3, never: 2, due: 4, hearing: 5, lung: 4 } });

    render(<OhHomePage />);

    const lanes = await screen.findAllByTestId("oh-home-hp-lane");
    expect(lanes).toHaveLength(5);
    expect(lanes[0]).toHaveAttribute("href", ROUTES.healthProgramsHearing);
    expect(lanes[0]).toHaveTextContent("5");
    expect(lanes[2]).toHaveTextContent("0");
    expect(screen.getByTestId("oh-home-view-health-programs")).toHaveTextContent("3 overdue, 2 never tested, and 4 due soon.");
  });

  it("exposure shows the heatmap and only the open events", async () => {
    nav.search = "module=exposure-management";

    render(<OhHomePage />);

    const view = await screen.findByTestId("oh-home-view-exposure-management");
    expect(await within(view).findByText("Over limit")).toBeInTheDocument();
    const events = within(view).getAllByTestId("oh-home-exposure-event");
    expect(events).toHaveLength(1);
    expect(events[0]).toHaveAttribute("href", `${ROUTES.exposureManagementEvents}?event=e1`);
    expect(events[0]).toHaveTextContent("Overdue");
  });

  it("lists every page of the module under its view", () => {
    nav.search = "module=drug-alcohol";
    data.daDue.mockResolvedValue({ rows: [], counts: {} });
    data.daMro.mockResolvedValue([]);
    data.daRtd.mockResolvedValue([]);
    data.daRandom.mockResolvedValue([]);

    render(<OhHomePage />);

    expect(screen.getByRole("link", { name: /MRO review/ })).toHaveAttribute("href", ROUTES.drugAlcoholMro);
  });

  it("clinic adds certificates and a fortnight of visits from the OH service, without an injuries section", async () => {
    data.compliance = { overdue: 4, due: 2, completed: 10 };

    render(<OhHomePage />);

    await waitFor(() => expect(screen.getByTestId("oh-home-runway-behind")).toHaveTextContent("3certificates lapsed"));
    expect(screen.queryByTestId("oh-home-iod-case")).not.toBeInTheDocument();
    expect(screen.queryByText("Injuries on duty", { selector: "h3 *" })).not.toBeInTheDocument();
    expect(screen.getByTestId("oh-home-runway-next")).toHaveTextContent("17certificates expiring");
    const visits = screen.getByTestId("oh-home-visits");
    expect(within(visits).getAllByTestId("oh-home-visit-day")).toHaveLength(14);
    expect(visits).toHaveTextContent("Busiest");
    expect(data.home).toHaveBeenCalledWith("clinic");
  });

  it("immunizations shows coverage by employer and vaccine, shelf life and doses per week", async () => {
    nav.search = "module=immunizations";
    data.immCompliance.mockResolvedValue({ group_by: "employer", summary: { people: 0, compliant: 0, percent_compliant: 0, overdue_rows: 0 }, groups: [], overdue: [] });
    data.immDue.mockResolvedValue([]);
    data.immFollowups.mockResolvedValue([]);

    render(<OhHomePage />);

    const cell = await screen.findByTestId("oh-home-imm-cell");
    expect(cell).toHaveTextContent("50%");
    expect(cell).toHaveAttribute("title", "Illovo, Hepatitis B: 4 of 8 covered");
    expect(within(screen.getByTestId("oh-home-imm-grid")).getByTitle("Not required")).toBeInTheDocument();
    expect(screen.getByTestId("oh-home-imm-lot")).toHaveTextContent("Hepatitis BHB-229111 days8 doses");
    expect(screen.getByTestId("oh-home-imm-shelf")).toHaveTextContent("1 lot in quarantine");
    expect(screen.getByRole("img", { name: "Doses given per week over the last 8 weeks, 11 in all." })).toBeInTheDocument();
  });

  it("drug and alcohol adds the month, reasons and latest tests by initials only", async () => {
    nav.search = "module=drug-alcohol";
    data.daDue.mockResolvedValue({ rows: [], counts: {} });
    data.daMro.mockResolvedValue([]);
    data.daRtd.mockResolvedValue([]);
    data.daRandom.mockResolvedValue([]);

    render(<OhHomePage />);

    const test = await screen.findByTestId("oh-home-da-test");
    expect(test).toHaveTextContent("Y.C.");
    expect(test).toHaveTextContent("Reasonable suspicion");
    expect(test).toHaveTextContent("Positive");
    expect(screen.getByText("50% of verified results were positive.")).toBeInTheDocument();
    expect(screen.getByRole("meter", { name: "Random: 3" })).toBeInTheDocument();
  });

  it("fitness shows a dot per worker by employer, what keeps people off, expiries ahead and training", async () => {
    nav.search = "module=fitness";
    data.fitBoard.mockResolvedValue({ counts: { fit: 1, fit_with_restrictions: 0, not_fit: 0, unknown: 0, due_soon: 0 }, employers: [], sites: [], results: [] });

    render(<OhHomePage />);

    expect(await screen.findByTestId("oh-home-fit-expiring")).toHaveAttribute("href", ROUTES.occupationalHealthEmployee("w9"));
    const employer = screen.getByTestId("oh-home-fit-employer");
    expect(employer).toHaveTextContent("80% fit · 10");
    expect(within(employer).getByRole("img", { name: "Illovo: 8 fit, 1 restricted, 1 not fit, 0 not assessed" })).toBeInTheDocument();
    const blockers = screen.getAllByTestId("oh-home-fit-blocker");
    expect(blockers[0]).toHaveTextContent("Medical1 not fit · 2 restricted");
    expect(blockers[1]).toHaveTextContent("none");
    expect(screen.getByRole("img", { name: "Clearances running out per week over the next eight weeks, 3 in all." })).toBeInTheDocument();
    expect(screen.getByTestId("oh-home-fit-course")).toHaveTextContent("Working at heights2");
  });

  it("health programs adds tests per month, outcomes and referrals", async () => {
    nav.search = "module=health-programs";
    data.hpDue.mockResolvedValue({ rows: [], counts: {} });

    render(<OhHomePage />);

    const referral = await screen.findByTestId("oh-home-hp-referral");
    expect(referral).toHaveAttribute("href", ROUTES.healthProgramsLung);
    expect(referral).toHaveTextContent("Not fit");
    expect(screen.getByRole("img", { name: "Outcomes: 8 fit, 1 restricted, 1 not fit, 0 no outcome yet" })).toBeInTheDocument();
  });

  it("exposure adds latest results against the limit, controls, sampling and incidents", async () => {
    nav.search = "module=exposure-management";
    data.exposure.mockResolvedValue({
      ...exposureDashboard,
      kpis: { ...exposureDashboard.kpis, plans_overdue: 2, plans_due_soon: 0, calibrations_overdue: 0, calibrations_due_soon: 0, reviews_due: 0 },
      biological: { open_incidents: 2, urgent: 1, last_90_days: 5, followups_due: 2 },
    });

    render(<OhHomePage />);

    expect(await screen.findByTestId("oh-home-exposure-result")).toHaveTextContent("126%");
    expect(screen.getByText("2 overdue.")).toBeInTheDocument();
    const todos = screen.getAllByTestId("oh-home-todo").map((todo) => todo.textContent);
    expect(todos).toEqual(expect.arrayContaining([expect.stringContaining("2Sampling plans overdue"), expect.stringContaining("1Need urgent care")]));
  });

  it("keeps the rest of a module when its OH service summary fails", async () => {
    data.home.mockRejectedValue(new Error("down"));
    data.encounters = [{ uuid: "enc-1", visit: "visit-1", customer_name: "Owen Onions", status: "waiting", started_at: new Date().toISOString() }];

    render(<OhHomePage />);

    expect((await screen.findAllByRole("alert")).length).toBeGreaterThan(0);
    expect(screen.getByTestId("oh-home-queue-row")).toHaveTextContent("Owen Onions");
  });

  it("writes the chosen module to the URL", () => {
    render(<OhHomePage />);

    fireEvent.click(screen.getByTestId("oh-home-module-fitness"));

    expect(nav.replace).toHaveBeenCalledWith("/occupational-health/home?module=fitness", { scroll: false });
  });

  it("denies access without OH modules", async () => {
    user.value = { userData: { groups: ["Registration"], enabled_modules: ["Registration"] }, isLoading: false };

    render(<OhHomePage />);

    await waitFor(() => expect(screen.getByTestId("oh-access-denied")).toBeInTheDocument());
  });
});

describe("OhModuleBar", () => {
  beforeEach(() => {
    user.value = {
      userData: { groups: ["OccupationalHealth"], enabled_modules: ["OccupationalHealth"], is_admin: false },
      isLoading: false,
    };
  });

  it("shows the module's pages as tabs with the current one marked", () => {
    nav.pathname = ROUTES.drugAlcoholMro;

    render(<OhModuleBar />);

    const tabs = screen.getByRole("navigation", { name: "Drug & Alcohol pages" });
    expect(within(tabs).getByRole("link", { name: "MRO review" })).toHaveAttribute("aria-current", "page");
    expect(within(tabs).getByRole("link", { name: "Due" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: "All Occupational Health modules" })).toHaveAttribute(
      "href",
      ROUTES.occupationalHealthHome,
    );
  });

  it("stays hidden on the OH home page", () => {
    nav.pathname = ROUTES.occupationalHealthHome;

    render(<OhModuleBar />);

    expect(screen.queryByTestId("oh-module-bar")).not.toBeInTheDocument();
  });
});
