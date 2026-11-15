import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
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
  fetchIpdWards: vi.fn().mockResolvedValue([
    {
      uuid: "ward-1",
      name: "General A",
      code: "GEN-A",
      ward_class: "general",
      description: "",
      is_active: true,
      clinic_uuid: "clinic-1",
      department_uuid: "dept-1",
    },
  ]),
  fetchIpdBeds: vi.fn().mockResolvedValue([
    {
      uuid: "bed-1",
      code: "B01",
      label: "Window",
      bed_class: "",
      gender_restriction: "female",
      status: "available",
      is_active: true,
      ward_uuid: "ward-1",
      ward_name: "General A",
    },
    {
      uuid: "bed-2",
      code: "B02",
      label: "",
      bed_class: "",
      gender_restriction: "any",
      status: "occupied",
      is_active: true,
      ward_uuid: "ward-1",
      ward_name: "General A",
    },
  ]),
  updateIpdBed: vi.fn(),
  createIpdWard: vi.fn(),
  createIpdBed: vi.fn(),
}));

import { IpdBedManagementPage } from "@/features/clinical-ipd/pages/IpdBedManagementPage";

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <IpdBedManagementPage />
    </QueryClientProvider>,
  );
}

describe("IpdBedManagementPage", () => {
  it("lists wards first and opens a ward into its beds", async () => {
    renderPage();

    expect(await screen.findByRole("table", { name: "Wards" })).toBeTruthy();
    expect(screen.getByText("General A")).toBeTruthy();
    expect(screen.queryByLabelText(/ward name/i)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Open" }));

    expect(await screen.findByText("B01")).toBeTruthy();
    expect(screen.getByText("Window")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Change status of B01, currently Available" })).toBeTruthy();
    expect(screen.getByTitle("Discharge or transfer before changing this bed.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /change status of B02/i })).toBeNull();
  });
});
