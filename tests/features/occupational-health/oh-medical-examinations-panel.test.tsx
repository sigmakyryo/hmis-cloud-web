import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { OhMedicalExaminationsPanel } from "@/features/occupational-health/components/OhMedicalExaminationsPanel";
import type { EmploymentEpisode, OhVisitEncounter } from "@/features/occupational-health/types";

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
};

const PUBLISHED_VERSION = {
  id: 1,
  uuid: "ver-1",
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
        encounter={ENCOUNTER}
        episodes={[EPISODE]}
        workspace={workspace as never}
      />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
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
    await waitFor(() =>
      expect(screen.getByTestId("oh-exam-answer-bp")).toHaveTextContent("120/80"),
    );
    expect(ohService.createOhExamination).not.toHaveBeenCalled();
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
    fireEvent.click(screen.getByTestId("oh-exam-toggle-item"));
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
});
