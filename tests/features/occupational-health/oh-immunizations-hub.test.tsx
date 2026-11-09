import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { OhImmunizationsHubPage } from "@/features/occupational-health/pages/OhImmunizationsHubPage";

const mocks = vi.hoisted(() => ({
  due: vi.fn(),
  dueFiltered: vi.fn(),
  vaccines: vi.fn(),
  lots: vi.fn(),
  schedules: vi.fn(),
  compliance: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("@/providers/toast-provider", () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

vi.mock("@/features/occupational-health/services/immunisation.service", () => ({
  fetchOhImmDue: (...args: unknown[]) => mocks.due(...args),
  fetchOhImmDueFiltered: (...args: unknown[]) => mocks.dueFiltered(...args),
  fetchOhImmVaccines: (...args: unknown[]) => mocks.vaccines(...args),
  fetchOhImmLots: (...args: unknown[]) => mocks.lots(...args),
  fetchOhImmSchedules: (...args: unknown[]) => mocks.schedules(...args),
  fetchOhImmCompliance: (...args: unknown[]) => mocks.compliance(...args),
  downloadOhImmComplianceCsv: vi.fn(),
  downloadOhImmDhisCsv: vi.fn(),
  downloadOhImmFhirNdjson: vi.fn(),
  exportOhImmPack: vi.fn(),
  importOhImmPack: vi.fn(),
  fetchOhImmAudits: vi.fn(async () => []),
  fetchOhImmDhisMappings: vi.fn(async () => []),
  createOhImmDhisMapping: vi.fn(),
  fetchOhImmFitnessGate: vi.fn(),
  previewOhImmAssignment: vi.fn(),
  remindOhImm: vi.fn(),
  seedOhImmExamples: vi.fn(),
  createOhImmVaccine: vi.fn(),
  createOhImmLot: vi.fn(),
  createOhImmSchedule: vi.fn(),
  publishOhImmSchedule: vi.fn(),
}));

afterEach(cleanup);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.due.mockResolvedValue([]);
  mocks.dueFiltered.mockResolvedValue([]);
  mocks.vaccines.mockResolvedValue([]);
  mocks.lots.mockResolvedValue([]);
  mocks.schedules.mockResolvedValue([]);
  mocks.compliance.mockResolvedValue({
    summary: { people: 0, compliant: 0, percent_compliant: 0, overdue_rows: 0 },
    groups: [],
    overdue: [],
  });
});

it("renders immunizations hub with due catalog schedules and compliance tabs", async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <OhImmunizationsHubPage />
    </QueryClientProvider>,
  );
  expect(screen.getByTestId("oh-immunizations-page")).toBeVisible();
  expect(screen.getByRole("heading", { name: "Immunizations" })).toBeVisible();
  await waitFor(() => expect(screen.getByText("Nobody matches")).toBeVisible());
  expect(screen.getByRole("button", { name: "Due / overdue" })).toBeVisible();
  expect(screen.getByRole("button", { name: "Vaccines & lots" })).toBeVisible();
  expect(screen.getByRole("button", { name: "Schedules" })).toBeVisible();
  expect(screen.getByRole("button", { name: "Compliance" })).toBeVisible();
  expect(screen.getByRole("button", { name: "Exports & audit" })).toBeVisible();
});
