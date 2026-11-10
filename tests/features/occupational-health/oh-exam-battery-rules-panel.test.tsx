import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

import { OhExamBatteryRulesPanel } from "@/features/occupational-health/components/OhExamBatteryRulesPanel";

const service = vi.hoisted(() => ({
  fetchOhExamBatteryRules: vi.fn(),
  fetchOhHazardProfiles: vi.fn(),
  createOhExamBatteryRule: vi.fn(),
  updateOhExamBatteryRule: vi.fn(),
  runOhSurveillanceSchedule: vi.fn(),
}));
const toast = vi.hoisted(() => vi.fn());

vi.mock("@/providers/toast-provider", () => ({ useToast: () => ({ toast }) }));
vi.mock("@/features/occupational-health/services/oh.service", () => service);

function renderPanel() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <OhExamBatteryRulesPanel />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  for (const fn of Object.values(service)) {
    fn.mockReset();
  }
  toast.mockReset();
});

it("lists rules, adds one for the hazard profile and toggles it", async () => {
  service.fetchOhHazardProfiles.mockResolvedValue([{ id: 4, uuid: "hp-4", name: "Noise zone", code: "NZ" }]);
  service.fetchOhExamBatteryRules.mockResolvedValue([
    {
      id: 1,
      uuid: "rule-1",
      component_code: "AUDIO",
      exam_type: "periodic",
      periodicity_months: 12,
      hazard_id: null,
      hazard_profile_id: 4,
      is_active: true,
    },
  ]);
  service.createOhExamBatteryRule.mockResolvedValue({});
  service.updateOhExamBatteryRule.mockResolvedValue({});
  renderPanel();

  expect(await screen.findByText(/every 12 months · Noise zone/)).toBeInTheDocument();
  const add = screen.getByRole("button", { name: "Add rule" });
  expect(add).toBeDisabled();

  fireEvent.change(screen.getByLabelText("Component code"), { target: { value: "spiro" } });
  fireEvent.change(screen.getByLabelText("Every (months)"), { target: { value: "24" } });
  await waitFor(() => expect(add).toBeEnabled());
  fireEvent.click(add);
  await waitFor(() =>
    expect(service.createOhExamBatteryRule).toHaveBeenCalledWith({
      component_code: "SPIRO",
      exam_type: "periodic",
      periodicity_months: 24,
      hazard_profile: 4,
    }),
  );

  fireEvent.click(screen.getByRole("button", { name: "Deactivate" }));
  await waitFor(() =>
    expect(service.updateOhExamBatteryRule).toHaveBeenCalledWith("rule-1", { is_active: false }),
  );
});

it("generates requirements on demand and reports the counts", async () => {
  service.fetchOhHazardProfiles.mockResolvedValue([]);
  service.fetchOhExamBatteryRules.mockResolvedValue([]);
  service.runOhSurveillanceSchedule.mockResolvedValue({ created: 3, completed: 1, overdue: 2 });
  renderPanel();

  fireEvent.click(await screen.findByRole("button", { name: "Generate now" }));
  await waitFor(() =>
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ description: "3 created, 1 completed, 2 now overdue." }),
    ),
  );
});
