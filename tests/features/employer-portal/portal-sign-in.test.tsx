import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PortalSignIn } from "@/features/employer-portal/components/PortalSignIn";
import { ROUTES } from "@/constants/routes";

const portal = vi.hoisted(() => ({
  signInToPortal: vi.fn(),
  fetchPublicBranding: vi.fn(async () => null),
}));
const push = vi.hoisted(() => vi.fn());

vi.mock("@/features/employer-portal/services/employer-portal-public.service", () => portal);
vi.mock("@/features/auth/services/auth.service", () => ({
  requestSigninOtp: vi.fn(),
  verifySignin: vi.fn(),
  logout: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

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
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(portal.signInToPortal).toHaveBeenCalledWith({ email: "casey@acme.test", password: "Long-enough-1" }));
    expect(auth.requestSigninOtp).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith(ROUTES.employerPortal);
  });
});
