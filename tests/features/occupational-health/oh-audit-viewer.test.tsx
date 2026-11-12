import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ search: vi.fn(), history: vi.fn() }));

vi.mock("@/lib/server/oh-service", () => ({ OH_SERVICE_URL: "http://ohs.test/api", ohServiceRequest: vi.fn() }));
vi.mock("@/lib/server/require-access-token", () => ({ requireAccessToken: vi.fn() }));
vi.mock("@/features/occupational-health/services/fitness.service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/occupational-health/services/fitness.service")>();
  return {
    ...actual,
    searchOhAudit: (...a: unknown[]) => mocks.search(...a),
    fetchOhAuditHistory: (...a: unknown[]) => mocks.history(...a),
  };
});

import { OhAuditPage } from "@/features/occupational-health/pages/OhAuditPage";
import { ohAuditCsvUrl } from "@/features/occupational-health/services/fitness.service";
import { fitnessAuditProxy } from "@/lib/server/fitness-bff";

const REC = "0b7c3f9e-1d2a-4c5b-8e6f-7a8b9c0d1e2f";
const row = (over: Record<string, unknown>) => ({
  uuid: "u1",
  module: "drug_alcohol",
  entity_type: "test",
  entity_uuid: REC,
  action: "verified",
  actor_type: "user",
  actor_name: "AL",
  summary: "MRO verified",
  meta: { changed: ["result"] },
  occurred_at: "2026-11-10T08:00:00+02:00",
  ...over,
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <OhAuditPage />
    </QueryClientProvider>,
  );
}

describe("OH audit viewer", () => {
  it("lists entries, applies filters and opens one record's history", async () => {
    mocks.search.mockResolvedValue({ results: [row({})], modules: ["fitness", "drug_alcohol"], truncated: false });
    mocks.history.mockResolvedValue([row({ action: "collected", uuid: "u0" }), row({})]);
    renderPage();
    expect(await screen.findByText("test · verified")).toBeTruthy();
    expect(screen.getByText("Changed: result")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Module"), { target: { value: "drug_alcohol" } });
    fireEvent.change(screen.getByLabelText("From"), { target: { value: "2026-11-01" } });
    fireEvent.click(screen.getByText("Apply"));
    await waitFor(() => expect(mocks.search).toHaveBeenLastCalledWith({ module: "drug_alcohol", from: "2026-11-01" }));

    fireEvent.click(await screen.findByRole("button", { name: "History" }));
    expect(await screen.findByText("collected · test")).toBeTruthy();
    expect(mocks.history).toHaveBeenCalledWith(REC);
  });

  it("explains a 403 to non-administrators", async () => {
    const { BffError } = await import("@/lib/bff-client");
    mocks.search.mockRejectedValue(new BffError("no", 403));
    renderPage();
    expect(await screen.findByText(/Only an administrator/)).toBeTruthy();
  });

  it("proxies only the read-only audit endpoints with allowlisted filters", () => {
    expect(fitnessAuditProxy.resolve("GET", ["oh-audit", "history", REC])?.path).toBe(`/oh-audit/history/${REC}`);
    expect(fitnessAuditProxy.resolve("GET", ["oh-audit", "csv"])?.binary?.type).toContain("text/csv");
    expect(fitnessAuditProxy.resolve("POST", ["oh-audit"])).toBeNull();
    const q = fitnessAuditProxy.query(new Request("http://w.test/x?module=fitness&from=2026-01-01&evil=1"));
    expect(q).toBe("?module=fitness&from=2026-01-01");
    expect(ohAuditCsvUrl({ module: "portal", q: " " })).toBe("/api/occupational-health/audit/oh-audit/csv?module=portal");
  });
});
