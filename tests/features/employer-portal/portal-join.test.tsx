import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PortalJoinForm } from "@/features/employer-portal/components/PortalJoinForm";

const portal = vi.hoisted(() => ({
  fetchInvitation: vi.fn(),
  acceptInvitation: vi.fn(),
  fetchWorkspace: vi.fn(),
}));
const router = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn() }));

vi.mock("@/features/employer-portal/services/employer-portal-public.service", () => portal);
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const invite = {
  email: "casey@acme.test",
  name: "Casey",
  employer_name: "Acme",
  organisation: "Sigma Clinic",
  workspace: "sigma-clinic-12",
  expires_at: "2026-12-01T00:00:00Z",
  branding: null,
};

describe("portal join", () => {
  beforeEach(() => {
    portal.fetchInvitation.mockReset();
    portal.acceptInvitation.mockReset();
    portal.fetchWorkspace.mockReset();
    portal.fetchWorkspace.mockResolvedValue({ id: 12, uuid: "t", name: "Sigma Clinic", key: "sigma-clinic-12", logo_url: "https://cdn.example.com/logo.png" });
    router.replace.mockReset();
  });

  it("moves a legacy invitation link onto the workspace address", async () => {
    portal.fetchInvitation.mockResolvedValue(invite);
    render(<PortalJoinForm token="tok 1" />);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/portal/sigma-clinic-12/join?token=tok%201"));
  });

  it("rejects mismatched passwords and creates the login otherwise", async () => {
    portal.fetchInvitation.mockResolvedValue(invite);
    portal.acceptInvitation.mockResolvedValue({ email: invite.email });
    render(<PortalJoinForm token="tok" workspace="sigma-clinic-12" />);

    await screen.findByDisplayValue("casey@acme.test");
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "Long-enough-1" } });
    fireEvent.change(screen.getByLabelText("Repeat password"), { target: { value: "different-pass" } });
    fireEvent.click(screen.getByRole("button", { name: "Create my login" }));
    expect((await screen.findByRole("alert")).textContent).toContain("do not match");
    expect(portal.acceptInvitation).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Repeat password"), { target: { value: "Long-enough-1" } });
    fireEvent.click(screen.getByRole("button", { name: "Create my login" }));
    await waitFor(() => expect(portal.acceptInvitation).toHaveBeenCalledWith({ token: "tok", name: "Casey", password: "Long-enough-1" }));
    const link = await screen.findByRole("link", { name: "Go to sign in" });
    expect(link.getAttribute("href")).toBe("/portal/sigma-clinic-12");
  });

  it("shows the organisation logo from Settings on the invitation card", async () => {
    portal.fetchInvitation.mockResolvedValue(invite);
    const { container } = render(<PortalJoinForm token="tok" workspace="sigma-clinic-12" />);
    await screen.findByDisplayValue("casey@acme.test");
    await waitFor(() => expect(container.querySelector("img")?.getAttribute("src")).toBe("https://cdn.example.com/logo.png"));
  });

  it("still opens the invitation when the logo lookup fails", async () => {
    portal.fetchInvitation.mockResolvedValue(invite);
    portal.fetchWorkspace.mockRejectedValue(new Error("no route"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    render(<PortalJoinForm token="tok" workspace="sigma-clinic-12" />);
    expect(await screen.findByDisplayValue("casey@acme.test")).toBeTruthy();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
