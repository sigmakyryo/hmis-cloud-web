import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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

// Radix Switch measures itself; jsdom has no ResizeObserver.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

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

it("lists rules, adds one through the dialog and deactivates after confirming", async () => {
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

  expect(await screen.findByText("every 12 months")).toBeInTheDocument();
  expect(screen.getAllByText("Noise zone").length).toBeGreaterThan(0);

  fireEvent.click(screen.getByRole("button", { name: /New rule/ }));
  const dialog = await screen.findByTestId("oh-rule-dialog");
  fireEvent.change(within(dialog).getByLabelText("Component code"), { target: { value: "spiro" } });
  fireEvent.change(within(dialog).getByLabelText("Every (months)"), { target: { value: "24" } });
  fireEvent.click(within(dialog).getByRole("button", { name: "Add rule" }));
  await waitFor(() =>
    expect(service.createOhExamBatteryRule).toHaveBeenCalledWith({
      component_code: "SPIRO",
      exam_type: "periodic",
      periodicity_months: 24,
      hazard_profile: 4,
    }),
  );
  await waitFor(() => expect(screen.queryByTestId("oh-rule-dialog")).toBeNull());

  fireEvent.click(screen.getByRole("switch", { name: "Deactivate AUDIO" }));
  expect(service.updateOhExamBatteryRule).not.toHaveBeenCalled();
  const confirm = await screen.findByTestId("oh-rule-deactivate-dialog");
  fireEvent.click(within(confirm).getByRole("button", { name: "Deactivate" }));
  await waitFor(() =>
    expect(service.updateOhExamBatteryRule).toHaveBeenCalledWith("rule-1", { is_active: false }),
  );
});

it("rejects an invalid component code in the dialog", async () => {
  service.fetchOhHazardProfiles.mockResolvedValue([{ id: 4, uuid: "hp-4", name: "Noise zone", code: "NZ" }]);
  service.fetchOhExamBatteryRules.mockResolvedValue([]);
  renderPanel();

  fireEvent.click(await screen.findByRole("button", { name: /New rule/ }));
  const dialog = await screen.findByTestId("oh-rule-dialog");
  fireEvent.change(within(dialog).getByLabelText("Component code"), { target: { value: "x" } });
  fireEvent.click(within(dialog).getByRole("button", { name: "Add rule" }));
  await new Promise((r) => setTimeout(r, 20));
  expect(service.createOhExamBatteryRule).not.toHaveBeenCalled();
});

it("edits a rule's frequency", async () => {
  service.fetchOhHazardProfiles.mockResolvedValue([{ id: 4, uuid: "hp-4", name: "Noise zone", code: "NZ" }]);
  service.fetchOhExamBatteryRules.mockResolvedValue([
    { id: 1, uuid: "rule-1", component_code: "AUDIO", exam_type: "periodic", periodicity_months: 12, hazard_id: null, hazard_profile_id: 4, is_active: true },
  ]);
  service.updateOhExamBatteryRule.mockResolvedValue({});
  renderPanel();

  fireEvent.click(await screen.findByRole("button", { name: "Edit AUDIO" }));
  const dialog = await screen.findByTestId("oh-rule-dialog");
  fireEvent.change(within(dialog).getByLabelText("Every (months)"), { target: { value: "6" } });
  fireEvent.click(within(dialog).getByRole("button", { name: "Save changes" }));
  await waitFor(() =>
    expect(service.updateOhExamBatteryRule).toHaveBeenCalledWith("rule-1", { periodicity_months: 6, is_active: true }),
  );
});

it("generates requirements after confirming and reports the counts", async () => {
  service.fetchOhHazardProfiles.mockResolvedValue([]);
  service.fetchOhExamBatteryRules.mockResolvedValue([]);
  service.runOhSurveillanceSchedule.mockResolvedValue({ created: 3, completed: 1, overdue: 2 });
  renderPanel();

  fireEvent.click(await screen.findByRole("button", { name: /Generate now/ }));
  expect(service.runOhSurveillanceSchedule).not.toHaveBeenCalled();
  const confirm = await screen.findByTestId("oh-generate-dialog");
  fireEvent.click(within(confirm).getByRole("button", { name: "Generate" }));
  await waitFor(() =>
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ description: "3 created, 1 completed, 2 now overdue." }),
    ),
  );
});
