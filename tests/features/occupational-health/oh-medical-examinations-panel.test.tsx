import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { OhMedicalExaminationsPanel } from "@/features/occupational-health/components/OhMedicalExaminationsPanel";
import type { EmploymentEpisode, OhVisitEncounter } from "@/features/occupational-health/types";

const user = vi.hoisted(() => ({ is_admin: true }));
vi.mock("@/providers/user-provider", () => ({ useUser: () => ({ userData: user }) }));

const ohService = vi.hoisted(() => ({
  createOhExamination: vi.fn(),
  fetchOhExamTemplateVersions: vi.fn(),
  fetchOhHazardProfiles: vi.fn(),
  patchOhExaminationResponses: vi.fn(),
}));

vi.mock("@/features/occupational-health/services/oh.service", () => ohService);
vi.mock("@/providers/toast-provider", () => ({
  useToast: () => ({ toast: vi.fn(() => "toast-id"), dismiss: vi.fn() }),
}));

vi.mock("@/features/occupational-health/components/OhExamTemplateCaptureForm", () => ({
  OhExamTemplateCaptureForm: ({
    value,
    onChange,
  }: {
    value: { picks: Record<string, string[]>; fields: Record<string, Record<string, string>> };
    onChange: (next: {
      picks: Record<string, string[]>;
      fields: Record<string, Record<string, string>>;
    }) => void;
  }) => (
    <div data-testid="oh-exam-template-capture">
      <span data-testid="oh-exam-answer-bp">
        {value.fields?.vitals?.bp ?? ""}
      </span>
      <button
        type="button"
        data-testid="oh-exam-toggle-item"
        onClick={() =>
          onChange({
            ...value,
            picks: { ...value.picks, symptoms: ["cough"] },
          })
        }
      >
        Toggle item
      </button>
    </div>
  ),
}));

vi.mock("@/features/occupational-health/components/OhProcedureChecklistPanel", () => ({
  OhProcedureChecklistPanel: () => <div data-testid="oh-procedure-checklist" />,
}));

const ENCOUNTER = {
  id: 7,
  uuid: "enc-1",
} as OhVisitEncounter;

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
} as EmploymentEpisode;

const PROFILE = {
  id: 44,
  uuid: "hp-1",
  name: "Welding",
  code: "WELD",
  exam_template: "tmpl-1",
  exam_template_code: "EXAM",
  exam_template_name: "Annual exam",
  employer: 5,
  employer_uuid: "employer-uuid",
};

const PUBLISHED_VERSION = {
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
        response_fields: [{ code: "bp", label: "BP", response_type: "text" }],
        items: [],
      },
    ],
  },
};

