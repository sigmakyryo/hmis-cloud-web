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
    { id: 1, uuid: "clinic-1", name: "Main", code: "MAIN", status: "ACTIVE", is_active: true },
  ]),
  fetchClinicalDepartments: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/features/clinical-ipd/services/clinical-ipd.service", () => ({
  fetchIpdStays: vi.fn().mockResolvedValue([
    {
      uuid: "stay-1",
      status: "admitted",
      admission_source: "direct",
      admitted_at: "2026-11-15T08:00:00Z",
      discharged_at: null,
      presenting_complaint: "",
      discharge_summary: "",
      customer_uuid: "customer-1",
      customer_name: "Owen Onions",
      clinic_uuid: "clinic-1",
      visit_uuid: "visit-1",
      encounter_uuid: "enc-1",
      current_ward_uuid: "ward-1",
      current_ward_name: "General A",
      current_bed_uuid: "bed-1",
      current_bed_code: "B01",
      admitting_clinician_name: "Dr Phiri",
    },
  ]),
  fetchIpdWards: vi.fn().mockResolvedValue([]),
  fetchIpdBeds: vi.fn().mockResolvedValue([]),
  admitIpdStay: vi.fn(),
}));

vi.mock("@/features/customers/components/CustomerAppointmentPicker", () => ({
  CustomerAppointmentPicker: () => <div>Customer picker</div>,
}));

vi.mock("@/features/settings/components/OrganizationUserPicker", () => ({
  OrganizationUserPicker: () => <div>Clinician picker</div>,
}));

import { IpdActiveStaysPage } from "@/features/clinical-ipd/pages/IpdActiveStaysPage";

describe("IpdActiveStaysPage", () => {
  it("lists stays in a table and admits from a sheet", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <IpdActiveStaysPage />
      </QueryClientProvider>,
    );

    expect(await screen.findByRole("table", { name: "Stays" })).toBeTruthy();
    expect(screen.getByText("Owen Onions")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Ward board" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Admit patient" })).toBeNull();
  });
});
