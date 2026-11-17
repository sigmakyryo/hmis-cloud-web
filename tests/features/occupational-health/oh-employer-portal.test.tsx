import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EmployersAccessPage } from "@/features/employer-portal/admin/components/EmployersAccessPage";
import { PortalFitnessPage } from "@/app/employer-portal/_components/PortalFitnessPage";
import { PortalRequestsPage } from "@/app/employer-portal/_components/PortalRequestsPage";
import { PortalShell } from "@/app/employer-portal/_components/PortalShell";
import { isPortalOnlyUser } from "@/features/employer-portal/services/employer-portal.service";
import { BffError } from "@/lib/bff-client";
import { employerPortalAdminProxy, employerPortalProxy } from "@/lib/server/employer-portal-bff";

const mocks = vi.hoisted(() => ({
  me: vi.fn(),
  fitness: vi.fn(),
  requests: vi.fn(),
  createRequest: vi.fn(),
  staffRequests: vi.fn(),
  contacts: vi.fn(),
  invitations: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("@/lib/server/oh-service", () => ({ OH_SERVICE_URL: "http://ohs.test/api", ohServiceRequest: vi.fn() }));
vi.mock("@/lib/server/require-access-token", () => ({ requireAccessToken: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/employer-portal/fitness",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/providers/toast-provider", () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock("@/features/employer-portal/services/employer-portal.service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/employer-portal/services/employer-portal.service")>();
  return {
    ...actual,
    fetchPortalMe: (...a: unknown[]) => mocks.me(...a),
    fetchPortalFitness: (...a: unknown[]) => mocks.fitness(...a),
    fetchPortalRequests: (...a: unknown[]) => mocks.requests(...a),
    createPortalRequest: (...a: unknown[]) => mocks.createRequest(...a),
    fetchStaffPortalRequests: (...a: unknown[]) => mocks.staffRequests(...a),
    fetchPortalContacts: (...a: unknown[]) => mocks.contacts(...a),
    fetchPortalInvitations: (...a: unknown[]) => mocks.invitations(...a),
  };
});

function wrap(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

const fitness = {
  employer_name: "Acme",
  counts: { fit: 1, fit_with_restrictions: 0, not_fit: 1, awaiting: 0, due_soon: 1 },
  results: [
    { customer_uuid: "11111111-1111-4111-8111-111111111111", worker: "Ann Worker", employee_number: "E1", site: "North", department: "Ops", status: "not_fit", valid_until: null, due_soon: false },
    { customer_uuid: "22222222-2222-4222-8222-222222222222", worker: "Ben Worker", employee_number: "E2", site: "North", department: "Ops", status: "fit", valid_until: "2026-11-20", due_soon: true },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.me.mockResolvedValue({ name: "Casey", employer: { uuid: "e", name: "Acme" }, scopes: ["fitness", "requests"] });
  mocks.fitness.mockResolvedValue(fitness);
  mocks.requests.mockResolvedValue([]);
  mocks.createRequest.mockResolvedValue({ uuid: "r" });
  mocks.staffRequests.mockResolvedValue([]);
  mocks.contacts.mockResolvedValue([]);
  mocks.invitations.mockResolvedValue([]);
});
afterEach(() => cleanup());

describe("employer portal", () => {
  it("only lets employer contacts' paths through the BFF", () => {
    expect(employerPortalProxy.resolve("GET", ["fitness"])?.path).toBe("/oh-portal/fitness");
    expect(employerPortalProxy.resolve("POST", ["requests"])).not.toBeNull();
    expect(employerPortalProxy.resolve("GET", ["..", "oh-da", "tests"])).toBeNull();
    expect(employerPortalProxy.resolve("GET", ["oh-da", "tests"])).toBeNull();
    expect(employerPortalProxy.resolve("PATCH", ["requests"])).toBeNull();
    expect(employerPortalAdminProxy.resolve("PATCH", ["contacts", "33333333-3333-4333-8333-333333333333"])?.path).toBe(
      "/oh-portal-admin/contacts/33333333-3333-4333-8333-333333333333",
    );
  });

  it("knows who is an employer contact only", () => {
    expect(isPortalOnlyUser({ groups: ["OHEmployerPortal"], is_admin: false })).toBe(true);
    expect(isPortalOnlyUser({ groups: ["OHEmployerPortal", "OccupationalHealth"], is_admin: false })).toBe(false);
    expect(isPortalOnlyUser({ groups: ["OHEmployerPortal"], is_admin: true })).toBe(false);
    expect(isPortalOnlyUser({ groups: [], is_admin: false })).toBe(false);
  });

  it("shows the shell with only the pages the contact can see", async () => {
    wrap(
      <PortalShell>
        <p>child</p>
      </PortalShell>,
    );
    const nav = await screen.findByRole("navigation", { name: "Employer portal pages" });
    expect(within(nav).getByText("Fit for work")).toBeTruthy();
    expect(within(nav).getByText("Requests")).toBeTruthy();
    expect(within(nav).queryByText("Invoices")).toBeNull();
    expect(screen.getByText("Acme")).toBeTruthy();
  });

  it("explains when the login has no portal access", async () => {
    mocks.me.mockRejectedValue(new BffError("Forbidden", 403));
    wrap(
      <PortalShell>
        <p>child</p>
      </PortalShell>,
    );
    expect(await screen.findByTestId("employer-portal-no-access")).toBeTruthy();
    expect(screen.queryByText("child")).toBeNull();
  });

  it("lists fit status with no medical detail", async () => {
    wrap(<PortalFitnessPage />);
    const rows = await screen.findAllByTestId("employer-portal-worker");
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText("Not fit")).toBeTruthy();
    expect(within(rows[1]).getByText("Due soon")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Not fit/ }));
    await waitFor(() => expect(mocks.fitness).toHaveBeenLastCalledWith("not_fit", undefined));
  });

  it("sends a request for one of their workers", async () => {
    wrap(<PortalRequestsPage />);
    fireEvent.click(await screen.findByRole("button", { name: "New request" }));
    const sheet = await screen.findByTestId("employer-portal-new-request");
    await waitFor(() => expect(within(sheet).getAllByRole("option").length).toBeGreaterThan(7));
    const selects = within(sheet).getAllByRole("combobox");
    fireEvent.change(selects[0], { target: { value: "health_check" } });
    fireEvent.change(selects[1], { target: { value: "22222222-2222-4222-8222-222222222222" } });
    fireEvent.click(within(sheet).getByRole("button", { name: "Send request" }));
    await waitFor(() =>
      expect(mocks.createRequest).toHaveBeenCalledWith(
        expect.objectContaining({ kind: "health_check", customer_uuid: "22222222-2222-4222-8222-222222222222", worker_name: "Ben Worker" }),
      ),
    );
  });

  it("tells staff that only administrators manage employer logins", async () => {
    mocks.contacts.mockRejectedValue(new BffError("Forbidden", 403));
    wrap(<EmployersAccessPage />);
    expect(await screen.findByText("Only an administrator can manage employer logins.")).toBeTruthy();
  });
});
