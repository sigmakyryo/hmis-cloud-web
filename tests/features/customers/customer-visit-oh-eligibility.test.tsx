import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { UseFormReturn } from "react-hook-form";
import type { StartVisitFormValues } from "@/features/visits/schemas/start-visit.schema";
import type { ReactNode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { CustomerVisitDialog } from "@/features/customers/components/detail/CustomerVisitDialog";
import type { Customer } from "@/features/customers/types/customer.types";
import { BffError } from "@/lib/bff-client";

const mocks = vi.hoisted(() => ({
  eligibility: vi.fn(), create: vi.fn(), native: vi.fn(), toast: vi.fn(), departments: vi.fn(),
  user: { primary_clinic: { id: 1, name: "Test clinic" } },
}));
vi.mock("@/features/occupational-health/services/native-visit.service", () => ({ createNativeOhVisit: mocks.native }));
vi.mock("@/providers/user-provider", () => ({ useUser: () => ({ userData: mocks.user }) }));
vi.mock("@/providers/toast-provider", () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock("@/features/occupational-health/services/visit-eligibility.service", () => ({ fetchOhVisitEligibility: mocks.eligibility }));
vi.mock("@/features/occupational-health/services/oh.service", () => ({
  fetchOhVisitTypes: vi.fn(async () => [{ uuid: "type-1", code: "periodic", name: "Periodic", description: "", is_default: true, forms: [] }]),
}));
vi.mock("@/features/clinical/services/clinical-catalog.service", () => ({
  fetchClinicalClinics: vi.fn().mockResolvedValue([{ id: 1, uuid: "clinic" }]),
  fetchClinicalDepartments: mocks.departments,
}));
vi.mock("@/features/customers/services/customer-insurance.service", () => ({ fetchCustomerInsurance: vi.fn().mockResolvedValue([]) }));
vi.mock("@/features/customers/services/customer-visits.service", () => ({
  fetchCustomerVisits: vi.fn().mockResolvedValue([]), findActiveCustomerVisit: () => null,
  createCustomerVisit: mocks.create, closeCustomerVisit: vi.fn(), fetchVisit: vi.fn(),
}));
vi.mock("@/features/visits/services/consultation-services.service", () => ({ fetchDepartmentConsultationServices: vi.fn().mockResolvedValue([]) }));
vi.mock("@/features/customers/components/detail/CustomerVisitSheetHeader", () => ({ CustomerVisitSheetHeader: () => <><SheetTitle>Start visit</SheetTitle><SheetDescription>Test visit</SheetDescription></> }));
vi.mock("@/features/visits/components/StartVisitFormFields", () => ({
  StartVisitFormFields: ({ step, onStepChange, riskProfileNotice, form }: {
    step: "visit" | "payment" | "attachments";
    onStepChange: (step: "visit" | "payment" | "attachments") => void;
    riskProfileNotice?: ReactNode;
    form: UseFormReturn<StartVisitFormValues>;
  }) => <div>
    <p>Fields {step}</p>
    <button type="button" onClick={() => form.setValue("department", "opd")}>Select OPD</button>
    <button type="button" onClick={() => form.setValue("department", "department")}>Select OH</button>
    <button type="button" onClick={() => form.setValue("visit_type", "type-1")}>Select type</button>
    {riskProfileNotice}
    <button type="button" onClick={() => onStepChange("payment")}>Payment step</button>
    <button type="button" onClick={() => onStepChange("attachments")}>Attachments step</button>
  </div>,
}));
const customer = { uuid: "customer-a", first_name: "Test", last_name: "Customer", dob: null } as Customer;
const ready = { eligible: true, code: "eligible", templates: { cof: null, exam: null } };
function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const changed = vi.fn();
  const element = (open: boolean, current = customer) => <QueryClientProvider client={client}><CustomerVisitDialog customer={current} open={open} onOpenChange={vi.fn()} onVisitChanged={changed} /></QueryClientProvider>;
  return { ...render(element(true)), element, changed };
}
afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  mocks.eligibility.mockReset().mockResolvedValue(ready);
  mocks.create.mockReset();
  mocks.native.mockReset().mockResolvedValue({ visit: "native-visit", uuid: "native-encounter", origin: "laravel" });
  mocks.departments.mockResolvedValue([{ id: 1, uuid: "department", department_type: "occupational_health" }]);
});

