import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  bffRequest: vi.fn(),
  toast: vi.fn(),
  ohServiceRequest: vi.fn(),
  requireAccessToken: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/occupational-health",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));
vi.mock("@/providers/toast-provider", () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock("@/lib/bff-client", () => ({
  bffRequest: (...a: unknown[]) => mocks.bffRequest(...a),
  BffError: class extends Error {},
}));
vi.mock("@/lib/server/oh-service", () => ({
  OH_SERVICE_URL: "http://ohs.test/api",
  ohServiceRequest: (...args: unknown[]) => mocks.ohServiceRequest(...args),
}));
vi.mock("@/lib/server/require-access-token", () => ({ requireAccessToken: () => mocks.requireAccessToken() }));
vi.mock("@/lib/server/bff-response", () => ({
  bffSuccess: (data: unknown, status = 200) => Response.json(data, { status }),
  bffError: () => Response.json({ message: "error" }, { status: 500 }),
}));

import { OhSurveillanceRecallsCard } from "@/features/occupational-health/components/OhSurveillanceRecallsCard";
import { ohExtProxy } from "@/lib/server/oh-ext-bff";

const UUID = "0b7c3f9e-1d2a-4c5b-8e6f-7a8b9c0d1e2f";

export function renderWithClient(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireAccessToken.mockResolvedValue({ accessToken: "session-token" });
});
afterEach(() => cleanup());

describe("oh-ext BFF allowlist", () => {
  it("allows surveillance recall endpoints only", () => {
    expect(ohExtProxy.resolve("GET", ["oh", "surveillance", "recalls"])?.path).toBe("/oh/surveillance/recalls");
    expect(ohExtProxy.resolve("POST", ["oh", "surveillance", "recalls", UUID, "acknowledge"])).not.toBeNull();
    expect(ohExtProxy.resolve("POST", ["oh", "surveillance", "schedule"])).toBeNull();
    expect(ohExtProxy.resolve("GET", ["oh", "surveillance", ".."])).toBeNull();
  });
});

describe("surveillance recalls card", () => {
  it("lists open recalls, sends recalls now and acknowledges", async () => {
    mocks.bffRequest.mockImplementation(async (path: string, opts?: { method?: string }) => {
      if (path.includes("recalls/run")) return { in_app: 2, queued: 2, sent: 1, skipped: 1, failed: 0 };
      if (path.includes("acknowledge")) return {};
      if (opts?.method) return {};
      return [
        { uuid: UUID, customer_uuid: UUID, requirement_uuid: UUID, component_code: "AUDIO", exam_type: "periodic", stage: "overdue",
          channel: "in_app", status: "sent", to_address: "", subject: "", body: "", due_date: "2026-05-01", attempts: 0,
          sent_at: null, acknowledged_at: null, acknowledged_by: "", last_error: "", created_at: null },
      ];
    });
    renderWithClient(<OhSurveillanceRecallsCard />);
    expect(await screen.findByText(/AUDIO · periodic · due 2026-05-01/)).toBeTruthy();
    fireEvent.click(screen.getByText("Send recalls now"));
    await waitFor(() =>
      expect(mocks.bffRequest).toHaveBeenCalledWith("/api/occupational-health/oh-ext/oh/surveillance/recalls/run", {
        method: "POST",
        body: { within_days: 14, channels: ["email"] },
      }),
    );
    fireEvent.click(screen.getByText("Done"));
    await waitFor(() =>
      expect(mocks.bffRequest).toHaveBeenCalledWith(`/api/occupational-health/oh-ext/oh/surveillance/recalls/${UUID}/acknowledge`, {
        method: "POST",
        body: {},
      }),
    );
  });
});
