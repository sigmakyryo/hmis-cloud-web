import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { OhQueueTable } from "@/features/occupational-health/components/OhQueueTable";
import { ohQueueEntryHref } from "@/features/occupational-health/lib/oh-queue-route";
import type { OhVisitEncounter } from "@/features/occupational-health/types";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/occupational-health",
  useSearchParams: () => new URLSearchParams(),
}));

afterEach(() => {
  cleanup();
  push.mockReset();
});

function encounter(overrides: Partial<OhVisitEncounter> = {}): OhVisitEncounter {
  return {
    id: 1,
    uuid: "9d6fdb12-94f6-5eec-a027-ba287c2bc8fd",
    visit: "3a8e6291-5524-512d-9358-926c353b7c92",
    origin: "laravel",
    department: "d",
    department_name: "Occupational Health",
    department_type: "occupational_health",
    customer_uuid: "c",
    customer_name: "Thandi Banda",
    status: "waiting",
    billing_mode: null,
    started_at: null,
    ended_at: null,
    notes: "",
    is_active: true,
    created_at: "2026-11-11T08:00:00Z",
    updated_at: "2026-11-11T08:00:00Z",
    visit_type: { uuid: "t", code: "periodic", name: "Periodic", forms: [] },
    iod_case: null,
    ...overrides,
  } as OhVisitEncounter;
}

const iod = () =>
  encounter({
    visit_type: { uuid: "t", code: "injury_on_duty", name: "Injury on Duty", forms: [] },
    iod_case: { uuid: "11111111-2222-4333-8444-555555555555", status: "open" },
  });

describe("IOD queue routing", () => {
  it("routes Injury on Duty visits to their IOD case screen", () => {
    expect(ohQueueEntryHref(iod())).toBe(
      "/occupational-health/records/iod/11111111-2222-4333-8444-555555555555",
    );
  });

  it("keeps the visit workspace route for other OH visits", () => {
    expect(ohQueueEntryHref(encounter())).toBe(
      "/occupational-health/3a8e6291-5524-512d-9358-926c353b7c92/9d6fdb12-94f6-5eec-a027-ba287c2bc8fd?panel=fitness",
    );
  });

  it("falls back to the visit workspace if the IOD case is not linked yet", () => {
    expect(ohQueueEntryHref({ ...iod(), iod_case: null })).toContain("?panel=fitness");
  });

  it("marks IOD rows in the OH queue and opens the case on click", () => {
    render(<OhQueueTable encounters={[iod(), encounter({ uuid: "other", customer_name: "Other Worker" })]} />);
    expect(screen.getAllByTestId("oh-queue-iod-badge")).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Thandi Banda" })).toHaveAttribute(
      "href",
      "/occupational-health/records/iod/11111111-2222-4333-8444-555555555555",
    );
    fireEvent.click(screen.getByText("Other Worker").closest("tr")!);
    expect(push).toHaveBeenCalledWith(expect.stringContaining("?panel=fitness"));
  });
});
