import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PortalShell } from "@/app/employer-portal/_components/PortalShell";
import { pickPortalLogo } from "@/features/employer-portal/utils/portal-logo";

vi.mock("next/navigation", () => ({ usePathname: () => "/portal/sigma-12/fitness", useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/features/employer-portal/hooks/usePortalWorkspace", () => ({
  usePortalWorkspace: () => ({ data: { name: "Sigma Clinic", logo_url: "https://cdn.example.com/org.png" } }),
}));
vi.mock("@/features/employer-portal/services/employer-portal.service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/employer-portal/services/employer-portal.service")>();
  return {
    ...actual,
    fetchPortalMe: async () => ({ name: "Casey", employer: { uuid: "e", name: "Acme" }, scopes: ["fitness", "users"], branding: { display_name: "", accent_color: "", logo_data_uri: null } }),
  };
});

afterEach(cleanup);

describe("portal logo", () => {
  it("prefers the portal logo, then the organisation logo, and ignores unsafe addresses", () => {
    expect(pickPortalLogo("data:image/png;base64,AA", "https://x/y.png")).toBe("data:image/png;base64,AA");
    expect(pickPortalLogo(null, "https://x/y.png")).toBe("https://x/y.png");
    expect(pickPortalLogo("javascript:alert(1)", "")).toBeNull();
    expect(pickPortalLogo(undefined, undefined)).toBeNull();
  });

  it("shows the organisation logo and name in the sidebar header, and calls the users page Employees", async () => {
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <PortalShell workspace="sigma-12">
          <p>page</p>
        </PortalShell>
      </QueryClientProvider>,
    );
    const logo = await screen.findByTestId("employer-portal-logo");
    expect(logo.getAttribute("src")).toBe("https://cdn.example.com/org.png");
    expect(screen.getAllByText("Sigma Clinic").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "Employees" })).toBeTruthy();
    expect(screen.queryByText("Users")).toBeNull();
  });
});
