import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { OhEncounterWorkspacePage } from "@/features/occupational-health/pages/OhEncounterWorkspacePage";

const ohService = vi.hoisted(() => ({
  fetchOhEncounters: vi.fn(),
  fetchOhEncounter: vi.fn(),
  fetchOhExaminations: vi.fn(),
  fetchOhEmployeeFormResponses: vi.fn(),
  fetchOhCofResponses: vi.fn(),
  fetchOhExamFindings: vi.fn(),
  fetchFitnessAssessments: vi.fn(),
  fetchFitnessCertificates: vi.fn(),
  fetchIodCases: vi.fn(),
  fetchEmploymentEpisodes: vi.fn(),
  fetchOhEmployers: vi.fn(),
  fetchOhJobTitles: vi.fn(),
  fetchOhHazardProfiles: vi.fn(),
  fetchOhExamTemplateVersions: vi.fn(),
  createOhExamination: vi.fn(),
  createOhEmployeeFormResponse: vi.fn(),
  createOhEmployeeFormInvite: vi.fn(),
  patchOhEmployeeFormResponses: vi.fn(),
  createOhCofResponse: vi.fn(),
  patchOhCofResponses: vi.fn(),
  fetchOhCofTemplateVersions: vi.fn(),
  publishOhCofTemplate: vi.fn(),
  recoverOhCofResponseVersion: vi.fn(),
  recoverOhEmployeeFormResponseVersion: vi.fn(),
  reopenOhEmployeeFormResponse: vi.fn(),
  createFitnessAssessment: vi.fn(),
  createFitnessCertificate: vi.fn(),
  withdrawFitnessCertificate: vi.fn(),
  amendFitnessCertificate: vi.fn(),
  createOhExamFinding: vi.fn(),
  createIodCase: vi.fn(),
  downloadIodStatutoryPack: vi.fn(),
  fetchOhVisitHistory: vi.fn(),
  patchOhExaminationResponses: vi.fn(),
  publishOhExamTemplate: vi.fn(),
  recoverOhExaminationVersion: vi.fn(),
}));

const completeMock = vi.hoisted(() => vi.fn());
vi.mock("@/features/occupational-health/services/native-visit.service", () => ({
  completeNativeOhVisit: completeMock,
}));

const fetchVisitMock = vi.hoisted(() => vi.fn());
const fetchCustomerMock = vi.hoisted(() => vi.fn());
const useUserMock = vi.hoisted(() => vi.fn());

