import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetchDsrs: vi.fn(),
  anonymiseDsr: vi.fn(),
  decideDsr: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("@/lib/server/oh-service", () => ({ OH_SERVICE_URL: "http://ohs.test/api", ohServiceRequest: vi.fn() }));
vi.mock("@/lib/server/require-access-token", () => ({ requireAccessToken: vi.fn() }));
vi.mock("@/providers/toast-provider", () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock("@/features/occupational-health/services/oh-privacy.service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/occupational-health/services/oh-privacy.service")>();
  return {
    ...actual,
    fetchDsrs: (...a: unknown[]) => mocks.fetchDsrs(...a),
    anonymiseDsr: (...a: unknown[]) => mocks.anonymiseDsr(...a),
    decideDsr: (...a: unknown[]) => mocks.decideDsr(...a),
  };
});

import { OhPrivacyPage } from "@/features/occupational-health/pages/OhPrivacyPage";
import { ohPrivacyProxy } from "@/lib/server/oh-privacy-bff";

const ID = "0b7c3f9e-1d2a-4c5b-8e6f-7a8b9c0d1e2f";
const dsr = (over: Record<string, unknown>) => ({
  uuid: ID,
  customer_uuid: ID,
  kind: "erasure",
  status: "approved",
  channel: "in_person",
  details: "Please erase",
  identity_check: "ID seen",
  due_on: "2026-12-10",
  requested_by_name: "AL",
  decided_by_name: "BK",
  decided_at: null,
  decision_note: "",
  completed_at: null,
  result: null,
  created_at: "2026-11-10T08:00:00+02:00",
  overdue: false,
  ...over,
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <OhPrivacyPage />
    </QueryClientProvider>,
  );

describe("OH privacy page", () => {
  it("previews anonymisation and only applies after typing ANONYMISE", async () => {
    mocks.fetchDsrs.mockResolvedValue([dsr({})]);
    mocks.anonymiseDsr.mockImplementation((_id: string, apply: boolean) =>
      Promise.resolve(apply ? { dry_run: false, anonymised: { EmploymentEpisode: 2 } } : { dry_run: true, would_anonymise: { EmploymentEpisode: 2 }, kept: "Clinical records are kept." }),
    );
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Anonymise" }));
    expect(await screen.findByText("EmploymentEpisode: 2 records")).toBeTruthy();
    expect(mocks.anonymiseDsr).toHaveBeenCalledWith(ID, false);
    const buttons = screen.getAllByRole("button", { name: "Anonymise" });
    const apply = buttons[buttons.length - 1] as HTMLButtonElement;
    expect(apply.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Confirm anonymise"), { target: { value: "ANONYMISE" } });
    fireEvent.click(apply);
    await waitFor(() => expect(mocks.anonymiseDsr).toHaveBeenCalledWith(ID, true));
  });

  it("decides a waiting request", async () => {
    mocks.fetchDsrs.mockResolvedValue([dsr({ status: "received", kind: "access" })]);
    mocks.decideDsr.mockResolvedValue(dsr({ status: "approved" }));
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Decide" }));
    fireEvent.click(screen.getByRole("button", { name: "Approve" }));
    await waitFor(() => expect(mocks.decideDsr).toHaveBeenCalledWith(ID, "approve", ""));
  });

  it("proxies only the privacy endpoints", () => {
    expect(ohPrivacyProxy.resolve("POST", ["requests", ID, "anonymise"])?.path).toBe(`/oh-privacy/requests/${ID}/anonymise`);
    expect(ohPrivacyProxy.resolve("GET", ["requests", ID, "export"])).not.toBeNull();
    expect(ohPrivacyProxy.resolve("GET", ["requests", ID, "anonymise"])).toBeNull();
    expect(ohPrivacyProxy.resolve("PATCH", ["requests", ID])).toBeNull();
  });
});