function renderPanel(
  overrides: {
    examinations?: unknown[];
    completionRef?: { current: (() => Promise<boolean>) | null };
    encounter?: Partial<OhVisitEncounter>;
  } = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const workspace = {
    examinations: overrides.examinations ?? [],
    findings: [],
    fitness: [],
    fitnessCertificates: [],
    iodCases: [],
    isLoading: false,
    isError: false,
    refetchAll: vi.fn(),
  };

  return render(
    <QueryClientProvider client={queryClient}>
      <OhMedicalExaminationsPanel
        encounter={{ ...ENCOUNTER, ...overrides.encounter }}
        completionRef={overrides.completionRef}
        episodes={[EPISODE]}
        onManageEmployment={vi.fn()}
        workspace={workspace as never}
      />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  user.is_admin = true;
  ohService.fetchOhHazardProfiles.mockResolvedValue([PROFILE]);
  ohService.fetchOhExamTemplateVersions.mockResolvedValue([PUBLISHED_VERSION]);
  ohService.createOhExamination.mockResolvedValue({
    id: 11,
    uuid: "exam-new",
    encounter: 7,
    exam_type: "pre_employment",
    employment_episode: 9,
    responses_json: {},
    row_version: 1,
    examined_at: "2026-11-03T08:00:00Z",
    created_at: "2026-11-03T08:00:00Z",
  });
  ohService.patchOhExaminationResponses.mockResolvedValue({
    id: 11,
    uuid: "exam-new",
    encounter: 7,
    exam_type: "pre_employment",
    responses_json: {},
    row_version: 2,
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("OhMedicalExaminationsPanel", () => {
  it("asks for the exam type and note before the template", async () => {
    renderPanel();

    expect(await screen.findByTestId("oh-exam-details-step")).toBeInTheDocument();
    expect(screen.getByLabelText(/Exam type/)).toBeInTheDocument();
    expect(screen.getByLabelText("Note")).toBeInTheDocument();
    expect(screen.getByTestId("oh-exam-details-continue")).toBeDisabled();
    expect(screen.queryByTestId("oh-exam-template-capture")).not.toBeInTheDocument();
    expect(ohService.createOhExamination).not.toHaveBeenCalled();
  });

  it("keeps the type and note in state, then shows the template", async () => {
    renderPanel();

    fireEvent.click(await screen.findByRole("combobox", { name: /Exam type/ }));
    fireEvent.click(await screen.findByRole("option", { name: "Admission exam" }));
    fireEvent.change(screen.getByLabelText("Note"), {
      target: { value: "Annual review" },
    });
    fireEvent.click(screen.getByTestId("oh-exam-details-continue"));

    expect(await screen.findByTestId("oh-exam-template-capture")).toBeInTheDocument();
    expect(screen.getByText("Admission exam")).toBeInTheDocument();
    expect(screen.getByText("Annual review")).toBeInTheDocument();
    expect(screen.getByTestId("oh-exam-change-type")).toBeInTheDocument();
    expect(ohService.createOhExamination).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId("oh-exam-change-type"));
    expect(screen.getByTestId("oh-exam-details-step")).toBeInTheDocument();
    expect(screen.getByLabelText("Note")).toHaveValue("Annual review");
    expect(screen.queryByTestId("oh-exam-template-capture")).not.toBeInTheDocument();
  });

  it("loads an existing exam without prompting for type again", async () => {
    renderPanel({
      examinations: [
        {
          id: 11,
          uuid: "exam-1",
          encounter: 7,
          exam_type: "periodic",
          employment_episode: 9,
          responses_json: {
            __exam_template__: {
              template_uuid: "tmpl-1",
              version_number: 1,
              answers: { picks: {}, fields: { vitals: { bp: "120/80" } } },
            },
          },
          row_version: 3,
          examined_at: "2026-11-03T08:00:00Z",
          created_at: "2026-11-03T08:00:00Z",
        },
      ],
    });

    expect(await screen.findByText("Periodic exam")).toBeInTheDocument();
    expect(screen.queryByTestId("oh-exam-details-step")).not.toBeInTheDocument();
    expect(await screen.findByTestId("oh-exam-answers-view")).toBeVisible();
    expect(screen.getByTestId("oh-exam-answers-status")).toHaveTextContent("Completed");
    expect(screen.getByText("BP")).toBeVisible();
    expect(screen.getByText("120/80")).toBeVisible();
    const pdf = screen.getByRole("link", { name: "Export PDF" });
    expect(pdf).toHaveAttribute(
      "href",
      "/api/occupational-health/oh-ext/oh-examinations/exam-1/pdf",
    );
    expect(pdf).toHaveAttribute("target", "_blank");
    expect(screen.queryByTestId("oh-exam-template-capture")).not.toBeInTheDocument();
    expect(ohService.createOhExamination).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(await screen.findByTestId("oh-exam-template-capture")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByTestId("oh-exam-answer-bp")).toHaveTextContent("120/80"),
    );
  });

  it("autosaves the first answer change on an existing examination", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderPanel({
      examinations: [
        {
          id: 11,
          uuid: "exam-1",
          encounter: 7,
          exam_type: "periodic",
          employment_episode: 9,
          responses_json: {
            __exam_template__: {
              template_uuid: "tmpl-1",
              version_number: 1,
              answers: { picks: {}, fields: { vitals: { bp: "120/80" } } },
            },
          },
          row_version: 3,
          examined_at: "2026-11-03T08:00:00Z",
          created_at: "2026-11-03T08:00:00Z",
        },
      ],
    });

    expect(await screen.findByText("Periodic exam")).toBeInTheDocument();
    fireEvent.click(await screen.findByRole("button", { name: "Edit" }));
    fireEvent.click(await screen.findByTestId("oh-exam-toggle-item"));
    await vi.advanceTimersByTimeAsync(650);

    await waitFor(() =>
      expect(ohService.patchOhExaminationResponses).toHaveBeenCalledWith(
        "exam-1",
        expect.objectContaining({
          row_version: 3,
          responses_json: expect.objectContaining({
            __exam_template__: expect.objectContaining({
              answers: expect.objectContaining({
                picks: { symptoms: ["cough"] },
              }),
            }),
          }),
        }),
      ),
    );
    vi.useRealTimers();
  });
  it("renders pinned v1 even when latest published v2 and a newer draft exist", async () => {
    ohService.fetchOhExamTemplateVersions.mockResolvedValue([
      { ...PUBLISHED_VERSION, uuid: "ver-3", number: 3, status: "draft" },
      { ...PUBLISHED_VERSION, uuid: "ver-2", number: 2, snapshot_json: { sections: [] } }, PUBLISHED_VERSION,
    ]);
    renderPanel({ examinations: [{ id: 11, uuid: "exam-v1", exam_type: "periodic", template_version_uuid: "ver-1", template_snapshot: PUBLISHED_VERSION.snapshot_json,
      responses_json: { __exam_template__: { template_uuid: "tmpl-1", template_version_uuid: "ver-1", version_number: 1, answers: { picks: {}, fields: { vitals: { bp: "original v1 value" } } } } } }] });
    expect(await screen.findByTestId("oh-exam-answers-view")).toBeVisible();
    expect(screen.getByText("original v1 value")).toBeVisible();
    expect(screen.queryByText("Finish the examination template")).toBeNull();
    expect(ohService.createOhExamination).not.toHaveBeenCalled();
  });

  it("keeps the pinned historical schema when the risk profile now links another template", async () => {
    ohService.fetchOhHazardProfiles.mockResolvedValue([{ ...PROFILE, exam_template: "replacement-template" }]);
    ohService.fetchOhExamTemplateVersions.mockResolvedValue([{ ...PUBLISHED_VERSION, template: "replacement-template", uuid: "replacement-version", snapshot_json: { sections: [] } }]);
    renderPanel({ examinations: [{ id: 11, uuid: "historical", exam_type: "periodic", template_uuid: "tmpl-1", template_version_uuid: "ver-1", template_snapshot: PUBLISHED_VERSION.snapshot_json,
      responses_json: { __exam_template__: { template_uuid: "tmpl-1", template_version_uuid: "ver-1", version_number: 1, answers: { picks: {}, fields: { vitals: { bp: "historic value" } } } } } }] });
    expect(await screen.findByTestId("oh-exam-answers-view")).toBeVisible();
    expect(screen.getByText("historic value")).toBeVisible();
    expect(ohService.patchOhExaminationResponses).not.toHaveBeenCalled();
  });

  it("never retargets an older examination without a recoverable version", async () => {
    renderPanel({ examinations: [{ id: 11, uuid: "legacy", exam_type: "periodic", responses_json: { __exam_template__: { template_uuid: "tmpl-1", answers: { picks: {}, fields: {} } } } }] });
    expect(await screen.findByText("Saved examination version unavailable")).toBeVisible();
    expect(ohService.createOhExamination).not.toHaveBeenCalled();
    expect(ohService.patchOhExaminationResponses).not.toHaveBeenCalled();
  });

  it("starts a blank examination with the newest published version, never the newer draft", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    ohService.fetchOhExamTemplateVersions.mockResolvedValue([
      { ...PUBLISHED_VERSION, uuid: "draft-9", number: 9, status: "draft" },
      PUBLISHED_VERSION, { ...PUBLISHED_VERSION, uuid: "published-2", number: 2 },
    ]);
    ohService.createOhExamination.mockResolvedValue({ id: 11, uuid: "new-pinned", exam_type: "pre_employment", template_version_uuid: "published-2", template_snapshot: PUBLISHED_VERSION.snapshot_json, responses_json: {}, row_version: 1 });
    renderPanel();
    fireEvent.click(await screen.findByRole("combobox", { name: /Exam type/ }));
    fireEvent.click(await screen.findByRole("option", { name: "Admission exam" }));
    fireEvent.click(screen.getByTestId("oh-exam-details-continue"));
    fireEvent.click(await screen.findByTestId("oh-exam-toggle-item"));
    await vi.advanceTimersByTimeAsync(650);
    await waitFor(() => expect(ohService.createOhExamination).toHaveBeenCalledWith(expect.objectContaining({ template_version_uuid: "published-2" })));
    await waitFor(() => expect(ohService.patchOhExaminationResponses).toHaveBeenCalledWith("new-pinned", expect.objectContaining({ responses_json: expect.objectContaining({ __exam_template__: expect.objectContaining({ template_version_uuid: "published-2", version_number: 2 }) }) })));
    vi.useRealTimers();
  });

  it("offers a contextual profile setup link and decorative illustration when no template is linked", async () => {
    ohService.fetchOhHazardProfiles.mockResolvedValue([{ ...PROFILE, exam_template: null }]);
    renderPanel();
    expect(await screen.findByRole("heading", { name: "Set up this examination" })).toBeVisible();
    const link = screen.getByRole("link", { name: /Choose exam template/ });
    expect(link).toHaveAttribute("href", "/settings/modules/occupational-health?employer=employer-uuid&profile=hp-1");
    expect(link).toHaveAttribute("target", "_blank");
    expect(screen.getByLabelText("Examination setup").querySelector('svg[aria-hidden="true"]')).not.toBeNull();
    expect(ohService.createOhExamination).not.toHaveBeenCalled();
  });

  it("does not expose administrator settings actions to a clinician", async () => {
    user.is_admin = false;
    ohService.fetchOhHazardProfiles.mockResolvedValue([{ ...PROFILE, exam_template: null }]);
    renderPanel();
    expect(await screen.findByText(/Ask your administrator/)).toBeVisible();
    expect(screen.queryByRole("link", { name: /Choose exam template/ })).toBeNull();
    expect(screen.getByRole("button", { name: "Check again" })).toBeEnabled();
  });

  it("requires a published version rather than using a draft snapshot", async () => {
    ohService.fetchOhExamTemplateVersions.mockResolvedValue([{ ...PUBLISHED_VERSION, status: "draft" }]);
    renderPanel();
    expect(await screen.findByRole("heading", { name: "Publish the examination template" })).toBeVisible();
    expect(screen.getByRole("link", { name: /Review and publish/ })).toHaveAttribute("href", "/templates/exam/tmpl-1");
    expect(screen.queryByTestId("oh-exam-details-step")).toBeNull();
    expect(ohService.createOhExamination).not.toHaveBeenCalled();
  });

  it("rechecks changed profile linkage and publication without creating an examination", async () => {
    ohService.fetchOhHazardProfiles.mockResolvedValueOnce([{ ...PROFILE, exam_template: null }]).mockResolvedValue([PROFILE]);
    ohService.fetchOhExamTemplateVersions.mockResolvedValue([PUBLISHED_VERSION]);
    renderPanel();
    fireEvent.click(await screen.findByRole("button", { name: "Check again" }));
    expect(await screen.findByTestId("oh-exam-details-step")).toBeVisible();
    expect(ohService.fetchOhHazardProfiles).toHaveBeenCalledTimes(2);
    expect(ohService.createOhExamination).not.toHaveBeenCalled();
    expect(ohService.patchOhExaminationResponses).not.toHaveBeenCalled();
  });

  it("offers retry for setup loading errors rather than calling them missing templates", async () => {
    ohService.fetchOhHazardProfiles.mockRejectedValueOnce(new Error("Unavailable")).mockResolvedValue([PROFILE]);
    renderPanel();
    expect(await screen.findByRole("heading", { name: "Couldn't load examination setup" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Check again" }));
    expect(await screen.findByTestId("oh-exam-details-step")).toBeVisible();
  });

  it("distinguishes a published template without examination sections", async () => {
    ohService.fetchOhExamTemplateVersions.mockResolvedValue([{ ...PUBLISHED_VERSION, snapshot_json: { schema_version: 2, sections: [] } }]);
    renderPanel();
    expect(await screen.findByRole("heading", { name: "Finish the examination template" })).toBeVisible();
    expect(screen.getByRole("link", { name: /Edit exam template/ })).toHaveAttribute("href", "/templates/exam/tmpl-1");
  });

  it("switches to the answers view with Export PDF after the visit is completed", async () => {
    const completionRef: { current: (() => Promise<boolean>) | null } = { current: null };
    ohService.createOhExamination.mockResolvedValue({
      id: 11,
      uuid: "exam-new",
      encounter: 7,
      exam_type: "pre_employment",
      employment_episode: 9,
      template_uuid: "tmpl-1",
      template_version_uuid: "ver-1",
      template_version_number: 1,
      template_snapshot: PUBLISHED_VERSION.snapshot_json,
      responses_json: {},
      row_version: 1,
      examined_at: "2026-11-13T08:00:00Z",
      created_at: "2026-11-13T08:00:00Z",
    });
    ohService.patchOhExaminationResponses.mockResolvedValue({
      id: 11,
      uuid: "exam-new",
      encounter: 7,
      exam_type: "pre_employment",
      template_uuid: "tmpl-1",
      template_version_uuid: "ver-1",
      template_version_number: 1,
      template_snapshot: PUBLISHED_VERSION.snapshot_json,
      responses_json: {
        __exam_template__: {
          template_uuid: "tmpl-1",
          template_version_uuid: "ver-1",
          version_number: 1,
          answers: { picks: {}, fields: { vitals: { bp: "118/76" } } },
        },
      },
      row_version: 2,
      examined_at: "2026-11-13T08:00:00Z",
      updated_at: "2026-11-13T08:00:00Z",
    });
    renderPanel({ completionRef });

    fireEvent.click(await screen.findByRole("combobox", { name: /Exam type/ }));
    fireEvent.click(await screen.findByRole("option", { name: "Admission exam" }));
    fireEvent.click(screen.getByTestId("oh-exam-details-continue"));
    expect(await screen.findByTestId("oh-exam-template-capture")).toBeInTheDocument();

    await waitFor(() => expect(completionRef.current).toBeTypeOf("function"));
    await expect(completionRef.current!()).resolves.toBe(true);
    expect(await screen.findByTestId("oh-exam-answers-view")).toBeVisible();
    expect(screen.getByRole("link", { name: "Export PDF" })).toHaveAttribute(
      "href",
      "/api/occupational-health/oh-ext/oh-examinations/exam-new/pdf",
    );
    expect(screen.queryByTestId("oh-exam-template-capture")).not.toBeInTheDocument();
  });

  it("hides Edit on a completed exam when the encounter is inactive", async () => {
    renderPanel({
      encounter: { is_active: false },
      examinations: [
        {
          id: 11,
          uuid: "exam-1",
          encounter: 7,
          exam_type: "periodic",
          employment_episode: 9,
          responses_json: {
            __exam_template__: {
              template_uuid: "tmpl-1",
              version_number: 1,
              answers: { picks: {}, fields: { vitals: { bp: "120/80" } } },
            },
          },
          row_version: 3,
          examined_at: "2026-11-03T08:00:00Z",
          created_at: "2026-11-03T08:00:00Z",
        },
      ],
    });
    expect(await screen.findByTestId("oh-exam-answers-view")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Edit" })).toBeNull();
    expect(screen.getByRole("link", { name: "Export PDF" })).toBeVisible();
  });
});
