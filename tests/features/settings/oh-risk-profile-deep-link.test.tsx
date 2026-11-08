import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { OhHazardProfilesSettingsTab } from "@/features/settings/components/modules/occupational-health/OhHazardProfilesSettingsTab";
const state = vi.hoisted(() => ({ query: "employer=employer-uuid&profile=hp-1", profiles: vi.fn(), toast: vi.fn() }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(state.query) }));
vi.mock("@/providers/toast-provider", () => ({ useToast: () => ({ toast: state.toast }) }));
vi.mock("@/features/occupational-health/services/oh.service", () => ({
  fetchOhHazardProfiles: state.profiles, fetchOhCofTemplates: vi.fn().mockResolvedValue([]), fetchOhExamTemplates: vi.fn().mockResolvedValue([]),
  archiveOhHazardProfile: vi.fn(), createOhHazardProfile: vi.fn(), updateOhHazardProfile: vi.fn(),
}));
beforeEach(() => {
  state.query = "employer=employer-uuid&profile=hp-1";
  state.profiles.mockResolvedValue([{ id: 44, uuid: "hp-1", employer: 5, name: "Welding", code: "WELD", exam_template: null }]);
});
afterEach(cleanup);
it("opens the exact employer's requested risk profile for template assignment", async () => {
  render(<OhHazardProfilesSettingsTab isActive employer={{ id: 5, uuid: "employer-uuid", name: "Employer", code: "EMP" }} />);
  expect(await screen.findByRole("dialog")).toBeVisible();
  expect(screen.getByLabelText(/Name/)).toHaveValue("Welding");
  expect(screen.getByLabelText("Exam template")).toBeVisible();
});
it("does not open an unrelated employer's profile or a nonexistent target", async () => {
  state.profiles.mockResolvedValue([{ id: 44, uuid: "hp-1", employer: 999, name: "Other", code: "OTHER" }]);
  render(<OhHazardProfilesSettingsTab isActive employer={{ id: 5, uuid: "employer-uuid", name: "Employer", code: "EMP" }} />);
  await screen.findByText("Other");
  expect(screen.queryByRole("dialog")).toBeNull();
});
