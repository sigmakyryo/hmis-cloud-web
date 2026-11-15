import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { OhIodSettingsTab } from "@/features/settings/components/modules/occupational-health/OhIodSettingsTab";

const updateOhIodApplicability = vi.hoisted(() => vi.fn());

vi.mock("@/features/occupational-health/services/oh-iod-applicability.service", () => ({
  fetchOhIodApplicability: vi.fn(async () => ({
    cof: false,
    exam: false,
    visit_type_codes: [],
  })),
  fetchOhVisitServiceOptions: vi.fn(async () => [
    { uuid: "vt-rtw", code: "return_to_work", name: "Return to work" },
    { uuid: "vt-periodic", code: "periodic", name: "Periodic" },
  ]),
  updateOhIodApplicability,
}));

afterEach(() => {
  cleanup();
  updateOhIodApplicability.mockReset();
});

describe("OhIodSettingsTab", () => {
  it("saves certificate, exam, and the selected visit service together", async () => {
    updateOhIodApplicability.mockImplementation(async (setting: unknown) => setting);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={client}>
        <OhIodSettingsTab isActive />
      </QueryClientProvider>,
    );

    const returning = await screen.findByRole("checkbox", { name: "Return to work" });
    const certificate = screen.getByRole("checkbox", { name: "Certificate of fitness" });
    const exam = screen.getByRole("checkbox", { name: "Medical exam" });
    expect(certificate).not.toBeChecked();
    expect(exam).not.toBeChecked();
    expect(returning).not.toBeChecked();

    fireEvent.click(exam);
    fireEvent.click(returning);
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(updateOhIodApplicability).toHaveBeenCalledTimes(1));
    expect(updateOhIodApplicability.mock.calls[0][0]).toEqual({
      cof: false,
      exam: true,
      visit_type_codes: ["return_to_work"],
    });
  });
});
