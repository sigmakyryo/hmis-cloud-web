import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PortalEmployeesPage } from "@/app/employer-portal/_components/PortalEmployeesPage";
import { employerPortalProxy } from "@/lib/server/employer-portal-bff";

const mocks = vi.hoisted(() => ({ employees: vi.fn(), users: vi.fn() }));

vi.mock("@/lib/server/oh-service", () => ({ OH_SERVICE_URL: "http://ohs.test/api", ohServiceRequest: vi.fn() }));
vi.mock("@/lib/server/require-access-token", () => ({ requireAccessToken: vi.fn() }));
vi.mock("@/features/employer-portal/services/employer-portal.service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/employer-portal/services/employer-portal.service")>();
  return {
    ...actual,
    fetchPortalEmployees: (...args: unknown[]) => mocks.employees(...args),
    fetchPortalUsers: (...args: unknown[]) => mocks.users(...args),
  };
});

const payload = {
  employer_name: "Acme",
  counts: { all: 2, active: 1, former: 1 },
  results: [
    { customer_uuid: "a", worker: "Ann Worker", employee_number: "E1", site: "North", department: "Ops", employment_type: "Permanent", start_date: "2026-01-01", status: "active" },
    { customer_uuid: "b", worker: "Ben Worker", employee_number: "E2", site: "South", department: "Yard", employment_type: "", start_date: null, status: "former" },
  ],
};

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <PortalEmployeesPage />
    </QueryClientProvider>,
  );
}

describe("portal employees", () => {
  beforeEach(() => {
    mocks.employees.mockReset().mockResolvedValue(payload);
    mocks.users.mockReset().mockResolvedValue([{ name: "Casey", email: "casey@acme.test", scopes: ["fitness", "users"] }]);
  });
  afterEach(cleanup);

  it("allows the employees path through the BFF and nothing broader", () => {
    expect(employerPortalProxy.resolve("GET", ["employees"])?.path).toBe("/oh-portal/employees");
    expect(employerPortalProxy.resolve("POST", ["employees"])).toBeNull();
    expect(employerPortalProxy.resolve("GET", ["employees", "..", "fitness"])).toBeNull();
  });

  it("lists the company's employees with their status", async () => {
    renderPage();
    const rows = await screen.findAllByTestId("employer-portal-employee");
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText("Ann Worker")).toBeTruthy();
    expect(within(rows[0]).getByText("Employed")).toBeTruthy();
    expect(within(rows[1]).getByText("Former")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Employees" })).toBeTruthy();
  });

  it("filters by employment status and by search", async () => {
    renderPage();
    await screen.findAllByTestId("employer-portal-employee");
    fireEvent.click(screen.getByRole("button", { name: /^Former/ }));
    await waitFor(() => expect(mocks.employees).toHaveBeenLastCalledWith("former", undefined));
    fireEvent.change(screen.getByLabelText("Search employees"), { target: { value: "E2" } });
    await waitFor(() => expect(mocks.employees).toHaveBeenLastCalledWith("former", "E2"));
  });

  it("still shows who can sign in under Portal logins", async () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Portal logins" }));
    const rows = await screen.findAllByTestId("employer-portal-user");
    expect(within(rows[0]).getByText("Casey")).toBeTruthy();
  });

  it("explains when there are no employees", async () => {
    mocks.employees.mockResolvedValue({ ...payload, counts: { all: 0, active: 0, former: 0 }, results: [] });
    renderPage();
    expect(await screen.findByText("No employees match this view.")).toBeTruthy();
  });
});
