import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { OhImmunizationsHubPage } from "@/features/occupational-health/pages/OhImmunizationsHubPage";

const mocks = vi.hoisted(() => ({
  due: vi.fn(),
  vaccines: vi.fn(),
  lots: vi.fn(),
  schedules: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("@/providers/toast-provider", () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

vi.mock("@/features/occupational-health/services/immunisation.service", () => ({
  fetchOhImmDue: (...args: unknown[]) => mocks.due(...args),
  fetchOhImmVaccines: (...args: unknown[]) => mocks.vaccines(...args),
  fetchOhImmLots: (...args: unknown[]) => mocks.lots(...args),
  fetchOhImmSchedules: (...args: unknown[]) => mocks.schedules(...args),
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
  mocks.vaccines.mockResolvedValue([]);
  mocks.lots.mockResolvedValue([]);
  mocks.schedules.mockResolvedValue([]);
});

it("renders immunizations hub with due catalog and schedules tabs", async () => {
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
  await waitFor(() =>
    expect(screen.getByText("Nobody is due this week")).toBeVisible(),
  );
  expect(screen.getByRole("button", { name: "Vaccines & lots" })).toBeVisible();
  expect(screen.getByRole("button", { name: "Schedules" })).toBeVisible();
});
