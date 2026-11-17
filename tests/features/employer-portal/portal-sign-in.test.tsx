import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PortalSignIn, PortalWorkspaceSignIn } from "@/features/employer-portal/components/PortalSignIn";
import { PortalPublicError } from "@/features/employer-portal/services/employer-portal-public.service";
import { ROUTES } from "@/constants/routes";

const portal = vi.hoisted(() => ({
  signInToPortal: vi.fn(),
  fetchPublicBranding: vi.fn(async () => null),
  fetchWorkspace: vi.fn(),
}));
const push = vi.hoisted(() => vi.fn());

vi.mock("@/features/employer-portal/services/employer-portal-public.service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/employer-portal/services/employer-portal-public.service")>();
  return { ...actual, ...portal };
});
vi.mock("@/features/auth/services/auth.service", () => ({
  requestSigninOtp: vi.fn(),
  verifySignin: vi.fn(),
  logout: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
}));

afterEach(cleanup);

describe("portal sign-in", () => {
  beforeEach(() => {
    portal.signInToPortal.mockReset();
    push.mockReset();
  });

  it("signs in with the company portal password and not the clinic login", async () => {
    const auth = await import("@/features/auth/services/auth.service");
    portal.signInToPortal.mockResolvedValue({ email: "casey@acme.test", name: "Casey" });

    render(<PortalSignIn org="" />);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "casey@acme.test" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "Long-enough-1" } });
    fireEvent.click(screen.getByRole("button", { name: "Login" }));

    await waitFor(() => expect(portal.signInToPortal).toHaveBeenCalledWith({ email: "casey@acme.test", password: "Long-enough-1" }));
    expect(auth.requestSigninOtp).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith(ROUTES.employerPortal);
  });
});

describe("portal sign-in on a workspace address", () => {
  beforeEach(() => {
    portal.signInToPortal.mockReset();
    push.mockReset();
  });

  it("scopes the sign-in to the workspace clinic and lands inside that workspace", async () => {
    portal.signInToPortal.mockResolvedValue({ email: "casey@acme.test", workspace: "sigma-clinic-12" });

    render(<PortalSignIn workspace="sigma-clinic-12" tenantUuid="tenant-uuid-12" organisation="Sigma Clinic" />);
    expect(screen.getByText("Sign in to Sigma Clinic")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "casey@acme.test" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "Long-enough-1" } });
    fireEvent.click(screen.getByRole("button", { name: "Login" }));

    await waitFor(() =>
      expect(portal.signInToPortal).toHaveBeenCalledWith({
        email: "casey@acme.test",
        password: "Long-enough-1",
        tenant_uuid: "tenant-uuid-12",
      }),
    );
    expect(push).toHaveBeenCalledWith("/portal/sigma-clinic-12/fitness");
  });
});

describe("workspace address lookup", () => {
  beforeEach(() => {
    portal.signInToPortal.mockReset();
    portal.fetchWorkspace.mockReset();
    push.mockReset();
  });

  it("still lets people sign in when the OH service predates company addresses", async () => {
    portal.fetchWorkspace.mockRejectedValue(new PortalPublicError("The route api/oh-portal-public/workspaces/sigma-1 could not be found.", 404));
    portal.signInToPortal.mockResolvedValue({ email: "casey@acme.test" });

    render(<PortalWorkspaceSignIn workspace="sigma-1" />);
    expect(await screen.findByText("Sign in to Sigma")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "casey@acme.test" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "Long-enough-1" } });
    fireEvent.click(screen.getByRole("button", { name: "Login" }));

    await waitFor(() => expect(portal.signInToPortal).toHaveBeenCalledWith({ email: "casey@acme.test", password: "Long-enough-1" }));
    expect(push).toHaveBeenCalledWith(ROUTES.employerPortal);
  });

  it("shows the error for an address that does not exist", async () => {
    portal.fetchWorkspace.mockRejectedValue(new PortalPublicError("Organisation not found.", 404));
    render(<PortalWorkspaceSignIn workspace="nope-9" />);
    expect(await screen.findByText("Organisation not found.")).toBeTruthy();
    expect(screen.queryByLabelText("Email")).toBeNull();
  });
});

describe("sign-in loading state", () => {
  beforeEach(() => {
    portal.signInToPortal.mockReset();
    push.mockReset();
  });

  it("locks the form and keeps the button busy until the portal opens", async () => {
    portal.signInToPortal.mockResolvedValue({ email: "casey@acme.test" });
    render(<PortalSignIn org="" />);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "casey@acme.test" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "Long-enough-1" } });
    fireEvent.click(screen.getByRole("button", { name: "Login" }));

    const busy = await screen.findByRole("button", { name: "Opening your portal…" });
    expect((busy as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByLabelText("Email").matches(":disabled")).toBe(true);
    expect(push).toHaveBeenCalledTimes(1);
  });

  it("unlocks the form when the sign-in fails", async () => {
    portal.signInToPortal.mockRejectedValue(new Error("Wrong email or password."));
    render(<PortalSignIn org="" />);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "casey@acme.test" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "nope" } });
    fireEvent.click(screen.getByRole("button", { name: "Login" }));

    expect(await screen.findByText("Wrong email or password.")).toBeTruthy();
    expect(screen.getByLabelText("Email").matches(":disabled")).toBe(false);
    expect((screen.getByRole("button", { name: "Login" }) as HTMLButtonElement).disabled).toBe(false);
  });
});

describe("sign-in logo", () => {
  it("uses the organisation logo and lets the portal's own logo win", async () => {
    const { container, unmount } = render(<PortalSignIn workspace="sigma-1" tenantUuid="t" organisation="Sigma" logoUrl="https://cdn.example.com/org.png" />);
    expect(container.querySelector("img")?.getAttribute("src")).toBe("https://cdn.example.com/org.png");
    unmount();

    portal.fetchPublicBranding.mockResolvedValueOnce({ display_name: "", accent_color: "#0cd410", logo_data_uri: "data:image/png;base64,AAAA", welcome_text: "", support_email: "" } as never);
    const second = render(<PortalSignIn workspace="sigma-1" tenantUuid="t" organisation="Sigma" logoUrl="https://cdn.example.com/org.png" />);
    await waitFor(() => expect(second.container.querySelector("img")?.getAttribute("src")).toBe("data:image/png;base64,AAAA"));
  });
});
