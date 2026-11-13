import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { OhVisitTemplateStep } from "@/features/occupational-health/components/OhVisitTemplateStep";
import type { OhTemplateCapture, OhVisitEncounter } from "@/features/occupational-health/types";

const ohService = vi.hoisted(() => ({
  createOhCofResponse: vi.fn(),
  createOhEmployeeFormResponse: vi.fn(),
  fetchOhCofTemplateVersions: vi.fn(),
  fetchOhEmployeeFormTemplateVersions: vi.fn(),
  patchOhCofResponses: vi.fn(),
  patchOhEmployeeFormResponses: vi.fn(),
  publishOhCofTemplate: vi.fn(),
  publishOhEmployeeFormTemplate: vi.fn(),
  recoverOhCofResponseVersion: vi.fn(),
  recoverOhEmployeeFormResponseVersion: vi.fn(),
}));

vi.mock("@/features/occupational-health/services/oh.service", () => ohService);
vi.mock("@/providers/toast-provider", () => ({
  useToast: () => ({ toast: vi.fn(), dismiss: vi.fn() }),
}));
vi.mock("@/providers/user-provider", () => ({
  useUser: () => ({ userData: { is_admin: true } }),
}));
vi.mock("@/features/occupational-health/services/immunisation.service", () => ({
  fetchOhImmFitnessGate: vi.fn().mockResolvedValue({ blocking: false, issues: [], mode: "off" }),
}));
vi.mock("@/features/occupational-health/components/OhCertificateReadiness", () => ({
  OhCertificateReadiness: () => <div data-testid="oh-certificate-readiness" />,
}));
vi.mock("@/features/occupational-health/components/OhExamTemplateCaptureForm", () => ({
  OhExamTemplateCaptureForm: () => <div data-testid="oh-exam-template-capture" />,
}));

const SNAPSHOT = {
  schema_version: 3,
  sections: [
    {
      code: "outcome",
      name: "Outcome",
      content_mode: "direct",
      response_fields: [
        {
          code: "verdict",
          label: "Fitness outcome",
          response_type: "single_select",
          options: [
            { code: "fit", label: "Fit" },
            { code: "fit_with_restrictions", label: "Fit with restrictions" },
          ],
        },
        { code: "restrictions", label: "Restrictions", response_type: "textarea" },
      ],
      items: [],
    },
  ],
};

const ENCOUNTER = {
  id: 7,
  uuid: "visit-1",
  is_active: true,
  clinician_name: "Dr Ada",
  customer_uuid: "cust-1",
} as OhVisitEncounter;

const RECORD: OhTemplateCapture = {
  id: 3,
  uuid: "cof-1",
  encounter: 7,
  row_version: 2,
  template_uuid: "cof-tmpl",
  template_version_uuid: "cof-ver",
  template_snapshot: SNAPSHOT,
  updated_at: "2026-11-13T08:30:00",
  responses_json: {
    __cof_template__: {
      template_uuid: "cof-tmpl",
      answers: {
        picks: {},
        fields: {
          outcome: { verdict: "fit_with_restrictions", restrictions: "No work at height" },
        },
      },
    },
  },
};

function renderStep(
  overrides: {
    records?: OhTemplateCapture[];
    locked?: boolean;
    is_active?: boolean;
  } = {},
) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <OhVisitTemplateStep
        family="cof"
        title="Certificate of fitness"
        responseKey="__cof_template__"
        encounter={{ ...ENCOUNTER, is_active: overrides.is_active ?? true }}
        records={overrides.records ?? [RECORD]}
        locked={overrides.locked ?? false}
        onSaved={vi.fn()}
      />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  ohService.fetchOhCofTemplateVersions.mockResolvedValue([]);
  ohService.patchOhCofResponses.mockResolvedValue(RECORD);
});

afterEach(cleanup);

describe("OhVisitTemplateStep certificate answers", () => {
  it("shows a completed answers view with Export PDF for a saved certificate", async () => {
    renderStep();

    expect(await screen.findByTestId("oh-cof-answers-view")).toBeVisible();
    expect(screen.getByTestId("oh-exam-answers-status")).toHaveTextContent("Completed");
    expect(screen.getByText("Fitness outcome")).toBeVisible();
    expect(screen.getAllByText("Fit with restrictions").length).toBeGreaterThan(0);
    expect(screen.getAllByText("No work at height").length).toBeGreaterThan(0);
    const pdf = screen.getByRole("link", { name: "Export PDF" });
    expect(pdf).toHaveAttribute(
      "href",
      "/api/occupational-health/oh-ext/oh-cof-responses/cof-1/pdf",
    );
    expect(screen.queryByTestId("oh-exam-template-capture")).toBeNull();
    expect(ohService.createOhCofResponse).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(await screen.findByTestId("oh-exam-template-capture")).toBeVisible();
    expect(screen.queryByTestId("oh-cof-answers-view")).toBeNull();
  });

  it("hides Edit when the encounter is no longer active", async () => {
    renderStep({ is_active: false });
    expect(await screen.findByTestId("oh-cof-answers-view")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Edit" })).toBeNull();
    expect(screen.getByRole("link", { name: "Export PDF" })).toBeVisible();
  });
});
