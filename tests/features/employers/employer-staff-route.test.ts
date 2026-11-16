import { describe, expect, it, vi } from "vitest";

const redirect = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  redirect,
}));

describe("the old occupational health employer portal address", () => {
  it("redirects to /employers", async () => {
    const { default: Page } = await import(
      "@/app/(app)/occupational-health/employer-portal/page"
    );
    Page();
    expect(redirect).toHaveBeenCalledWith("/employers");
  });
});
