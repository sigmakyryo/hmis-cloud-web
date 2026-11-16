import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AccessSheet } from "@/features/employer-portal/admin/components/AccessSheet";

const mocks = vi.hoisted(() => ({ invite: vi.fn(), toast: vi.fn() }));

vi.mock("@/providers/toast-provider", () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock("@/features/occupational-health/services/oh.service", () => ({
  fetchOhEmployers: async () => [{ uuid: "emp-1", name: "Acme" }],
}));
vi.mock("@/features/customers/services/customers.service", () => ({ fetchCustomers: async () => ({ results: [] }) }));
vi.mock("@/features/employer-portal/services/employer-portal.service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/employer-portal/services/employer-portal.service")>();
  return { ...actual, invitePortalContact: (...args: unknown[]) => mocks.invite(...args) };
});

function renderSheet() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AccessSheet onClose={vi.fn()} />
    </QueryClientProvider>,
  );
}

describe("access sheet", () => {
  beforeEach(() => {
    mocks.invite.mockReset();
    mocks.toast.mockReset();
    mocks.invite.mockResolvedValue({ linked: false, invite: { email_sent: false }, accept_url: "http://x/portal/acme-1/join?token=t" });
  });
  afterEach(cleanup);

  it("first asks whether to invite or enter details", () => {
    renderSheet();
    expect(screen.getByRole("button", { name: /Invite by email/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Enter details/ })).toBeTruthy();
    expect(screen.queryByLabelText("Login email")).toBeNull();
  });

  it("invites by email without a name, password or billing accounts and shows the one-time link", async () => {
    renderSheet();
    fireEvent.click(screen.getByRole("button", { name: /Invite by email/ }));
    expect(screen.queryByLabelText("Name")).toBeNull();
    expect(screen.queryByLabelText(/password/i)).toBeNull();
    fireEvent.change(screen.getByLabelText("Login email"), { target: { value: "casey@acme.test" } });
    await waitFor(() => expect(screen.getAllByRole("option").length).toBeGreaterThan(1));
    fireEvent.change(screen.getByLabelText("Employer"), { target: { value: "emp-1" } });
    fireEvent.click(screen.getByRole("button", { name: "Send invitation" }));

    await waitFor(() =>
      expect(mocks.invite).toHaveBeenCalledWith({ email: "casey@acme.test", employer_uuid: "emp-1", scopes: ["fitness", "random_compliance"] }),
    );
    expect((await screen.findByTestId("oh-portal-contact-invite-link")).textContent).toContain("token=t");
  });

  it("enter details also sends the name", async () => {
    renderSheet();
    fireEvent.click(screen.getByRole("button", { name: /Enter details/ }));
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Casey" } });
    fireEvent.change(screen.getByLabelText("Login email"), { target: { value: "casey@acme.test" } });
    await waitFor(() => expect(screen.getAllByRole("option").length).toBeGreaterThan(1));
    fireEvent.change(screen.getByLabelText("Employer"), { target: { value: "emp-1" } });
    fireEvent.click(screen.getByRole("button", { name: "Send invitation" }));
    await waitFor(() => expect(mocks.invite).toHaveBeenCalledWith(expect.objectContaining({ name: "Casey", email: "casey@acme.test" })));
  });

  it("shows a message and sends nothing when the employer is missing", async () => {
    renderSheet();
    fireEvent.click(screen.getByRole("button", { name: /Invite by email/ }));
    fireEvent.change(screen.getByLabelText("Login email"), { target: { value: "casey@acme.test" } });
    fireEvent.click(screen.getByRole("button", { name: "Send invitation" }));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ variant: "error" })));
    expect(mocks.invite).not.toHaveBeenCalled();
  });
});