vi.mock("@/features/occupational-health/services/oh.service", () => ohService);
vi.mock("@/features/visits/services/visits.service", () => ({
  fetchVisit: fetchVisitMock,
}));
vi.mock("@/features/customers/services/customers.service", () => ({
  fetchCustomer: fetchCustomerMock,
}));
vi.mock("@/providers/user-provider", () => ({
  useUser: () => useUserMock(),
}));
const toasts = vi.hoisted(() => ({
  toast: vi.fn(() => "toast-id"),
  dismiss: vi.fn(),
}));
vi.mock("@/providers/toast-provider", () => ({ useToast: () => toasts }));
vi.mock("@/features/app-shell/hooks/use-app-breadcrumb", () => ({
  useAppBreadcrumb: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

vi.mock("@/features/occupational-health/services/immunisation.service", async (orig) => {
  const actual = await orig<typeof import("@/features/occupational-health/services/immunisation.service")>();
  return { ...actual, fetchOhImmPatient: vi.fn(async () => ({ statuses: [], doses: [] })) };
});
vi.mock("@/features/occupational-health/services/drug-alcohol.service", async (orig) => {
  const actual = await orig<typeof import("@/features/occupational-health/services/drug-alcohol.service")>();
  return { ...actual, fetchDaVisitPanel: vi.fn(async () => ({ policy: null, tests: [] })) };
});
vi.mock("@/features/occupational-health/services/health-programs.service", async (orig) => {
  const actual = await orig<typeof import("@/features/occupational-health/services/health-programs.service")>();
  return { ...actual, fetchHpResults: vi.fn(async () => []) };
});
vi.mock("@/features/occupational-health/services/fitness.service", async (orig) => {
  const actual = await orig<typeof import("@/features/occupational-health/services/fitness.service")>();
  return { ...actual, fetchFitWorker: vi.fn(async () => ({ overall: "unknown" })) };
});

const ENCOUNTER = {
  id: 7,
  uuid: "enc-1",
  visit: "visit-1",
  customer_uuid: "cust-1",
  customer_id: 21,
  first_name: "Jane",
  last_name: "Doe",
  customer_name: "Jane Doe",
  department: "dept-1",
  department_name: "Occupational Health",
  department_type: "occupational_health",
  location: null,
  location_name: "Mine clinic",
  clinician: 3,
  clinician_name: "Dr OH",
  status: "in_progress",
  billing_mode: "shared_visit",
  started_at: "2026-10-26T08:00:00Z",
  ended_at: null,
  notes: "",
  is_active: true,
  created_by: null,
  created_at: "2026-10-26T08:00:00Z",
  updated_at: "2026-10-26T08:00:00Z",
};

const EPISODE = {
  id: 9,
  uuid: "ep-1",
  customer: 21,
  employer: 5,
  job_title: 1,
  site: "",
  department_name: "",
  employment_type: "employee",
  employee_number: "",
  start_date: "2026-01-01",
  end_date: null,
  requires_fitness: false,
  hazard_profile: 44,
  job_profile: null,
  is_active: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const ASSESSMENT = {
  id: 31,
  uuid: "fa-1",
  examination: 11,
  outcome: "fit_with_restrictions",
  assessed_at: "2026-10-26T09:00:00Z",
  review_date: null,
  clinician: 3,
};

function renderPage(options?: { panel?: string | null }) {
  if (options && "panel" in options) {
    const url = options.panel
      ? `/?panel=${options.panel}`
      : "/occupational-health/visit-1/enc-1";
    window.history.replaceState(null, "", url);
  } else if (!new URLSearchParams(window.location.search).has("panel")) {
    window.history.replaceState(null, "", "/?panel=medical-examinations");
  }
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <OhEncounterWorkspacePage visitUuid="visit-1" encounterUuid="enc-1" />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  useUserMock.mockReturnValue({
    isLoading: false,
    userData: {
      id: 3,
      groups: ["OccupationalHealth"],
      enabled_modules: ["OccupationalHealth"],
      tenant: { id: 1 },
    },
  });
  ohService.fetchOhEncounter.mockResolvedValue(ENCOUNTER);
  fetchVisitMock.mockResolvedValue({
    uuid: "visit-1",
    customer: "cust-1",
    encounters: [ENCOUNTER],
  });
  fetchCustomerMock.mockResolvedValue({
    id: 21,
    uuid: "cust-1",
    first_name: "Jane",
    last_name: "Doe",
    customer_identifier: "C-001",
    gender: "female",
    dob: "1990-01-01",
  });
  ohService.fetchOhExaminations.mockResolvedValue([]);
  ohService.fetchOhEmployeeFormResponses.mockResolvedValue([]);
  ohService.fetchOhCofResponses.mockResolvedValue([]);
  ohService.createOhCofResponse.mockResolvedValue({
    id: 88,
    uuid: "cof-1",
    encounter: 7,
    template_uuid: "cof-tmpl",
    template_version_uuid: "cof-ver",
    template_version_number: 1,
    template_snapshot: {
      schema_version: 3,
      sections: [
        {
          code: "fit",
          name: "Fit",
          content_mode: "direct",
          response_fields: [
            {
              code: "outcome",
              label: "Outcome",
              response_type: "text",
              required: true,
            },
          ],
          items: [],
        },
      ],
    },
    responses_json: {
      __cof_template__: {
        template_uuid: "cof-tmpl",
        template_version_uuid: "cof-ver",
        version_number: 1,
        answers: { picks: {}, fields: { fit: { outcome: "" } } },
      },
    },
    row_version: 1,
    is_active: true,
  });
  ohService.patchOhCofResponses.mockImplementation(async (_uuid, payload) => ({
    id: 88,
    uuid: "cof-1",
    encounter: 7,
    template_uuid: "cof-tmpl",
    template_version_uuid: "cof-ver",
    template_version_number: 1,
    template_snapshot: {
      schema_version: 3,
      sections: [
        {
          code: "fit",
          name: "Fit",
          content_mode: "direct",
          response_fields: [
            {
              code: "outcome",
              label: "Outcome",
              response_type: "text",
              required: true,
            },
          ],
          items: [],
        },
      ],
    },
    responses_json: payload.responses_json,
    row_version: 2,
    is_active: true,
  }));
  ohService.fetchOhCofTemplateVersions.mockResolvedValue([]);
  ohService.fetchOhExamFindings.mockResolvedValue([]);
  ohService.fetchFitnessAssessments.mockResolvedValue([]);
  ohService.fetchFitnessCertificates.mockResolvedValue([]);
  ohService.fetchIodCases.mockResolvedValue([]);
  ohService.fetchEmploymentEpisodes.mockResolvedValue([EPISODE]);
  ohService.fetchOhEmployers.mockResolvedValue([]);
  ohService.fetchOhJobTitles.mockResolvedValue([]);
  ohService.fetchOhHazardProfiles.mockResolvedValue([
    {
      id: 44,
      uuid: "hp-1",
      name: "Welding",
      code: "WELD",
      exam_template: "tmpl-1",
      exam_template_code: "EXAM",
      exam_template_name: "Annual exam",
      employer: 5,
    },
  ]);
  ohService.fetchOhExamTemplateVersions.mockResolvedValue([
    {
      id: 1,
      uuid: "ver-1",
      template: "tmpl-1",
      number: 1,
      status: "published",
      snapshot_json: {
        schema_version: 2,
        sections: [
          {
            code: "vitals",
            name: "Vitals",
            content_mode: "direct",
            response_fields: [
              { code: "bp", label: "BP", response_type: "text" },
            ],
            items: [],
          },
        ],
      },
    },
  ]);
  ohService.fetchOhVisitHistory.mockResolvedValue({
    visits: [],
    selected_visit_uuid: null,
    selected_encounter_uuid: null,
    examinations: [],
    findings: [],
    fitness_assessments: [],
    fitness_certificates: [],
    iod_cases: [],
  });
  ohService.createFitnessCertificate.mockResolvedValue({});
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  window.history.replaceState(null, "", "/");
});

describe("OhEncounterWorkspacePage", () => {
  it("renders the session forms and the examination details step", async () => {
    renderPage();

    expect(await screen.findByTestId("oh-session-forms")).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Examination" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Certificate of fitness/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: "Certificate of fitness" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Injury on Duty Management"),
    ).not.toBeInTheDocument();
    expect(
      await screen.findByTestId("oh-exam-details-step"),
    ).toBeInTheDocument();
    expect(ohService.fetchOhEncounters).not.toHaveBeenCalled();
  });

  it("defaults a visit without ?panel to fitness and writes it into the URL", async () => {
    const { fetchFitWorker } = await import(
      "@/features/occupational-health/services/fitness.service"
    );
    vi.mocked(fetchFitWorker).mockResolvedValue({
      customer_uuid: "cust-1",
      worker_label: "Jane Doe",
      employee_number: "",
      employer_uuid: null,
      employer_name: "",
      site: "",
      department: "",
      job_title: "",
      overall: "unknown",
      reasons: [],
      restrictions: [],
      earliest_expiry: null,
      items: [],
      zones: [],
      role_clearance: { job_title: "", status: "unknown" },
      computed_at: "2026-11-13T12:00:00Z",
    });
    renderPage({ panel: null });
    expect(await screen.findByTestId("oh-fitness-visit-panel")).toBeInTheDocument();
    expect(window.location.search).toBe("?panel=fitness");
    expect(screen.queryByTestId("oh-session-forms")).not.toBeInTheDocument();
  });

  it("loads the OH encounter directly without a Django visit lookup", async () => {
    renderPage();
    expect(
      await screen.findByTestId("oh-encounter-module-layout"),
    ).toBeInTheDocument();
    expect(ohService.fetchOhEncounter).toHaveBeenCalledWith("enc-1");
    expect(fetchVisitMock).not.toHaveBeenCalled();
    expect(fetchCustomerMock).not.toHaveBeenCalled();
  });

  it("shows not found when the encounter cannot be resolved", async () => {
    ohService.fetchOhEncounter.mockRejectedValue(new Error("Not found"));
    fetchVisitMock.mockResolvedValue({
      uuid: "visit-1",
      customer: "cust-1",
      encounters: [],
    });
    ohService.fetchOhEncounters.mockResolvedValue([]);

    renderPage();

    expect(
      await screen.findByTestId("oh-encounter-not-found"),
    ).toBeInTheDocument();
  });

  it("opens the certificate module with form and records", async () => {
    ohService.fetchFitnessAssessments.mockResolvedValue([ASSESSMENT]);
    ohService.fetchOhExaminations.mockResolvedValue([
      {
        id: 11,
        uuid: "exam-1",
        responses_json: {
          __exam_template__: {
            template_uuid: "tmpl-1",
            version_number: 1,
            answers: { picks: {}, fields: {} },
          },
        },
        encounter: 7,
        exam_type: "periodic",
        occupational_attendance: true,
        template_code: "",
        notes: "",
        examined_at: "2026-10-26T08:10:00Z",
        created_at: "2026-10-26T08:10:00Z",
        updated_at: "2026-10-26T08:10:00Z",
      },
    ]);
    window.history.replaceState(null, "", "/?panel=certificate");
    renderPage();

    expect(
      await screen.findByTestId("oh-fitness-certificate-form"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("oh-certificate-records-empty"),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("oh-exam-ledger")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Examinations" }));
    expect(await screen.findByTestId("oh-exam-ledger")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toHaveTextContent("Periodic exam");
    expect(screen.getByRole("dialog")).toHaveTextContent("1 on this encounter");
    fireEvent.click(screen.getByRole("button", { name: /Periodic exam/ }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(
      await screen.findByTestId("oh-exam-answers-view"),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Export" }));
    expect(screen.getByRole("link", { name: "Export PDF" })).toHaveAttribute(
      "href",
      expect.stringContaining("/api/occupational-health/oh-ext/oh-examinations/exam-1/pdf"),
    );
    expect(
      screen.queryByTestId("oh-fitness-certificate-form"),
    ).not.toBeInTheDocument();
  });

  it("asks for confirmation before withdrawing a certificate", async () => {
    ohService.fetchFitnessAssessments.mockResolvedValue([ASSESSMENT]);
    ohService.fetchOhExaminations.mockResolvedValue([
      {
        id: 11,
        uuid: "exam-1",
        responses_json: {
          __exam_template__: {
            template_uuid: "tmpl-1",
            version_number: 1,
            answers: { picks: {}, fields: {} },
          },
        },
        encounter: 7,
        exam_type: "periodic",
        occupational_attendance: true,
        template_code: "",
        notes: "",
        examined_at: "2026-10-26T08:10:00Z",
        created_at: "2026-10-26T08:10:00Z",
        updated_at: "2026-10-26T08:10:00Z",
      },
    ]);
    ohService.fetchFitnessCertificates.mockResolvedValue([
      {
        id: 51,
        uuid: "cert-1",
        assessment: 31,
        version: 1,
        status: "issued",
        valid_from: "2026-10-26",
        valid_to: "2027-10-26",
        signed_at: "2026-10-26T09:05:00Z",
        signed_by: 3,
        payload: {},
        previous_certificate: null,
        created_at: "2026-10-26T09:05:00Z",
        updated_at: "2026-10-26T09:05:00Z",
      },
    ]);
    ohService.withdrawFitnessCertificate.mockResolvedValue({});
    window.history.replaceState(null, "", "/?panel=certificate");
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Withdraw" }));
    expect(ohService.withdrawFitnessCertificate).not.toHaveBeenCalled();

    expect(
      screen.getByRole("button", { name: "Confirm withdraw" }),
    ).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Reason for withdrawing"), {
      target: { value: "Issued against the wrong assessment" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirm withdraw" }));
    await waitFor(() =>
      expect(ohService.withdrawFitnessCertificate).toHaveBeenCalledWith(
        "cert-1",
        "Issued against the wrong assessment",
      ),
    );
  });
  it("amends a certificate in force with a reason and new restrictions", async () => {
    ohService.fetchFitnessAssessments.mockResolvedValue([ASSESSMENT]);
    ohService.fetchOhExaminations.mockResolvedValue([
      {
        id: 11,
        uuid: "exam-1",
        responses_json: {
          __exam_template__: {
            template_uuid: "tmpl-1",
            version_number: 1,
            answers: { picks: {}, fields: {} },
          },
        },
        encounter: 7,
        exam_type: "periodic",
        occupational_attendance: true,
        template_code: "",
        notes: "",
        examined_at: "2026-10-26T08:10:00Z",
        created_at: "2026-10-26T08:10:00Z",
        updated_at: "2026-10-26T08:10:00Z",
      },
    ]);
    ohService.fetchFitnessCertificates.mockResolvedValue([
      {
        id: 51,
        uuid: "cert-1",
        assessment: 31,
        version: 1,
        status: "issued",
        valid_from: "2026-10-26",
        valid_to: "2027-10-26",
        signed_at: "2026-10-26T09:05:00Z",
        signed_by: 3,
        payload: { restrictions: ["No heights"] },
        previous_certificate: null,
        created_at: "2026-10-26T09:05:00Z",
        updated_at: "2026-10-26T09:05:00Z",
      },
    ]);
    ohService.amendFitnessCertificate.mockResolvedValue({});
    window.history.replaceState(null, "", "/?panel=certificate");
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Amend" }));
    const save = await screen.findByRole("button", { name: "Save amendment" });
    expect(save).toBeDisabled();
    fireEvent.change(
      screen.getByLabelText("Restrictions, one per line", {
        selector: "#oh-amend-restrictions-cert-1",
      }),
      {
        target: { value: "No heights\nNo night shift" },
      },
    );
    fireEvent.change(screen.getByLabelText("Reason for amending"), {
      target: { value: "Added night-shift restriction" },
    });
    fireEvent.click(save);
    await waitFor(() =>
      expect(ohService.amendFitnessCertificate).toHaveBeenCalledWith("cert-1", {
        reason: "Added night-shift restriction",
        valid_to: "2027-10-26",
        payload: { restrictions: ["No heights", "No night shift"] },
      }),
    );
  });
  it("fills the pre-employment employee form for this session", async () => {
    ohService.fetchOhEncounter.mockResolvedValue({
      ...ENCOUNTER,
      origin: "laravel",
      visit_type: {
        uuid: "type-1",
        code: "pre_employment",
        name: "Pre-employment",
        forms: [],
      },
    });
    ohService.createOhEmployeeFormResponse.mockResolvedValue({
      id: 3,
      uuid: "form-1",
      encounter: 7,
      status: "not_started",
      row_version: 1,
      template_snapshot: { schema_version: 3, sections: [] },
      responses_json: {
        __employee_form__: { answers: { picks: {}, fields: {} } },
      },
    });
    ohService.createOhEmployeeFormInvite.mockResolvedValue({
      token: "session-token",
      expires_at: "2026-11-23T00:00:00Z",
    });
    renderPage();

    expect(
      await screen.findByTestId("oh-encounter-visit-type"),
    ).toHaveTextContent("Pre-employment");
    expect(
      within(screen.getByTestId("oh-encounter-header")).getByText(
        "Pre-employment",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("Visit forms")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Employee form/ }),
    ).toHaveAttribute("aria-current", "page");
    expect(
      screen.queryByTestId("oh-exam-details-step"),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Enter manually/ }));
    expect(
      await screen.findByTestId("oh-exam-template-capture"),
    ).toBeInTheDocument();
    expect(ohService.createOhEmployeeFormResponse).toHaveBeenCalledWith({
      encounter: 7,
    });
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    fireEvent.click(screen.getByRole("button", { name: /Copy link/ }));
    await waitFor(() =>
      expect(ohService.createOhEmployeeFormInvite).toHaveBeenCalledWith(
        "form-1",
      ),
    );
    expect(
      await screen.findByTestId("oh-session-employee-link"),
    ).toHaveTextContent("/workforce-forms/session-token");
    expect(ohService.createOhEmployeeFormResponse).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTestId("oh-session-step-examination"));
    expect(
      screen.queryByTestId("oh-exam-details-step"),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Exam type/)).not.toBeInTheDocument();
  });

  it("validates and saves pinned answers before completing from the header", async () => {
    const examination = {
      id: 11,
      uuid: "exam-pinned",
      encounter: 7,
      exam_type: "periodic",
      template_uuid: "tmpl-1",
      template_version_uuid: "ver-1",
      template_version_number: 1,
      template_snapshot: {
        schema_version: 3,
        sections: [
          {
            code: "vitals",
            name: "Vitals",
            content_mode: "direct",
            response_fields: [
              {
                code: "bp",
                label: "BP",
                response_type: "text",
                required: true,
              },
            ],
            items: [],
          },
        ],
      },
      responses_json: {
        __exam_template__: {
          template_uuid: "tmpl-1",
          template_version_uuid: "ver-1",
          version_number: 1,
          answers: { picks: {}, fields: { vitals: { bp: "" } } },
        },
      },
      row_version: 1,
    };
    ohService.fetchOhEncounter.mockResolvedValue({
      ...ENCOUNTER,
      origin: "laravel",
    });
    ohService.fetchOhExaminations.mockResolvedValue([examination]);
    ohService.patchOhExaminationResponses.mockImplementation(
      async (_uuid, payload) => {
        const next = {
          ...examination,
          responses_json: payload.responses_json,
          row_version: 2,
        };
        ohService.fetchOhExaminations.mockResolvedValue([next]);
        return next;
      },
    );
    completeMock.mockImplementation(async () => {
      ohService.fetchOhEncounter.mockResolvedValue({
        ...ENCOUNTER,
        origin: "laravel",
        is_active: false,
        status: "completed",
      });
    });
    renderPage();
    const input = await screen.findByLabelText(/BP/);
    const header = screen.getByTestId("oh-encounter-header");
    const button = within(header).getByRole("button", { name: "Continue" });
    expect(
      within(header)
        .getByRole("link", { name: "OHS Queue" })
        .compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    fireEvent.click(button);
    expect(await screen.findByText("BP is required.")).toBeVisible();
    await waitFor(() => expect(input).toHaveFocus());
    expect(completeMock).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: "120/80" } });
    await waitFor(() =>
      expect(screen.queryByText("BP is required.")).toBeNull(),
    );
    fireEvent.click(within(header).getByRole("button", { name: "Continue" }));
    await waitFor(() =>
      expect(ohService.patchOhExaminationResponses).toHaveBeenCalledWith(
        "exam-pinned",
        expect.objectContaining({
          responses_json: expect.objectContaining({
            __exam_template__: expect.objectContaining({
              template_version_uuid: "ver-1",
            }),
          }),
        }),
      ),
    );
    expect(completeMock).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.getByTestId("oh-session-certificate-step")).toHaveAttribute(
        "aria-hidden",
        "false",
      ),
    );
    expect(
      within(header).getByRole("button", { name: "Complete visit" }),
    ).toBeVisible();
    expect(fetchVisitMock).not.toHaveBeenCalled();
  });

  it("keeps the visit open when saving responses fails", async () => {
    ohService.fetchOhEncounter.mockResolvedValue({
      ...ENCOUNTER,
      origin: "laravel",
    });
    ohService.fetchOhExaminations.mockResolvedValue([
      {
        id: 11,
        uuid: "exam-save-error",
        encounter: 7,
        exam_type: "periodic",
        template_uuid: "tmpl-1",
        template_version_uuid: "ver-1",
        template_version_number: 1,
        template_snapshot: {
          schema_version: 3,
          sections: [
            {
              code: "vitals",
              name: "Vitals",
              content_mode: "direct",
              response_fields: [
                { code: "bp", label: "BP", response_type: "text" },
              ],
              items: [],
            },
          ],
        },
        responses_json: {
          __exam_template__: {
            template_uuid: "tmpl-1",
            template_version_uuid: "ver-1",
            version_number: 1,
            answers: { picks: {}, fields: { vitals: { bp: "120/80" } } },
          },
        },
        row_version: 1,
      },
    ]);
    ohService.patchOhExaminationResponses.mockRejectedValue(
      new Error("Save unavailable"),
    );
    renderPage();
    await screen.findByTestId("oh-session-examination-step");
    const primary = within(screen.getByTestId("oh-encounter-header")).getByRole(
      "button",
      { name: /Continue|Complete visit/ },
    );
    fireEvent.click(primary);
    expect(
      await screen.findByText(
        /could not be saved|Save unavailable|responses could not be saved/i,
      ),
    ).toBeVisible();
    expect(completeMock).not.toHaveBeenCalled();
    expect(
      within(screen.getByTestId("oh-encounter-header")).getByRole("button", {
        name: /Continue|Complete visit/,
      }),
    ).toBeEnabled();
  });
  it("loads the editor's real additional fields through explicit publication without cards or warning copy", async () => {
    useUserMock.mockReturnValue({
      isLoading: false,
      userData: {
        id: 3,
        is_admin: true,
        groups: ["OccupationalHealth"],
        enabled_modules: ["OccupationalHealth"],
        tenant: { id: 1 },
      },
    });
    const old = {
      id: 1,
      uuid: "old",
      template: "tmpl-1",
      number: 1,
      status: "published",
      snapshot_json: {
        sections: [
          {
            uuid: "attachment",
            library_section: {
              uuid: "library",
              name: "Work",
              items: [
                {
                  uuid: "item",
                  code: "WORK",
                  names_i18n: { en: "Work demands and safety-sensitive tasks" },
                },
              ],
            },
          },
        ],
      },
    };
    const configured = {
      schema_version: 3,
      template: { uuid: "tmpl-1", name: "Annual exam" },
      sections: [
        {
          uuid: "attachment",
          library_section_uuid: "library",
          code: "work",
          name: "Work",
          content_mode: "items",
          response_fields: [],
          items: [
            {
              uuid: "item",
              code: "WORK",
              name: "Work demands and safety-sensitive tasks",
              response_fields: [
                {
                  code: "tasks",
                  label: "Relevant tasks",
                  response_type: "multi_select",
                  prompt_after_select: true,
                  options: [
                    { code: "driving", label: "Driving machinery" },
                    { code: "lifting", label: "Lifting" },
                  ],
                },
                {
                  code: "frequency",
                  label:
                    "Task frequency, physical demands and other relevant details",
                  response_type: "text",
                  prompt_after_select: true,
                },
              ],
            },
          ],
        },
      ],
    };
    const updated = {
      ...old,
      id: 2,
      uuid: "complete-v2",
      number: 2,
      snapshot_json: configured,
    };
    ohService.fetchOhEncounter.mockResolvedValue({
      ...ENCOUNTER,
      origin: "laravel",
    });
    ohService.fetchOhExamTemplateVersions.mockResolvedValue([old]);
    ohService.publishOhExamTemplate.mockResolvedValue(updated);
    ohService.createOhExamination.mockResolvedValue({
      id: 11,
      uuid: "new-configured",
      encounter: 7,
      exam_type: "pre_employment",
      template_uuid: "tmpl-1",
      template_version_uuid: "complete-v2",
      template_version_number: 2,
      template_snapshot: configured,
      responses_json: {},
      row_version: 1,
    });
    ohService.patchOhExaminationResponses.mockImplementation(
      async (_uuid, payload) => ({
        id: 11,
        uuid: "new-configured",
        encounter: 7,
        exam_type: "pre_employment",
        template_uuid: "tmpl-1",
        template_version_uuid: "complete-v2",
        template_snapshot: configured,
        responses_json: payload.responses_json,
        row_version: 2,
      }),
    );
    renderPage();
    fireEvent.click(await screen.findByRole("combobox", { name: /Exam type/ }));
    fireEvent.click(
      await screen.findByRole("option", { name: "Admission exam" }),
    );
    fireEvent.click(screen.getByTestId("oh-exam-details-continue"));
    const item = await screen.findByRole("checkbox", {
      name: "Work demands and safety-sensitive tasks",
    });
    fireEvent.click(item);
    expect(item.closest("li")?.className).not.toMatch(/rounded|bg-/);
    expect(
      screen.queryByText(/published version did not include response fields/),
    ).toBeNull();
    fireEvent.click(
      screen.getByRole("button", { name: "Load configured fields" }),
    );
    expect(ohService.publishOhExamTemplate).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole("button", { name: "Publish and load fields" }),
    );
    expect(
      await screen.findByRole("checkbox", { name: "Driving machinery" }),
    ).toBeVisible();
    const details = screen.getByLabelText(
      "Task frequency, physical demands and other relevant details",
    );
    expect(details).toBeVisible();
    expect(
      screen.getByRole("checkbox", {
        name: "Work demands and safety-sensitive tasks",
      }),
    ).toHaveAttribute("aria-checked", "true");
    expect(ohService.publishOhExamTemplate).toHaveBeenCalledWith("tmpl-1");
    expect(ohService.recoverOhExaminationVersion).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Driving machinery" }),
    );
    expect(details).toBeVisible();
    fireEvent.change(details, { target: { value: "Synthetic response" } });
    await waitFor(() =>
      expect(ohService.createOhExamination).toHaveBeenCalledWith(
        expect.objectContaining({ template_version_uuid: "complete-v2" }),
      ),
    );
  });

  it("completes from the examination step without oscillating to certificate first", async () => {
    const examination = {
      id: 11,
      uuid: "exam-pinned",
      encounter: 7,
      exam_type: "periodic",
      template_uuid: "tmpl-1",
      template_version_uuid: "ver-1",
      template_version_number: 1,
      template_snapshot: {
        schema_version: 3,
        sections: [
          {
            code: "vitals",
            name: "Vitals",
            content_mode: "direct",
            response_fields: [
              {
                code: "bp",
                label: "BP",
                response_type: "text",
                required: true,
              },
            ],
            items: [],
          },
        ],
      },
      responses_json: {
        __exam_template__: {
          template_uuid: "tmpl-1",
          template_version_uuid: "ver-1",
          version_number: 1,
          answers: { picks: {}, fields: { vitals: { bp: "120/80" } } },
        },
      },
      row_version: 2,
    };
    ohService.fetchOhEncounter.mockResolvedValue({
      ...ENCOUNTER,
      origin: "laravel",
    });
    ohService.fetchOhExaminations.mockResolvedValue([examination]);
    ohService.patchOhExaminationResponses.mockImplementation(
      async (_uuid, payload) => ({
        ...examination,
        responses_json: payload.responses_json,
        row_version: 3,
      }),
    );
    completeMock.mockImplementation(async () => {
      ohService.fetchOhEncounter.mockResolvedValue({
        ...ENCOUNTER,
        origin: "laravel",
        is_active: false,
        status: "completed",
      });
    });
    renderPage();
    await screen.findByTestId("oh-session-examination-step");
    expect(screen.getByTestId("oh-session-certificate-step")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    // Exam answers already valid; continue unlocks certificate, then complete.
    ohService.fetchOhExaminations.mockResolvedValue([
      {
        ...examination,
        responses_json: {
          __exam_template__: {
            template_uuid: "tmpl-1",
            template_version_uuid: "ver-1",
            version_number: 1,
            answers: { picks: {}, fields: { vitals: { bp: "120/80" } } },
          },
        },
      },
    ]);
    fireEvent.click(
      within(screen.getByTestId("oh-encounter-header")).getByRole("button", {
        name: "Continue",
      }),
    );
    await waitFor(() =>
      expect(screen.getByTestId("oh-session-certificate-step")).toHaveAttribute(
        "aria-hidden",
        "false",
      ),
    );
    const outcome = await screen.findByLabelText(/Outcome/);
    fireEvent.change(outcome, { target: { value: "Fit" } });
    fireEvent.click(
      within(screen.getByTestId("oh-encounter-header")).getByRole("button", {
        name: "Complete visit",
      }),
    );
    await waitFor(() => expect(completeMock).toHaveBeenCalledWith("enc-1"));
    expect(ohService.patchOhCofResponses).toHaveBeenCalled();
    expect(
      screen.queryByText(
        "Complete the certificate before completing this visit.",
      ),
    ).toBeNull();
  });

  it("navigates once to the certificate when certificate validation fails", async () => {
    const examination = {
      id: 11,
      uuid: "exam-pinned",
      encounter: 7,
      exam_type: "periodic",
      template_uuid: "tmpl-1",
      template_version_uuid: "ver-1",
      template_version_number: 1,
      template_snapshot: {
        schema_version: 3,
        sections: [
          {
            code: "vitals",
            name: "Vitals",
            content_mode: "direct",
            response_fields: [
              { code: "bp", label: "BP", response_type: "text" },
            ],
            items: [],
          },
        ],
      },
      responses_json: {
        __exam_template__: {
          template_uuid: "tmpl-1",
          template_version_uuid: "ver-1",
          version_number: 1,
          answers: { picks: {}, fields: { vitals: { bp: "120/80" } } },
        },
      },
      row_version: 2,
    };
    ohService.fetchOhEncounter.mockResolvedValue({
      ...ENCOUNTER,
      origin: "laravel",
    });
    ohService.fetchOhExaminations.mockResolvedValue([examination]);
    ohService.patchOhExaminationResponses.mockImplementation(
      async (_uuid, payload) => {
        const next = {
          ...examination,
          responses_json: payload?.responses_json ?? examination.responses_json,
          row_version: 3,
        };
        ohService.fetchOhExaminations.mockResolvedValue([next]);
        return next;
      },
    );
    renderPage();
    await screen.findByTestId("oh-session-examination-step");
    await screen.findByTestId("oh-session-certificate-step");
    fireEvent.click(
      within(screen.getByTestId("oh-encounter-header")).getByRole("button", {
        name: "Continue",
      }),
    );
    await waitFor(() =>
      expect(screen.getByTestId("oh-session-certificate-step")).toHaveAttribute(
        "aria-hidden",
        "false",
      ),
    );
    fireEvent.click(
      within(screen.getByTestId("oh-encounter-header")).getByRole("button", {
        name: "Complete visit",
      }),
    );
    expect(
      await screen.findByText(
        "Complete the certificate before completing this visit.",
      ),
    ).toBeVisible();
    expect(completeMock).not.toHaveBeenCalled();
    fireEvent.click(
      within(screen.getByTestId("oh-encounter-header")).getByRole("button", {
        name: "Complete visit",
      }),
    );
    expect(
      await screen.findByText(
        "Complete the certificate before completing this visit.",
      ),
    ).toBeVisible();
    expect(screen.getByTestId("oh-session-certificate-step")).toHaveAttribute(
      "aria-hidden",
      "false",
    );
    expect(screen.getByTestId("oh-session-examination-step")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    expect(completeMock).not.toHaveBeenCalled();
  });

  it("shows a read-only explanation for a referred visit and hides complete", async () => {
    ohService.fetchOhEncounter.mockResolvedValue({
      ...ENCOUNTER,
      origin: "core",
    });
    renderPage();
    expect(
      await screen.findByTestId("oh-visit-readonly-banner"),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("oh-visit-primary-action"),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId("oh-cancel-visit")).not.toBeInTheDocument();
    expect(
      screen.getByTestId("oh-journey-module-employment"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("oh-journey-module-drug-alcohol"),
    ).toBeInTheDocument();
  });

  it("jumps back to the live examination step from a clinical module", async () => {
    ohService.fetchOhEncounter.mockResolvedValue({
      ...ENCOUNTER,
      origin: "laravel",
    });
    renderPage();
    await screen.findByTestId("oh-session-examination-step");
    fireEvent.click(screen.getByTestId("oh-journey-module-employment"));
    expect(
      await screen.findByRole("button", { name: "Back to forms" }),
    ).toBeInTheDocument();
    const jump = screen.getByTestId("oh-go-to-current-step");
    expect(jump).toHaveTextContent("Go to Exam");
    fireEvent.click(jump);
    expect(
      await screen.findByTestId("oh-session-examination-step"),
    ).toBeVisible();
    expect(
      screen.queryByTestId("oh-go-to-current-step"),
    ).not.toBeInTheDocument();
  });

  it("lists billing charges on the Bill tool", async () => {
    ohService.fetchOhEncounter.mockResolvedValue({
      ...ENCOUNTER,
      origin: "laravel",
    });
    ohService.fetchOhExaminations.mockResolvedValue([
      {
        id: 11,
        uuid: "exam-1",
        encounter: 7,
        exam_type: "periodic",
        occupational_attendance: true,
        template_code: "",
        notes: "",
        examined_at: "2026-10-26T08:10:00Z",
        created_at: "2026-10-26T08:10:00Z",
        updated_at: "2026-10-26T08:10:00Z",
        billing_charges: [
          {
            uuid: "chg-1",
            billing_key: "key-1",
            scope: "item",
            item_code: "SPIRO",
            product_uuid: "prod-1",
            destination: "lab",
            status: "sent",
            ui_status: "Added to the bill",
          },
        ],
      },
    ]);
    renderPage();
    const bill = await screen.findByRole("button", { name: "Bill" });
    expect(screen.queryByTestId("oh-toolbar-facts")).not.toBeInTheDocument();
    expect(
      screen.getByTestId("oh-workspace-toolbar-rail"),
    ).not.toHaveTextContent("Employer");
    expect(
      screen.getByTestId("oh-workspace-toolbar-rail"),
    ).not.toHaveTextContent("Risk profile");
    expect(screen.getByTestId("oh-toolbar-badge-bill")).toHaveTextContent("1");
    fireEvent.click(bill);
    expect(await screen.findByTestId("oh-billing-list")).toHaveTextContent(
      "SPIRO",
    );
    expect(screen.getByText("Added to the bill")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toHaveTextContent("1 on this visit");
  });

  it("keeps the consult chrome and shows an inline prompt when a risk profile is missing", async () => {
    ohService.fetchOhEncounter.mockResolvedValue({
      ...ENCOUNTER,
      origin: "laravel",
    });
    ohService.fetchEmploymentEpisodes.mockResolvedValue([]);
    renderPage();
    expect(
      await screen.findByTestId("oh-risk-profile-prompt"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("oh-visit-journey-rail")).toBeInTheDocument();
    expect(screen.getByTestId("oh-encounter-header")).toBeInTheDocument();
    expect(
      screen.getByTestId("oh-journey-module-employment"),
    ).toHaveTextContent("Needed");
    fireEvent.click(screen.getByTestId("oh-risk-profile-add-employment"));
    expect(
      await screen.findByRole("button", { name: "Back to forms" }),
    ).toBeInTheDocument();
  });
});
