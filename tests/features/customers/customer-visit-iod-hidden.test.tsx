import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { UseFormReturn } from "react-hook-form";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { CustomerVisitDialog } from "@/features/customers/components/detail/CustomerVisitDialog";
import type { Customer } from "@/features/customers/types/customer.types";
import type { StartVisitFormValues } from "@/features/visits/schemas/start-visit.schema";

const mocks = vi.hoisted(() => ({ offeredTypes: vi.fn(), toast: vi.fn(), user: { primary_clinic: { id: 1, name: "Test clinic" } } }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));
vi.mock("@/features/occupational-health/services/native-visit.service", () => ({ createNativeOhVisit: vi.fn() }));
// A stable object: the dialog reloads its context whenever the user object changes identity.
vi.mock("@/providers/user-provider", () => ({ useUser: () => ({ userData: mocks.user }) }));
vi.mock("@/providers/toast-provider", () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock("@/features/occupational-health/services/visit-eligibility.service", () => ({
  fetchOhVisitEligibility: vi.fn().mockResolvedValue({ eligible: true, code: "eligible", templates: { cof: null, exam: null } }),
}));
vi.mock("@/features/occupational-health/services/oh.service", () => ({
  fetchOhVisitTypes: vi.fn(async () => [
    { uuid: "t-1", code: "pre_employment", name: "Pre-employment", description: "", is_default: false, forms: [] },
    { uuid: "t-2", code: "injury_on_duty", name: "Injury on Duty", description: "", is_default: false, forms: [] },
    { uuid: "t-3", code: "periodic", name: "Periodic", description: "", is_default: true, forms: [] },
  ]),
}));
vi.mock("@/features/clinical/services/clinical-catalog.service", () => ({
  fetchClinicalClinics: vi.fn().mockResolvedValue([{ id: 1, uuid: "clinic" }]),
  fetchClinicalDepartments: vi.fn().mockResolvedValue([{ id: 1, uuid: "department", department_type: "occupational_health" }]),
}));
vi.mock("@/features/customers/services/customer-insurance.service", () => ({ fetchCustomerInsurance: vi.fn().mockResolvedValue([]) }));
vi.mock("@/features/customers/services/customer-visits.service", () => ({
  fetchCustomerVisits: vi.fn().mockResolvedValue([]),
  findActiveCustomerVisit: () => null,
  createCustomerVisit: vi.fn(),
  closeCustomerVisit: vi.fn(),
  fetchVisit: vi.fn(),
}));
vi.mock("@/features/visits/services/consultation-services.service", () => ({
  fetchDepartmentConsultationServices: vi.fn().mockResolvedValue([]),
}));
vi.mock("@/features/customers/components/detail/CustomerVisitSheetHeader", () => ({
  CustomerVisitSheetHeader: () => (
    <>
      <SheetTitle>Start visit</SheetTitle>
      <SheetDescription>Test visit</SheetDescription>
    </>
  ),
}));
vi.mock("@/features/visits/components/StartVisitFormFields", () => ({
  StartVisitFormFields: ({ visitTypes, form }: { visitTypes?: Array<{ name: string }>; form: UseFormReturn<StartVisitFormValues> }) => {
    mocks.offeredTypes(visitTypes?.map((type) => type.name) ?? []);
    return (
      <button type="button" onClick={() => form.setValue("department", "department")}>
        Select OH
      </button>
    );
  },
}));

const customer = { uuid: "customer-a", first_name: "Test", last_name: "Customer", dob: null } as Customer;

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

it("does not offer Injury on Duty as a visit service for the OH department", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  render(
    <QueryClientProvider client={client}>
      <CustomerVisitDialog customer={customer} open onOpenChange={vi.fn()} onVisitChanged={vi.fn()} />
    </QueryClientProvider>,
  );

  fireEvent.click(await screen.findByRole("button", { name: "Select OH" }));

  await waitFor(() => expect(mocks.offeredTypes).toHaveBeenLastCalledWith(["Pre-employment", "Periodic"]));
  for (const call of mocks.offeredTypes.mock.calls) {
    expect(call[0]).not.toContain("Injury on Duty");
  }
});
