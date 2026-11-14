import { ToastProvider } from "@/providers/toast-provider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { OhEmployeeFormsTab } from "@/features/occupational-health/components/OhEmployeeFormsTab";

vi.mock("@/features/occupational-health/services/oh.service", () => ({
  fetchOhEmployeeFormResponses: vi.fn(async () => []),
  fetchOhHazardProfiles: vi.fn(async () => [
    {
      id: 4,
      uuid: "profile-1",
      name: "Warehouse",
      code: "WH",
      employer: 2,
      employer_uuid: "employer-1",
      employee_form_template: null,
      employee_form_template_name: null,
    },
  ]),
  fetchClinicalForms: vi.fn(async () => []),
  fetchOhEmployeeFormTemplates: vi.fn(async () => []),
  fetchOhExamTemplates: vi.fn(async () => []),
  fetchOhCofTemplates: vi.fn(async () => []),
  openOhEmployeeForm: vi.fn(),
  patchOhEmployeeFormResponses: vi.fn(),
  createOhEmployeeFormInvite: vi.fn(),
  uploadOhEmployeeFormDocument: vi.fn(),
  fetchOhEncounters: vi.fn(async () => []),
  fetchOhExaminations: vi.fn(async () => []),
  fetchOhCofResponses: vi.fn(async () => []),
}));

afterEach(() => {
  cleanup();
});

describe("employee form setup empty state", () => {
  it("links to the risk profile sheet when the profile has no employee form", async () => {
    render(
      <ToastProvider>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <OhEmployeeFormsTab
          customerUuid="customer-1"
          employerId={2}
          employerUuid="employer-1"
          employerName="Test"
          hazardProfileId={4}
        />
      </QueryClientProvider>
      </ToastProvider>,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Fill" }));
    expect(await screen.findByTestId("oh-employee-form-setup-empty")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Set up the risk profile" })).toHaveAttribute(
      "href",
      "/settings/modules/occupational-health?employer=employer-1&profile=profile-1",
    );
    expect(screen.queryByRole("button", { name: "Open form" })).toBeNull();
  });

  it("gives employment and employer settings their own actions when both are missing", async () => {
    const service = await import("@/features/occupational-health/services/oh.service");
    vi.mocked(service.fetchOhHazardProfiles).mockResolvedValueOnce([]);
    render(
      <ToastProvider>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <OhEmployeeFormsTab
          customerUuid="3077af73-dd86-4163-bf1f-50d6836d624e"
          employerId={2}
          employerUuid="employer-1"
          employerName="test"
          hazardProfileId={null}
        />
      </QueryClientProvider>
      </ToastProvider>,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Fill" }));
    expect(await screen.findByRole("link", { name: "Assign a risk profile" })).toHaveAttribute(
      "href",
      "/customers/3077af73-dd86-4163-bf1f-50d6836d624e/employment?sheet=edit",
    );
    expect(screen.getByRole("link", { name: "Add a risk profile" })).toHaveAttribute(
      "href",
      "/settings/modules/occupational-health?employer=employer-1&profile=new",
    );
    expect(screen.queryByText(/does not have an employee form yet/)).toBeNull();
  });
});