async function continueToOhPayment() {
  await waitFor(() => expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled());
  fireEvent.click(screen.getByRole("button", { name: "Select type" }));
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Start OH visit" })).toBeEnabled());
}

it("shows retryable integration errors without replacing fields with a missing-risk warning", async () => {
  mocks.eligibility.mockRejectedValueOnce(new Error("Session service unavailable"));
  mount();
  expect(await screen.findByRole("alert")).toHaveTextContent("Session service unavailable");
  expect(screen.getByText("Fields visit")).toBeVisible();
  expect(screen.queryByTestId("oh-risk-profile-required")).toBeNull();
  expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Retry OH check" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled());
});

it("resets a missing-risk result on reopen through the authoritative endpoint", async () => {
  mocks.eligibility.mockResolvedValueOnce({ ...ready, eligible: false });
  const view = mount();
  expect(await screen.findByTestId("oh-risk-profile-required")).toBeVisible();
  view.rerender(view.element(false));
  view.rerender(view.element(true));
  await waitFor(() => expect(screen.queryByTestId("oh-risk-profile-required")).toBeNull());
  await waitFor(() => expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled());
});

it("fresh final eligibility failure prevents core visit writes", async () => {
  mocks.eligibility.mockResolvedValueOnce(ready).mockResolvedValue({ ...ready, eligible: false });
  mount();
  await continueToOhPayment();
  fireEvent.click(screen.getByRole("button", { name: "Start OH visit" }));
  expect(await screen.findByTestId("oh-risk-profile-required")).toBeVisible();
  expect(mocks.create).not.toHaveBeenCalled();
});

it("does not turn an ambiguous legacy referral rejection into missing-risk state or retry a write", async () => {
  mocks.native.mockRejectedValue(new BffError("Reference unavailable", 503));
  mount();
  await continueToOhPayment();
  fireEvent.click(screen.getByRole("button", { name: "Start OH visit" }));
  await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ description: expect.stringContaining("Reference unavailable") })));
  expect(screen.queryByTestId("oh-risk-profile-required")).toBeNull();
  expect(mocks.native).toHaveBeenCalledTimes(1);
  expect(mocks.create).not.toHaveBeenCalled();
});

it("keeps non-OH submission unchanged without an OH query", async () => {
  mocks.departments.mockResolvedValue([{ id: 1, uuid: "department", department_type: "opd" }]);
  mocks.create.mockResolvedValue({ uuid: "visit", encounters: [] });
  const view = mount();
  await screen.findByText("Fields visit");
  fireEvent.click(screen.getByRole("button", { name: "Attachments step" }));
  fireEvent.click(screen.getByRole("button", { name: "Start visit" }));
  await waitFor(() => expect(view.changed).toHaveBeenCalled());
  expect(mocks.eligibility).not.toHaveBeenCalled();
  expect(mocks.create).toHaveBeenCalledTimes(1);
});

it("prevents double submission while final eligibility is pending", async () => {
  mount();
  await continueToOhPayment();
  let resolve!: (value: typeof ready) => void;
  mocks.eligibility.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));

  const button = screen.getByRole("button", { name: "Start OH visit" });
  fireEvent.click(button); fireEvent.click(button);
  await waitFor(() => expect(mocks.eligibility).toHaveBeenCalledTimes(2));
  resolve(ready);
  await waitFor(() => expect(mocks.native).toHaveBeenCalledTimes(1));
});

