import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { OhModuleSettingsTabs, OH_MODULE_TABS } from "@/features/settings/components/modules/occupational-health/OhModuleSettingsTabs";
import { isVisitStepOpen } from "@/features/occupational-health/lib/oh-encounter-modules";

vi.mock("next/navigation", () => ({
  usePathname: () => "/settings/modules/occupational-health",
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(""),
}));

afterEach(cleanup);

describe("employee form visit flow", () => {
  it("lists settings tabs as employers, employee form, COF, then exam", () => {
    expect(OH_MODULE_TABS.map((tab) => tab.label)).toEqual([
      "Employers",
      "Employee form templates",
      "COF templates",
      "Exam templates",
    ]);
    render(
      <QueryClientProvider client={new QueryClient()}>
        <OhModuleSettingsTabs />
      </QueryClientProvider>,
    );
    const tabs = screen.getAllByRole("button", { name: /templates|Employers/ });
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      "Employers",
      "Employee form templates",
      "COF templates",
      "Exam templates",
    ]);
  });

  it("keeps the certificate closed until the examination is saved", () => {
    expect(isVisitStepOpen("medical-examinations", { exam: false }, true)).toBe(true);
    expect(isVisitStepOpen("certificate", { exam: false }, true)).toBe(false);
    expect(isVisitStepOpen("certificate", { exam: true }, true)).toBe(true);
    expect(isVisitStepOpen("iod", { exam: false }, true)).toBe(true);
    expect(isVisitStepOpen("medical-examinations", { exam: false }, false)).toBe(true);
  });
});
