import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/appointments/components/CreateAppointmentDialog", () => ({
  CreateAppointmentDialog: ({ open }: { open: boolean }) =>
    open ? (
      <div data-testid="create-appointment-dialog">Schedule dialog</div>
    ) : null,
}));

import { OpdEncounterWorkspaceProvider } from "@/features/clinical-opd/components/detail/opd-encounter-workspace-context";
import type { OpdQueueEncounter } from "@/features/clinical-opd/types/clinical-opd.types";
import { TheatrePatientChip } from "@/features/clinical-theatre/components/TheatrePatientChip";
import type { Customer } from "@/features/customers/types/customer.types";

afterEach(() => {
  cleanup();
});

const customer: Customer = {
  id: 101,
  uuid: "cust-101",
  tenant: 1,
  first_name: "Ruth",
  middle_name: null,
  last_name: "Chulu",
  full_name: "Ruth Chulu",
  customer_identifier: "SIGMA-000015",
  internal_reference: "REF-001",
  phone_number: "+265991234567",
  email: "ruth.chulu@example.com",
  patient_uuid: "pat-101",
  gender: "Female",
  dob: "1990-06-12",
  dob_is_estimated: false,
  age: 36,
  has_synced_to_openmrs: false,
  is_active: true,
  visit_status: "active",
  created_at: "2026-01-10T08:00:00Z",
  updated_at: "2026-01-10T08:00:00Z",
  created_by: null,
};

const encounter: OpdQueueEncounter = {
  encounter_uuid: "enc-1",
  visit_uuid: "visit-1",
  visit_status: "active",
  customer_uuid: "cust-101",
  customer_name: "Ruth Chulu",
  customer_identifier: "SIGMA-000015",
  department_name: "Theatre",
  clinic_name: "Factory Clinic",
  status: "waiting",
  started_at: null,
  mode_of_payment: "cash",
  insurance_scheme_name: null,
  queue_stage: "registered",
  waiting_minutes: 411,
};

function wrap(
  node: ReactNode,
  value?: Partial<Parameters<typeof OpdEncounterWorkspaceProvider>[0]["value"]>,
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <OpdEncounterWorkspaceProvider
        value={{
          visitUuid: "visit-1",
          encounterUuid: "enc-1",
          encounter,
          customer,
          capabilities: [],
          visibleTabIds: [],
          userRole: "physician",
          chartSummary: null,
          isChartLocked: false,
          ...value,
        }}
      >
        {node}
      </OpdEncounterWorkspaceProvider>
    </QueryClientProvider>,
  );
}

describe("TheatrePatientChip", () => {
  it("shows a compact identity chip instead of a full patient header", () => {
    wrap(<TheatrePatientChip />);

    const chip = screen.getByTestId("theatre-patient-chip");
    expect(chip).toHaveTextContent("Ruth Chulu");
    expect(chip).toHaveTextContent("SIGMA-000015");
    expect(chip).toHaveTextContent(/36y/);
    expect(chip).toHaveTextContent("F");
    expect(chip).toHaveTextContent("Waiting");

    // Visit meta stays out of the permanent chrome.
    expect(screen.queryByTestId("opd-encounter-fact-department")).toBeNull();
    expect(screen.queryByTestId("opd-encounter-fact-payment")).toBeNull();
    expect(screen.queryByTestId("opd-encounter-schedule-button")).toBeNull();
    expect(screen.queryByTestId("opd-encounter-header")).toBeNull();
  });

  it("opens a side sheet with visit facts and the Schedule action", () => {
    wrap(<TheatrePatientChip />);

    fireEvent.click(screen.getByTestId("theatre-patient-chip"));

    expect(screen.getByTestId("theatre-patient-sheet")).toBeTruthy();
    expect(
      screen.getByTestId("opd-encounter-fact-department"),
    ).toHaveTextContent("Theatre");
    expect(screen.getByTestId("opd-encounter-fact-clinic")).toHaveTextContent(
      "Factory Clinic",
    );
    expect(
      screen.getByTestId("opd-encounter-fact-queue-stage"),
    ).toHaveTextContent("Registered");
    expect(screen.getByTestId("opd-encounter-fact-waiting")).toHaveTextContent(
      "6 hr 51 min",
    );
    expect(screen.getByTestId("opd-encounter-fact-started")).toHaveTextContent(
      "Not started",
    );
    expect(screen.getByTestId("opd-encounter-fact-payment")).toHaveTextContent(
      "Cash",
    );

    fireEvent.click(screen.getByTestId("opd-encounter-schedule-button"));
    expect(screen.getByTestId("create-appointment-dialog")).toBeTruthy();
  });

  it("falls back to the theatre case name before the customer record loads", () => {
    wrap(<TheatrePatientChip fallbackName="Ada Patient" />, {
      customer: null,
      encounter: null,
    });

    expect(screen.getByTestId("theatre-patient-chip")).toHaveTextContent(
      "Ada Patient",
    );
    expect(screen.queryByTestId("opd-encounter-schedule-button")).toBeNull();
  });
});