it("ignores a previous customer's late eligibility result", async () => {
  let resolve!: (value: typeof ready) => void;
  mocks.eligibility.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
  const view = mount();
  await waitFor(() => expect(mocks.eligibility).toHaveBeenCalledWith("customer-a"));
  view.rerender(view.element(true, { ...customer, uuid: "customer-b" }));
  await waitFor(() => expect(mocks.eligibility).toHaveBeenCalledWith("customer-b"));
  await waitFor(() => expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled());
  resolve({ ...ready, eligible: false });
  await waitFor(() => expect(screen.queryByTestId("oh-risk-profile-required")).toBeNull());
  expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled();
});

it("automatically checks on OH selection with a spinner and no persistent refresh button", async () => {
  let resolve!: (value: typeof ready) => void;
  mocks.eligibility.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
  mount();
  expect(await screen.findByRole("status")).toHaveTextContent("Checking OH eligibility");
  expect(screen.getByRole("status").querySelector("svg.animate-spin")).not.toBeNull();
  expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
  expect(screen.queryByRole("button", { name: "Refresh OH check" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Retry OH check" })).toBeNull();
  resolve(ready);
  await waitFor(() => expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled());
  expect(screen.queryByRole("status")).toBeNull();
  expect(screen.queryByRole("button", { name: "Refresh OH check" })).toBeNull();
});

it("automatically rechecks when switching away and selecting OH again", async () => {
  mocks.departments.mockResolvedValue([
    { id: 1, uuid: "department", department_type: "occupational_health" },
    { id: 2, uuid: "opd", department_type: "opd" },
  ]);
  mount();
  await screen.findByText("Fields visit");
  expect(mocks.eligibility).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Select OH" }));
  await waitFor(() => expect(mocks.eligibility).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled());
  fireEvent.click(screen.getByRole("button", { name: "Select OPD" }));
  fireEvent.click(screen.getByRole("button", { name: "Select OH" }));
  await waitFor(() => expect(mocks.eligibility).toHaveBeenCalledTimes(2));
  expect(screen.queryByRole("button", { name: "Refresh OH check" })).toBeNull();
});

it("does not create the previous department after selection changes during the final check", async () => {
  mocks.departments.mockResolvedValue([
    { id: 1, uuid: "department", department_type: "occupational_health" },
    { id: 2, uuid: "opd", department_type: "opd" },
  ]);
  mount();
  await screen.findByText("Fields visit");
  fireEvent.click(screen.getByRole("button", { name: "Select OH" }));
  await waitFor(() => expect(mocks.eligibility).toHaveBeenCalledTimes(1));
  await continueToOhPayment();
  let resolve!: (value: typeof ready) => void;
  mocks.eligibility.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
  fireEvent.click(screen.getByRole("button", { name: "Start OH visit" }));
  await waitFor(() => expect(mocks.eligibility).toHaveBeenCalledTimes(2));
  fireEvent.click(screen.getByRole("button", { name: "Select OPD" }));
  resolve(ready);
  await waitFor(() => expect(screen.getByRole("button", { name: "Start visit" })).toBeEnabled());
  expect(mocks.create).not.toHaveBeenCalled();
});

it("creates OH through Laravel with payment and stays on the list (no workspace redirect)", async () => {
  mount();
  await continueToOhPayment();
  fireEvent.click(screen.getByRole("button", { name: "Start OH visit" }));
  await waitFor(() => expect(mocks.native).toHaveBeenCalledTimes(1));
  expect(mocks.create).not.toHaveBeenCalled();
  expect(mocks.native).toHaveBeenCalledWith(expect.objectContaining({
    customer_uuid: "customer-a",
    department_uuid: "department",
    clinic_uuid: "clinic",
    visit_type_uuid: "type-1",
    idempotency_key: expect.any(String),
    mode_of_payment: "cash",
    insurance_scheme: null,
  }));
  await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({
    variant: "success",
    title: "OH visit started",
  })));
});
