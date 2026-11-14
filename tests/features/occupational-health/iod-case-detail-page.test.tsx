import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ bffRequest: vi.fn(), toast: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/occupational-health/records/iod/x",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/providers/user-provider", () => ({
  useUser: () => ({ isLoading: false, userData: { groups: ["OccupationalHealth"], enabled_modules: ["OccupationalHealth"] } }),
}));
vi.mock("@/providers/toast-provider", () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock("@/lib/bff-client", () => ({
  bffRequest: (...args: unknown[]) => mocks.bffRequest(...args),
  BffError: class extends Error {},
}));

import { OhRecordDetailPage } from "@/features/occupational-health/pages/OhRecordDetailPage";

const UUID = "7125b443-fb1b-422b-be62-d00d46257546";
const BASE = `/api/occupational-health/iod-cases/${UUID}`;

const caseRecord = {
  id: 1,
  uuid: UUID,
  customer: 9,
  customer_uuid: "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb",
  employment_episode: 3,
  encounter: 5,
  encounter_uuid: "enc-1",
  visit_uuid: "vis-1",
  she_reference: "",
  severity: "major",
  lost_days: 4,
  status: "open",
  onset_date: "2026-11-10",
  incident_time: "14:30",
  mechanism: "Crush",
  body_part: "Hand",
  incident_location: "Press shop",
  reported_by: "Line supervisor",
  safety_classification: "lost_time",
  work_related: true,
  description: "Hand caught in the press.",
  witnesses: "",
  immediate_action: "Machine isolated",
  treatment_given: "",
  root_cause: "",
  employer_notified_on: null,
  authority_notified_on: null,
  claim_reference: "",
  return_to_work_on: null,
  closed_on: null,
  closure_summary: "",
  is_active: true,
  created_at: "2026-11-10T15:00:00Z",
  updated_at: "2026-11-10T15:00:00Z",
};

const pack = {
  notice: "Generic data pack.",
  employee: { full_name: "Chikondi Phiri", identifier: "CL-1", date_of_birth: null, gender: "male", employee_number: "E-77", job_title: "Press operator", department: "Fabrication", site: "Main plant", employment_start_date: "2024-01-01", employment_type: "permanent" },
  employer: { name: "Lilongwe Cement Ltd", registration_number: "" },
  medical: { first_treatment_date: "2026-11-10", treatment_given: "", lost_days: 4, fitness_outcome: "fit_with_restrictions", restrictions: ["No heavy lifting"], certificate_valid_to: "2027-01-01" },
  classification: { lost_time_injury: true, fatal: false },
  notifications: [
    { code: "workers_compensation_claim", label: "Employer's report of an injury on duty", likely_required: true, missing_fields: ["employer.registration_number"], ready: false },
    { code: "osh_incident_notification", label: "OSH incident notification", likely_required: true, missing_fields: [], ready: true },
  ],
  generated_at: "2026-11-14T10:00:00Z",
};

const entries = [
  { uuid: "e3", kind: "note", event_code: "", body: "Spoke to the worker.", owner_name: "", due_date: null, completed_on: null, author_name: "Dr Banda", created_at: "2026-11-12T09:00:00Z" },
  { uuid: "e2", kind: "action", event_code: "", body: "Fit a guard to the press", owner_name: "Site engineer", due_date: "2026-11-01", completed_on: null, author_name: "Dr Banda", created_at: "2026-11-11T09:00:00Z" },
  { uuid: "e1", kind: "event", event_code: "opened", body: "Case opened", owner_name: "", due_date: null, completed_on: null, author_name: "Dr Banda", created_at: "2026-11-10T15:00:00Z" },
];

function mockApi() {
  mocks.bffRequest.mockImplementation(async (path: string, options?: { method?: string }) => {
    if (path === `${BASE}/statutory-pack`) return pack;
    if (path === `${BASE}/entries`) return options?.method === "POST" ? entries[0] : entries;
    if (path.startsWith(`${BASE}/entries/`)) return entries[1];
    if (path === BASE) return caseRecord;
    throw new Error(`Unexpected request ${path}`);
  });
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <OhRecordDetailPage kind="iod" uuid={UUID} />
    </QueryClientProvider>,
  );
}

function callsTo(path: string, method: string) {
  return mocks.bffRequest.mock.calls.filter(([p, o]) => p === path && (o as { method?: string } | undefined)?.method === method);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockApi();
});
afterEach(() => cleanup());

