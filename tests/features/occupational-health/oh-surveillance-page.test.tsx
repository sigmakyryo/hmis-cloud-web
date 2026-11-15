import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { OhSurveillancePage } from "@/features/occupational-health/pages/OhSurveillancePage";
import { filterWorkRows, EMPTY_WORKLIST_FILTERS } from "@/features/occupational-health/components/surveillance/OhSurveillanceWorklist";
import { toWorkRows } from "@/features/occupational-health/components/surveillance/oh-surveillance-utils";

const ext = vi.hoisted(() => ({
  fetchComplianceInsights: vi.fn(),
  runSurvRecalls: vi.fn(),
  fetchSurvRecalls: vi.fn(),
  acknowledgeSurvRecall: vi.fn(),
}));
const queue = vi.hoisted(() => ({ data: [] as unknown[], isLoading: false, error: null as unknown }));
const toast = vi.hoisted(() => vi.fn());

vi.mock("@/features/occupational-health/services/oh-ext.service", () => ext);
vi.mock("@/features/occupational-health/services/oh.service", () => ({ downloadOhComplianceExtract: vi.fn() }));
vi.mock("@/providers/toast-provider", () => ({ useToast: () => ({ toast }) }));
const nav = vi.hoisted(() => ({ search: "" }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/occupational-health/surveillance",
  useSearchParams: () => new URLSearchParams(nav.search),
}));
vi.mock("@/features/appointments/components/CreateAppointmentDialog", () => ({
  CreateAppointmentDialog: ({ customer }: { customer: { full_name: string } }) => <div data-testid="appointment-dialog">{customer.full_name}</div>,
}));
vi.mock("@/providers/user-provider", () => ({
  useUser: () => ({ isLoading: false, userData: { groups: ["OccupationalHealth"], enabled_modules: ["OccupationalHealth"] } }),
}));
vi.mock("@/features/occupational-health/hooks/use-occupational-health", () => ({
  useOhCampaignQueue: () => ({ ...queue, isFetching: false, refetch: vi.fn() }),
  useOhFitnessValidityAlerts: () => ({
    data: [
      { employment_episode_uuid: "ep-9", customer_uuid: "c-9", customer_identifier: "E9", customer_name: "Cert Holder", employer: "Acme", job_title: "", site: "", alert_codes: ["certificate_expiring"], review_date: null, certificate_valid_to: "2026-12-01", latest_outcome: "fit" },
    ],
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

const day = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};

const ROWS = [
  { uuid: "11111111-1111-4111-8111-111111111111", customer_uuid: "c-1", customer_identifier: "E001", customer_name: "Jane Doe", employer: "Acme", job_title: "Operator", site: "Plant A", department_name: "Mill", hazard_profile: "Noise zone", component_code: "AUDIO", exam_type: "periodic", due_date: day(-40), status: "overdue" },
  { uuid: "22222222-2222-4222-8222-222222222222", customer_uuid: "c-2", customer_identifier: "E002", customer_name: "Bob Banda", employer: "Acme", job_title: "Driller", site: "North pit", department_name: "Mining", hazard_profile: "Dust", component_code: "SPIRO", exam_type: "periodic", due_date: day(5), status: "due" },
  { uuid: "33333333-3333-4333-8333-333333333333", customer_uuid: "c-3", customer_identifier: "E003", customer_name: "Alice Phiri", employer: "Bolt", job_title: "Driver", site: "Plant A", department_name: "Transport", hazard_profile: "", component_code: "VISION", exam_type: "periodic", due_date: day(60), status: "due" },
];

const INSIGHTS = {
  generated_at: "2026-11-11T00:00:00Z",
  months: 12,
  totals: { open: 3, due: 2, overdue: 1, completed: 40, waived: 2 },
  compliance: { rate_3m: 84.2, rate_prev_3m: 80, rate_period: 82 },
  completed: { last_30_days: 12, previous_30_days: 9 },
  due_windows: { overdue_30_plus: 1, overdue: 0, next_7: 1, next_30: 0, next_90: 1, later: 0 },
  trend: [],
  by_exam: [{ key: "AUDIO · periodic", due: 0, overdue: 1, total: 1 }],
  by_site: [{ key: "Plant A", due: 1, overdue: 1, total: 2 }],
  by_department: [],
  by_hazard_profile: [],
  by_employer: [],
};

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <OhSurveillancePage />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  queue.data = ROWS;
  queue.isLoading = false;
  queue.error = null;
  ext.fetchComplianceInsights.mockResolvedValue(INSIGHTS);
  ext.fetchSurvRecalls.mockResolvedValue([]);
  ext.runSurvRecalls.mockResolvedValue({ in_app: 1, queued: 0, sent: 0, skipped: 0, failed: 0 });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  nav.search = "";
});

const workerNames = () => screen.getAllByTestId("oh-worklist-row").map((r) => within(r).getAllByRole("button")[0].textContent);

describe("OhSurveillancePage", () => {
  it("shows KPIs with deltas, the certificate alert strip and the worklist", async () => {
    renderPage();
    expect(screen.getByTestId("oh-surveillance-page")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId("oh-kpi-completed")).toHaveTextContent("12 done in 30 days (+3)"));
    expect(screen.getByTestId("oh-kpi-compliance")).toHaveTextContent("84% compliance, 3 months (+4.2 pts)");
    expect(screen.getByTestId("oh-kpi-overdue")).toHaveTextContent("1Overdue1 over 30 days");
    expect(screen.getByTestId("oh-kpi-due30")).toHaveTextContent("1Next 30 days1 this week");
    expect(screen.getByTestId("oh-fitness-validity-alerts")).toHaveTextContent("Cert Holder");
    expect(screen.getByText("Due and overdue checks")).toBeInTheDocument();
    expect(screen.getByTestId("oh-campaign-queue-section")).toBeInTheDocument();
    expect(workerNames()).toEqual(["Jane Doe", "Bob Banda", "Alice Phiri"]);
    expect(screen.getByText("40 days overdue")).toBeInTheDocument();
  });

  it("filters by search and by the Overdue KPI, and sorts by worker", async () => {
    renderPage();
    fireEvent.change(screen.getByTestId("oh-worklist-search"), { target: { value: "north" } });
    expect(workerNames()).toEqual(["Bob Banda"]);
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    fireEvent.click(screen.getByTestId("oh-kpi-overdue"));
    expect(workerNames()).toEqual(["Jane Doe"]);
    fireEvent.click(screen.getByTestId("oh-kpi-open"));
    fireEvent.click(screen.getByRole("button", { name: /^Worker/ }));
    expect(workerNames()).toEqual(["Alice Phiri", "Bob Banda", "Jane Doe"]);
    fireEvent.change(screen.getByTestId("oh-worklist-search"), { target: { value: "nobody" } });
    expect(screen.getByText("No requirements match these filters.")).toBeInTheDocument();
  });

  it("opens the details sheet and sends a recall for that requirement after confirming", async () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Jane Doe" }));
    const sheet = await screen.findByTestId("oh-requirement-sheet");
    expect(within(sheet).getByText("Noise zone")).toBeInTheDocument();
    fireEvent.click(within(sheet).getByRole("button", { name: /Send recall/ }));
    const dialog = await screen.findByTestId("oh-send-recall-dialog");
    expect(dialog).toHaveTextContent("Send recall to 1 worker");
    fireEvent.click(within(dialog).getByRole("button", { name: "Send recalls" }));
    await waitFor(() =>
      expect(ext.runSurvRecalls).toHaveBeenCalledWith({
        within_days: 180,
        channels: ["email"],
        requirement_uuids: [ROWS[0].uuid],
      }),
    );
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Recalls processed" }));
  });

  it("bulk-selects rows and schedules from a row", async () => {
    renderPage();
    fireEvent.click(screen.getByLabelText("Select Jane Doe"));
    fireEvent.click(screen.getByLabelText("Select Bob Banda"));
    const bulk = screen.getByTestId("oh-worklist-bulk");
    expect(bulk).toHaveTextContent("2 selected");
    fireEvent.click(within(bulk).getByRole("button", { name: /Send recall/ }));
    const dialog = await screen.findByTestId("oh-send-recall-dialog");
    expect(dialog).toHaveTextContent("Send recall to 2 workers");
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    fireEvent.click(screen.getByLabelText("Schedule Bob Banda"));
    expect(screen.getByTestId("appointment-dialog")).toHaveTextContent("Bob Banda");
  });

  it("has no page header, keeps actions in a toolbar, shows KPIs flat and switches to recalls", async () => {
    renderPage();
    expect(screen.queryByText(/Who is due or overdue for medical surveillance/)).toBeNull();
    expect(screen.getByRole("heading", { level: 1, name: "Surveillance" }).className).toContain("sr-only");
    const toolbar = screen.getByRole("toolbar", { name: "Surveillance actions" });
    expect(within(toolbar).getByRole("button", { name: "Refresh" })).toBeInTheDocument();
    expect(within(toolbar).getByRole("button", { name: /Export/ })).toBeInTheDocument();
    fireEvent.click(within(toolbar).getByRole("button", { name: /Send recalls/ }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    // KPIs are flat figures, not bordered cards.
    expect(screen.getByTestId("oh-kpi-overdue").className).not.toMatch(/\bborder\b|rounded-xl|shadow/);
    expect(screen.getByTestId("oh-kpi-overdue").getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(screen.getByTestId("oh-kpi-overdue"));
    expect(screen.getByTestId("oh-kpi-overdue").getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("tab", { name: /Recalls/ }));
    expect(await screen.findByTestId("oh-surv-recalls")).toBeInTheDocument();
    fireEvent.click(within(screen.getByTestId("oh-surv-recalls")).getByRole("tab", { name: /Worklist/ }));
    expect(await screen.findByTestId("oh-campaign-queue-section")).toBeInTheDocument();
  });

  it("shows empty and error states", async () => {
    queue.data = [];
    ext.fetchComplianceInsights.mockRejectedValue(new Error("Insights offline"));
    renderPage();
    expect(screen.getByText("No due or overdue requirements. Everyone is up to date.")).toBeInTheDocument();
    const alert = await screen.findByText(/Trends could not be loaded/);
    expect(alert).toHaveTextContent("these counts come from the worklist");
    expect(screen.getByTestId("oh-kpi-open")).toHaveTextContent("0open checks");
    fireEvent.click(within(alert).getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(ext.fetchComplianceInsights.mock.calls.length).toBeGreaterThan(1));
  });

  it("filters the worklist from the due runway", async () => {
    renderPage();
    await screen.findAllByTestId("oh-worklist-row");

    fireEvent.click(screen.getByTestId("oh-kpi-due30"));

    expect(screen.getByTestId("oh-kpi-due30").getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByTestId("oh-kpi-open").getAttribute("aria-pressed")).toBe("false");
    expect(workerNames()).toEqual(["Bob Banda"]);
  });

  it("plans clinic days by site and exam, and a cell lists exactly who is due", async () => {
    renderPage();
    await screen.findAllByTestId("oh-worklist-row");
    const planner = screen.getByTestId("oh-clinic-day-planner");

    const cell = within(planner).getByRole("button", { name: "Plant A, AUDIO: 1 open, 1 overdue" });
    fireEvent.click(cell);
    expect(cell.getAttribute("aria-pressed")).toBe("true");
    expect(workerNames()).toEqual(["Jane Doe"]);

    fireEvent.click(cell);
    expect(workerNames()).toHaveLength(3);
  });

  it("starts the worklist from filters in the link", async () => {
    nav.search = "site=North%20pit";
    renderPage();

    await screen.findAllByTestId("oh-worklist-row");
    expect(workerNames()).toEqual(["Bob Banda"]);
  });
});

describe("worklist filtering", () => {
  it("combines status, due window, exam, hazard and site filters", () => {
    const rows = toWorkRows(ROWS as never);
    expect(filterWorkRows(rows, { ...EMPTY_WORKLIST_FILTERS, due: "next_7" }).map((r) => r.customer_name)).toEqual(["Bob Banda"]);
    expect(filterWorkRows(rows, { ...EMPTY_WORKLIST_FILTERS, due: "overdue_30" }).map((r) => r.customer_name)).toEqual(["Jane Doe"]);
    expect(filterWorkRows(rows, { ...EMPTY_WORKLIST_FILTERS, site: "Plant A", status: "due" }).map((r) => r.customer_name)).toEqual(["Alice Phiri"]);
    expect(filterWorkRows(rows, { ...EMPTY_WORKLIST_FILTERS, hazard: "Dust", exam: "SPIRO" })).toHaveLength(1);
  });
});
