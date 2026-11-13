import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Customer } from "@/features/customers/types/customer.types";
import type { IodCase, OhVisitEncounter } from "@/features/occupational-health/types";

const mocks = vi.hoisted(() => ({
  createIodCase: vi.fn(),
  updateIodCase: vi.fn(),
  downloadIodStatutoryPack: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("@/providers/toast-provider", () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock("@/features/occupational-health/services/oh.service", () => ({
  createIodCase: (...args: unknown[]) => mocks.createIodCase(...args),
  updateIodCase: (...args: unknown[]) => mocks.updateIodCase(...args),
  downloadIodStatutoryPack: (...args: unknown[]) => mocks.downloadIodStatutoryPack(...args),
}));

import { OhIodVisitPanel } from "@/features/occupational-health/components/OhIodVisitPanel";

const CUSTOMER: Customer = {
  id: 42,
  uuid: "cust-1",
  tenant: 7,
  first_name: "Jane",
  middle_name: null,
  last_name: "Doe",
  full_name: "Jane Doe",
  customer_identifier: "C-001",
  internal_reference: "",
  phone_number: null,
  email: null,
  patient_uuid: "p-1",
  gender: "Female",
  dob: "1990-01-01",
  dob_is_estimated: false,
  age: 36,
  has_synced_to_openmrs: false,
  is_active: true,
  visit_status: "not_started",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  created_by: null,
};

const ENCOUNTER: OhVisitEncounter = {
  id: 9,
  uuid: "enc-1",
  visit: "visit-1",
  department: "dept",
  department_name: "Occupational Health",
  department_type: "occupational_health",
  location: null,
  location_name: null,
  clinician: null,
  clinician_name: "Dr OH",
  customer_name: "Jane Doe",
  customer_identifier: "C-001",
  first_name: "Jane",
  last_name: "Doe",
  employer_name: "Mine Co",
  hazard_profile_name: "Welding",
  status: "in_progress",
  billing_mode: null,
  started_at: null,
  ended_at: null,
  notes: "",
  is_active: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

function iodCase(over: Partial<IodCase> = {}): IodCase {
  return {
    id: 1,
    uuid: "iod-1",
    customer: 42,
    employment_episode: null,
    encounter: 9,
    she_reference: "SHE-1",
    severity: "moderate",
    lost_days: 2,
    status: "open",
    onset_date: "2026-11-10",
    mechanism: "slip",
    body_part: "right wrist",
    incident_location: "workshop",
    safety_classification: "medical_treatment",
    work_related: true,
    description: "Slipped on a wet floor.",
    created_at: "2026-11-10T08:00:00Z",
    updated_at: "2026-11-10T08:00:00Z",
    ...over,
  };
}

function renderWith(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("OhIodVisitPanel", () => {
  it("shows an empty state and opens a create form", async () => {
    const onRefresh = vi.fn();
    renderWith(
      <OhIodVisitPanel customer={CUSTOMER} encounter={ENCOUNTER} iodCases={[]} onRefresh={onRefresh} />,
    );
    expect(screen.getByTestId("oh-iod-visit-empty")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Open case" }));
    expect(screen.getByTestId("oh-iod-form")).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/Description/), { target: { value: "Cut on a blade" } });
    mocks.createIodCase.mockResolvedValue(iodCase());
    fireEvent.click(screen.getByRole("button", { name: "Open case" }));
    await waitFor(() => {
      expect(mocks.createIodCase).toHaveBeenCalledWith(
        expect.objectContaining({
          tenant: 7,
          customer: 42,
          customer_uuid: "cust-1",
          encounter: 9,
          description: "Cut on a blade",
          status: "open",
        }),
      );
    });
    expect(onRefresh).toHaveBeenCalled();
  });

  it("edits an existing case on this visit", async () => {
    const onRefresh = vi.fn();
    mocks.updateIodCase.mockResolvedValue(iodCase({ description: "Updated" }));
    renderWith(
      <OhIodVisitPanel
        customer={CUSTOMER}
        encounter={ENCOUNTER}
        iodCases={[iodCase()]}
        onRefresh={onRefresh}
      />,
    );
    expect(screen.getByTestId("oh-iod-visit-panel")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.getByTestId("oh-iod-form")).toBeTruthy();
    const description = screen.getByLabelText(/Description/) as HTMLTextAreaElement;
    expect(description.value).toBe("Slipped on a wet floor.");
    fireEvent.change(description, { target: { value: "Updated description" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => {
      expect(mocks.updateIodCase).toHaveBeenCalledWith(
        "iod-1",
        expect.objectContaining({ description: "Updated description" }),
      );
    });
    expect(onRefresh).toHaveBeenCalled();
  });
});
