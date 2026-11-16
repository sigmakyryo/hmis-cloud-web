import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PortalSignIn } from "@/features/employer-portal/components/PortalSignIn";

const auth = vi.hoisted(() => ({
  requestSigninOtp: vi.fn(),
  verifySignin: vi.fn(),
  verifySigninTotp: vi.fn(),
  logout: vi.fn(),
  markAuthenticatedSession: vi.fn(),
}));

vi.mock("@/features/auth/services/auth.service", () => auth);
vi.mock("@/features/employer-portal/services/employer-portal-public.service", () => ({
  fetchPublicBranding: vi.fn(async () => null),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe("portal sign-in", () => {
  beforeEach(() => {
    auth.requestSigninOtp.mockReset();
    auth.verifySignin.mockReset();
    auth.logout.mockReset();
    auth.logout.mockResolvedValue(undefined);
  });

  it("refuses a clinic account after the password is accepted", async () => {
    auth.requestSigninOtp.mockResolvedValue({
      pending_mfa_token: "token",
      methods: ["email"],
      preferred_method: "email",
      email_otp_sent: true,
      detail: "sent",
    });
    auth.verifySignin.mockResolvedValue({
      user: { groups: ["OccupationalHealth"], is_admin: false },
    });

    render(<PortalSignIn org="" />);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "clinic@sigma.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "secret" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    fireEvent.change(await screen.findByLabelText("Email code"), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(await screen.findByText("This sign-in is for company contacts.")).toBeVisible();
    await waitFor(() => expect(auth.logout).toHaveBeenCalled());
  });
});