describe("IOD case detail page", () => {
  it("shows the case title, status, worker and the actions at the top", async () => {
    renderPage();
    expect(await screen.findByRole("heading", { name: "Crush · Hand" })).toBeTruthy();
    expect(screen.getByText("Lost-time injury")).toBeTruthy();
    expect(screen.getAllByText("Chikondi Phiri").length).toBeGreaterThan(0);
    const actions = within(screen.getByTestId("oh-iod-case-actions"));
    expect(actions.getByRole("button", { name: "Close case" })).toBeTruthy();
    expect(actions.getByRole("button", { name: /Edit case/ })).toBeTruthy();
    expect(actions.getByRole("button", { name: /Add note/ })).toBeTruthy();
    expect(actions.getByText("Notification pack").closest("a")?.getAttribute("href")).toBe(
      `/api/occupational-health/oh-ext/iod-cases/${UUID}/statutory-pack/pdf`,
    );
  });

  it("summarises notices and follow-ups in the facts strip and tab badges", async () => {
    renderPage();
    const facts = within(await screen.findByTestId("oh-iod-case-facts"));
    expect(facts.getByText("1 of 2 ready")).toBeTruthy();
    expect(facts.getByText("1 need details")).toBeTruthy();
    expect(facts.getByText("1 open")).toBeTruthy();
    expect(facts.getByText("1 overdue")).toBeTruthy();
    // "Open for" and "Lost time" both read 4 days for this case.
    expect(facts.getAllByText("4 days")).toHaveLength(2);
  });

  it("closes the case with a summary and the final lost days", async () => {
    mocks.bffRequest.mockImplementation(async (path: string, options?: { method?: string }) => {
      if (options?.method === "PATCH") return { ...caseRecord, status: "closed" };
      if (path === `${BASE}/statutory-pack`) return pack;
      if (path === `${BASE}/entries`) return entries;
      return caseRecord;
    });
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Close case" }));
    fireEvent.change(await screen.findByLabelText("How the case ended"), { target: { value: "Healed, back at work" } });
    fireEvent.change(screen.getByLabelText("Total lost days"), { target: { value: "6" } });
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Close case" }));
    await waitFor(() =>
      expect(callsTo(BASE, "PATCH")[0]?.[1]).toEqual({
        method: "PATCH",
        body: { status: "closed", closure_summary: "Healed, back at work", lost_days: 6, return_to_work_on: null },
      }),
    );
  });

  it("edits the case and sends only the changed fields", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: /Edit case/ }));
    const location = await screen.findByLabelText(/^Location/);
    fireEvent.change(location, { target: { value: "Packing hall" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() =>
      expect(callsTo(BASE, "PATCH")[0]?.[1]).toEqual({ method: "PATCH", body: { incident_location: "Packing hall" } }),
    );
  });

  it("lists the missing data per notice and records a sent date", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: /^Notifications/ }));
    const notice = within(await screen.findByTestId("oh-iod-notice-workers_compensation_claim"));
    expect(notice.getByText("Employer registration number")).toBeTruthy();
    fireEvent.click(notice.getByRole("button", { name: "Record as sent" }));
    fireEvent.change(notice.getByLabelText("Date sent"), { target: { value: "2026-11-12" } });
    fireEvent.click(notice.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(callsTo(BASE, "PATCH")[0]?.[1]).toEqual({ method: "PATCH", body: { employer_notified_on: "2026-11-12" } }),
    );
    expect(within(screen.getByTestId("oh-iod-notice-osh_incident_notification")).getByText(/All the data this notice needs/)).toBeTruthy();
  });

  it("marks a follow-up done and adds a new one", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: /^Follow-up/ }));
    expect(await screen.findByText("Overdue")).toBeTruthy();
    fireEvent.click(screen.getByRole("checkbox", { name: "Mark done: Fit a guard to the press" }));
    await waitFor(() =>
      expect(callsTo(`${BASE}/entries/e2`, "PATCH")[0]?.[1]).toEqual({ method: "PATCH", body: { completed: true } }),
    );

    fireEvent.click(screen.getByRole("button", { name: /Add action/ }));
    fireEvent.change(screen.getByLabelText("What needs to happen?"), { target: { value: "Retrain the operators" } });
    fireEvent.change(screen.getByLabelText("Owner"), { target: { value: "HR" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Add action" }).at(-1) as HTMLElement);
    await waitFor(() =>
      expect(callsTo(`${BASE}/entries`, "POST")[0]?.[1]).toEqual({
        method: "POST",
        body: { kind: "action", body: "Retrain the operators", owner_name: "HR", due_date: null },
      }),
    );
  });

  it("posts a note from the timeline", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: /Add note/ }));
    expect(await screen.findByText("Case opened")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Add a note"), { target: { value: "Worker back on light duties" } });
    fireEvent.click(screen.getByRole("button", { name: "Post note" }));
    await waitFor(() =>
      expect(callsTo(`${BASE}/entries`, "POST")[0]?.[1]).toEqual({
        method: "POST",
        body: { kind: "note", body: "Worker back on light duties" },
      }),
    );
  });

  it("offers reopen on a closed case and still shows the case when the notice pack fails", async () => {
    mocks.bffRequest.mockImplementation(async (path: string) => {
      if (path === `${BASE}/statutory-pack`) throw new Error("no employment record");
      if (path === `${BASE}/entries`) return entries;
      return { ...caseRecord, status: "closed", closed_on: "2026-11-13", closure_summary: "Healed" };
    });
    renderPage();
    expect(await screen.findByRole("button", { name: /Reopen case/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Close case" })).toBeNull();
    expect(screen.getByText("Healed")).toBeTruthy();
  });

  it("explains when the case cannot be loaded", async () => {
    mocks.bffRequest.mockRejectedValue(new Error("not found"));
    renderPage();
    expect(await screen.findByText("Case not found")).toBeTruthy();
  });
});

describe("IOD case recorded from an OPD visit", () => {
  const fromVisit = {
    source_visit_uuid: "visit-1",
    source_encounter_uuid: "enc-1",
  };

  function mockCase(over: Record<string, unknown>) {
    mocks.bffRequest.mockImplementation(async (path: string, options?: { method?: string }) => {
      if (path === `${BASE}/statutory-pack`) return pack;
      if (path === `${BASE}/entries`) return entries;
      if (path === `${BASE}/document`) return { uuid: UUID, ai_status: "documented" };
      if (path === BASE && options?.method !== "PATCH") return { ...caseRecord, ...over };
      throw new Error(`Unexpected request ${path}`);
    });
  }

  it("says what the AI drafted and links back to the visit", async () => {
    mockCase({ ...fromVisit, ai_status: "documented", ai_drafted_fields: ["description", "body_part"], ai_documented_at: "2026-11-14T10:00:00Z" });
    renderPage();

    const notice = await screen.findByTestId("oh-iod-ai-notice");
    expect(notice.textContent).toContain("Drafted by AI from the visit record");
    expect(notice.textContent).toContain("description, body part");
    expect(screen.getByTestId("oh-iod-case-opd-visit-link").getAttribute("href")).toBe("/clinical/opd/visit-1/enc-1");
  });

  it("explains that it is waiting for the visit to be documented", async () => {
    mockCase({ ...fromVisit, ai_status: "waiting" });
    renderPage();

    expect((await screen.findByTestId("oh-iod-ai-notice")).textContent).toContain("Waiting for the visit to be documented");
  });

  it.each([
    ["needs_input", "doesn’t describe the incident"],
    ["failed", "could not be drafted automatically"],
  ])("explains the %s state", async (status, text) => {
    mockCase({ ...fromVisit, ai_status: status });
    renderPage();

    expect((await screen.findByTestId("oh-iod-ai-notice")).textContent).toContain(text);
  });

  it("shows no AI notice or visit link for a case that was not recorded from a visit", async () => {
    mockCase({});
    renderPage();

    await screen.findByRole("heading", { name: "Crush · Hand" });
    expect(screen.queryByTestId("oh-iod-ai-notice")).toBeNull();
    expect(screen.queryByTestId("oh-iod-case-opd-visit-link")).toBeNull();
  });

  it("drafts the case again from the visit record on request", async () => {
    mockCase({ ...fromVisit, ai_status: "needs_input" });
    renderPage();

    fireEvent.keyDown(await screen.findByRole("button", { name: "More actions" }), { key: "Enter" });
    const menu = await screen.findByRole("menu");
    expect(within(menu).getByRole("menuitem", { name: "Open visit" }).getAttribute("href")).toBe("/clinical/opd/visit-1/enc-1");
    fireEvent.click(within(menu).getByRole("menuitem", { name: "Draft from visit record" }));

    await waitFor(() => expect(callsTo(`${BASE}/document`, "POST")).toHaveLength(1));
    await waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ variant: "success", title: "Drafted from the visit record" })),
    );
  });

  it("does not offer drafting for a case that has no visit", async () => {
    mockCase({});
    renderPage();

    fireEvent.keyDown(await screen.findByRole("button", { name: "More actions" }), { key: "Enter" });
    const menu = await screen.findByRole("menu");

    expect(within(menu).queryByRole("menuitem", { name: "Draft from visit record" })).toBeNull();
  });
});
