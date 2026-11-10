import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, expect, it, vi } from "vitest";

import { OhVisitTemplateStep } from "@/features/occupational-health/components/OhVisitTemplateStep";
import type { OhVisitEncounter } from "@/features/occupational-health/types";

const fitness = vi.hoisted(() => vi.fn());

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/providers/toast-provider", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/providers/user-provider", () => ({
  useUser: () => ({ userData: { is_admin: false } }),
}));

vi.mock("@/features/occupational-health/services/immunisation.service", () => ({
  fetchOhImmFitnessGate: (...args: unknown[]) => fitness(...args),
}));

vi.mock("@/features/occupational-health/services/oh.service", () => ({
  createOhCofResponse: vi.fn(),
  createOhEmployeeFormResponse: vi.fn(),
  fetchOhCofTemplateVersions: vi.fn(async () => []),
  fetchOhEmployeeFormTemplateVersions: vi.fn(async () => []),
  patchOhCofResponses: vi.fn(),
  patchOhEmployeeFormResponses: vi.fn(),
  publishOhCofTemplate: vi.fn(),
  publishOhEmployeeFormTemplate: vi.fn(),
  recoverOhCofResponseVersion: vi.fn(),
  recoverOhEmployeeFormResponseVersion: vi.fn(),
}));

vi.mock("@/features/occupational-health/components/OhExamTemplateCaptureForm", () => ({
  OhExamTemplateCaptureForm: () => <div data-testid="exam-form" />,
}));

afterEach(() => {
  cleanup();
  fitness.mockReset();
});

const encounter: OhVisitEncounter = {
  id: 1,
  uuid: "enc-1",
  visit: "visit-1",
  department: "dept",
  department_name: "OH",
  department_type: "occupational_health",
  location: null,
  location_name: null,
  clinician: null,
  clinician_name: null,
  customer_uuid: "cust-1",
  is_active: true,
  status: "in_progress",
} as OhVisitEncounter;

function renderStep(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

it("shows amber warnings and keeps Save enabled when gate warns only", async () => {
  fitness.mockResolvedValue({
    mode: "warn",
    blocking: false,
    issues: [{ vaccine_code: "HEPB", status: "due", message: "HepB booster due" }],
  });
  renderStep(
    <OhVisitTemplateStep
      family="cof"
      title="Certificate of fitness"
      responseKey="cof"
      encounter={encounter}
      records={[]}
      locked={false}
      onSaved={() => undefined}
    />,
  );
  await waitFor(() => expect(screen.getByTestId("oh-imm-fitness-warnings")).toBeTruthy());
  expect(screen.getByText(/HepB booster due/i)).toBeTruthy();
  expect(screen.queryByTestId("oh-imm-fitness-blocked")).toBeNull();
  // Save may still be disabled when no published snapshot is loaded; gate alone must not block.
  expect(screen.getByRole("button", { name: /^Save$/i })).toBeTruthy();
});

it("shows red blocked banner and disables Save when gate blocks", async () => {
  fitness.mockResolvedValue({
    mode: "block",
    blocking: true,
    issues: [{ vaccine_code: "HEPB", status: "overdue", message: "Missing HepB series" }],
  });
  renderStep(
    <OhVisitTemplateStep
      family="cof"
      title="Certificate of fitness"
      responseKey="cof"
      encounter={encounter}
      records={[]}
      locked={false}
      onSaved={() => undefined}
    />,
  );
  await waitFor(() => expect(screen.getByTestId("oh-imm-fitness-blocked")).toBeTruthy());
  expect(screen.getByText(/Missing HepB series/i)).toBeTruthy();
  const save = screen.getByRole("button", { name: /^Save$/i });
  expect((save as HTMLButtonElement).disabled).toBe(true);
});
