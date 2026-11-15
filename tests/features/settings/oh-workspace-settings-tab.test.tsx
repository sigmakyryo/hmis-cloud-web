import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { OhWorkspaceSettingsTab } from "@/features/settings/components/modules/occupational-health/OhWorkspaceSettingsTab";
import { OH_WORKSPACE_AREAS } from "@/features/occupational-health/lib/oh-workspace-layout";

const updateOhWorkspaceLayout = vi.hoisted(() => vi.fn());

vi.mock("@/features/occupational-health/services/oh-workspace-layout.service", () => ({
  fetchOhWorkspaceLayout: vi.fn(async () => ({ included: [...OH_WORKSPACE_AREAS] })),
  updateOhWorkspaceLayout,
}));

afterEach(() => {
  cleanup();
  updateOhWorkspaceLayout.mockReset();
});

describe("OhWorkspaceSettingsTab", () => {
  it("saves the checklist without the area that was switched off", async () => {
    updateOhWorkspaceLayout.mockImplementation(async (included: readonly string[]) => ({
      included: [...included],
    }));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={client}>
        <OhWorkspaceSettingsTab isActive />
      </QueryClientProvider>,
    );

    const fitness = await screen.findByRole("checkbox", { name: "Fitness" });
    expect(fitness).toBeChecked();
    fireEvent.click(fitness);
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(updateOhWorkspaceLayout).toHaveBeenCalledTimes(1));
    const saved = updateOhWorkspaceLayout.mock.calls[0][0] as string[];
    expect(saved).not.toContain("fitness");
    expect(saved).toEqual([
      "immunizations",
      "drug-alcohol",
      "health-programs",
      "injuries",
      "employment",
      "exposure",
    ]);
  });
});
