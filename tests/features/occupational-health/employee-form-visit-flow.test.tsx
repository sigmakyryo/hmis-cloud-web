import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "@/providers/toast-provider";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
    createOhEmployeeFormInvite: vi.fn(async () => ({ token: "public-token", expires_at: "2026-11-23T00:00:00Z" })),
    uploadOhEmployeeFormDocument: vi.fn(),
    fetchOhEncounters: vi.fn(async () => [
      {
        id: 7,
        uuid: "enc-1",
        visit: "visit-1",
        customer_uuid: "customer-1",
        status: "completed",
        visit_date: "2026-11-01T08:00:00Z",
        created_at: "2026-11-01T08:00:00Z",
        updated_at: "2026-11-01T08:00:00Z",
        visit_type: { uuid: "type-1", code: "periodic", name: "Periodic", forms: [] },
      },
    ]),
    fetchOhExaminations: vi.fn(async () => [
      {
        id: 11,
        uuid: "exam-1",
        encounter: 7,
        exam_type: "periodic",
        occupational_attendance: true,
        template_code: "",
        notes: "",
        examined_at: "2026-11-01T09:00:00Z",
        created_at: "2026-11-01T09:00:00Z",
        updated_at: "2026-11-01T09:00:00Z",
        row_version: 2,
      },
    ]),
    fetchOhCofResponses: vi.fn(async () => []),
  };
});

vi.mock("next/navigation", () => ({
  usePathname: () => "/settings/modules/occupational-health",
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(""),
}));

afterEach(cleanup);

describe("employee form visit flow", () => {
  it("lists settings tabs as employers, visit types, and dispensing", () => {
    expect(OH_MODULE_TABS.map((tab) => tab.label)).toEqual([
      "Employers",
      "Visit types",
      "Dispensing",
    ]);
    render(
      <ToastProvider>
        <QueryClientProvider client={new QueryClient()}>
          <OhModuleSettingsTabs />
        </QueryClientProvider>
      </ToastProvider>,
    );
    const tabs = screen.getAllByRole("button", {
      name: /Employers|Visit types|Dispensing/,
    });
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      "Employers",
      "Visit types",
      "Dispensing",
    ]);
  });

  it("gives Forms its own section and keeps the employee form off the visit", () => {
    expect(navigation.some((item) => item.moduleName === "Workforce")).toBe(false);
    const forms = navigation.find((item) => item.name === "Forms");
    expect(forms?.moduleName).toBe("Forms");
    expect(navigation.filter((item) => item.moduleName === "OccupationalHealth").map((item) => item.name)).toEqual(
      expect.arrayContaining(["Employees", "Drug & alcohol"]),
    );
    expect(
      navigation.filter((item) => item.moduleName === "OccupationalHealth").map((item) => item.name),
    ).not.toContain("Immunizations");
    expect(navigation.some((item) => item.moduleName === "Immunizations")).toBe(true);
    expect(OH_ENCOUNTER_MODULES.map((module) => module.id)).not.toContain("employee-form");
    expect(OH_FORM_FAMILIES.map((family) => family.label)).toEqual(["Occupational health", "Custom"]);
  });

  it("shows the employee form status and fill actions", async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <OhEmployeeFormsTab customerUuid="customer-1" />
      </QueryClientProvider>,
    );
    expect(await screen.findByTestId("oh-employee-form-status")).toHaveTextContent("Not started");
    expect(screen.getByRole("row", { name: /Employee form/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Fill" }));
    expect(await screen.findByRole("button", { name: /Enter manually/ })).toBeTruthy();
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    fireEvent.click(screen.getByRole("button", { name: /Copy public link/ }));
    expect(await screen.findByTestId("oh-employee-form-link")).toHaveTextContent("/workforce-forms/public-token");
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/workforce-forms/public-token`);
    });
    expect(screen.getByText("Upload")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Enter manually/ }));
    expect(await screen.findByRole("button", { name: "Save" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Submit" })).toBeTruthy();
  });

  it("expands a visit to the forms recorded in that session", async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <OhEmployeeFormsTab customerUuid="customer-1" />
      </QueryClientProvider>,
    );
    expect(await screen.findByText("Periodic")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Show forms" }));
    const forms = await screen.findByTestId("oh-employee-session-forms");
    expect(forms).toHaveTextContent("Examination");
    expect(forms).toHaveTextContent("Submitted");
    expect(forms).toHaveTextContent("Certificate of fitness");
    expect(forms).toHaveTextContent("Not started");
    expect(forms).not.toHaveTextContent("Employee form");
  });

  it("keeps the certificate closed until the examination is saved", () => {
    expect(isVisitStepOpen("medical-examinations", { exam: false }, true)).toBe(true);
    expect(isVisitStepOpen("certificate", { exam: false }, true)).toBe(false);
    expect(isVisitStepOpen("certificate", { exam: true }, true)).toBe(true);
    expect(isVisitStepOpen("iod", { exam: false }, true)).toBe(true);
    expect(isVisitStepOpen("medical-examinations", { exam: false }, false)).toBe(true);
  });
});
