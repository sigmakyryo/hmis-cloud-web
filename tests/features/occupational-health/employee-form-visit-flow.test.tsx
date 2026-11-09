import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { OhEmployeeFormsTab } from "@/features/occupational-health/components/OhEmployeeFormsTab";
import { OH_ENCOUNTER_MODULES, isVisitStepOpen } from "@/features/occupational-health/lib/oh-encounter-modules";
import { OH_FORM_FAMILIES } from "@/features/occupational-health/lib/oh-form-catalog";
import { navigation } from "@/features/app-shell/constants/navigation-config";
import { OhModuleSettingsTabs, OH_MODULE_TABS } from "@/features/settings/components/modules/occupational-health/OhModuleSettingsTabs";

vi.mock("@/features/occupational-health/services/oh.service", async () => {
  const actual = await vi.importActual<typeof import("@/features/occupational-health/services/oh.service")>(
    "@/features/occupational-health/services/oh.service",
  );
  return {
    ...actual,
    fetchOhEmployeeFormResponses: vi.fn(async () => [
      {
        id: 1,
        uuid: "form-1",
        encounter: null,
        customer_uuid: "customer-1",
        status: "not_started",
        row_version: 1,
        is_active: true,
        responses_json: {},
      },
    ]),
    openOhEmployeeForm: vi.fn(),
    patchOhEmployeeFormResponses: vi.fn(),
    createOhEmployeeFormInvite: vi.fn(),
    uploadOhEmployeeFormDocument: vi.fn(),
  };
});

vi.mock("next/navigation", () => ({
  usePathname: () => "/settings/modules/occupational-health",
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(""),
}));

afterEach(cleanup);

describe("employee form visit flow", () => {
  it("lists settings tabs as employers and visit types", () => {
    expect(OH_MODULE_TABS.map((tab) => tab.label)).toEqual(["Employers", "Visit types"]);
    render(
      <QueryClientProvider client={new QueryClient()}>
        <OhModuleSettingsTabs />
      </QueryClientProvider>,
    );
    const tabs = screen.getAllByRole("button", { name: /Employers|Visit types/ });
    expect(tabs.map((tab) => tab.textContent)).toEqual(["Employers", "Visit types"]);
  });

  it("gives Forms its own section and keeps the employee form off the visit", () => {
    expect(navigation.some((item) => item.moduleName === "Workforce")).toBe(false);
    const forms = navigation.find((item) => item.name === "Forms");
    expect(forms?.moduleName).toBe("Forms");
    expect(navigation.filter((item) => item.moduleName === "OccupationalHealth").map((item) => item.name)).toEqual(
      expect.arrayContaining(["Employees", "Immunizations", "Drug & alcohol"]),
    );
    expect(OH_ENCOUNTER_MODULES.map((module) => module.id)).not.toContain("employee-form");
    expect(OH_FORM_FAMILIES.map((family) => family.label)).toEqual(["Occupational health", "Custom"]);
  });

  it("shows the employee form status and fill actions", async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <OhEmployeeFormsTab customerUuid="customer-1" />
      </QueryClientProvider>,
    );
    expect(await screen.findByRole("button", { name: "Save" })).toBeTruthy();
    expect(screen.getByTestId("oh-employee-form-status")).toHaveTextContent("Not started");
    expect(screen.getByRole("button", { name: "Submit" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Send link" })).toBeTruthy();
    expect(screen.getByText("Upload document")).toBeTruthy();
  });

  it("keeps the certificate closed until the examination is saved", () => {
    expect(isVisitStepOpen("medical-examinations", { exam: false }, true)).toBe(true);
    expect(isVisitStepOpen("certificate", { exam: false }, true)).toBe(false);
    expect(isVisitStepOpen("certificate", { exam: true }, true)).toBe(true);
    expect(isVisitStepOpen("iod", { exam: false }, true)).toBe(true);
    expect(isVisitStepOpen("medical-examinations", { exam: false }, false)).toBe(true);
  });
});
