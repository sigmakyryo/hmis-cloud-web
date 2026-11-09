import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/providers/user-provider", () => ({
  useUser: () => ({
    userData: { primary_clinic: { id: 1, name: "Main", code: "MAIN" } },
  }),
}));

vi.mock("@/features/clinical/services/clinical-catalog.service", () => ({
  fetchClinicalClinics: vi.fn().mockResolvedValue([
    {
      id: 1,
      uuid: "clinic-1",
      name: "Main",
      code: "MAIN",
      status: "ACTIVE",
      is_active: true,
    },
  ]),
  fetchClinicalDepartments: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/features/clinical-ipd/services/clinical-ipd.service", () => ({
  admitIpdStay: vi.fn(),
  fetchIpdWards: vi.fn().mockResolvedValue([]),
  fetchIpdBeds: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/features/customers/components/CustomerAppointmentPicker", () => ({
  CustomerAppointmentPicker: () => <div>Customer picker</div>,
}));

vi.mock("@/features/settings/components/OrganizationUserPicker", () => ({
  OrganizationUserPicker: () => <div>Clinician picker</div>,
}));

import { IpdAdmitPage } from "@/features/clinical-ipd/pages/IpdAdmitPage";

describe("IpdAdmitPage pickers", () => {
  it("renders customer, clinic, and clinician pickers instead of UUID fields", async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={client}>
        <IpdAdmitPage />
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Customer picker")).toBeTruthy();
    expect(screen.getByText("Clinician picker")).toBeTruthy();
    expect(screen.queryByPlaceholderText("Customer UUID")).toBeNull();
    expect(screen.queryByPlaceholderText("Bed UUID")).toBeNull();
    expect(screen.getByRole("button", { name: /admit to ward/i })).toBeTruthy();
  });
});
