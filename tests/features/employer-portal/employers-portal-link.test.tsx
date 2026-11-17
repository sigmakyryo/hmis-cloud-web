import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PortalLinkChip } from "@/features/employer-portal/admin/components/PortalLinkChip";
import { portalPath, portalWorkspaceSlug } from "@/features/employer-portal/admin/utils/portal-address";

const mocks = vi.hoisted(() => ({ toast: vi.fn(), user: { current: null as unknown } }));

vi.mock("@/providers/toast-provider", () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock("@/providers/user-provider", () => ({ useUser: () => ({ userData: mocks.user.current }) }));

describe("portal address", () => {
  it("builds the workspace path from the organisation name and id", () => {
    expect(portalPath("Sigma Clinic & Labs", 12)).toBe("/portal/sigma-clinic-labs-12");
    expect(portalWorkspaceSlug("   ")).toBe("workspace");
  });
});

describe("portal link chip", () => {
  const writeText = vi.fn();
  beforeEach(() => {
    mocks.toast.mockReset();
    writeText.mockReset().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    mocks.user.current = { tenant: { id: 12, name: "Sigma Clinic" } };
  });
  afterEach(cleanup);

  it("opens the portal in a new tab", () => {
    render(<PortalLinkChip />);
    const link = screen.getByRole("link", { name: /portal/i });
    expect(link.getAttribute("href")).toBe("/portal/sigma-clinic-12");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
  });

  it("copies the full address", async () => {
    render(<PortalLinkChip />);
    fireEvent.click(screen.getByRole("button", { name: "Copy portal link" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/portal/sigma-clinic-12`));
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ variant: "success" }));
  });

  it("renders nothing without a tenant", () => {
    mocks.user.current = { tenant: null };
    render(<PortalLinkChip />);
    expect(screen.queryByTestId("employers-portal-link")).toBeNull();
  });
});
