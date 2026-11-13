import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { navigation } from "@/features/app-shell/constants/navigation-config";
import { OhFormsPage } from "@/features/occupational-health/pages/OhFormsPage";

vi.mock("@/features/occupational-health/services/oh.service", () => ({
  fetchClinicalForms: vi.fn(async () => []),
  fetchOhVisitTypes: vi.fn(async () => [
    {
      uuid: "type-1",
      code: "pre_employment",
      name: "Pre-employment",
      description: "Before the person starts work",
      is_default: true,
      forms: [],
    },
  ]),
  fetchFormGroups: vi.fn(async () => [{ uuid: "group-1", name: "Consent" }]),
  createClinicalForm: vi.fn(),
  createFormGroup: vi.fn(),
  updateClinicalForm: vi.fn(),
  archiveClinicalForm: vi.fn(),
  updateOhExamTemplate: vi.fn(),
  updateOhCofTemplate: vi.fn(),
  updateOhEmployeeFormTemplate: vi.fn(),
  archiveOhExamTemplate: vi.fn(),
  archiveOhCofTemplate: vi.fn(),
  archiveOhEmployeeFormTemplate: vi.fn(),
  publishOhExamTemplate: vi.fn(),
  publishOhCofTemplate: vi.fn(),
  publishOhEmployeeFormTemplate: vi.fn(),
  fetchOhEmployeeFormTemplates: vi.fn(async () => [
    { uuid: "employee-template-1", name: "Warehouse employee form", code: "WEF", active: true },
  ]),
  fetchOhExamTemplates: vi.fn(async () => []),
  fetchOhCofTemplates: vi.fn(async () => []),
}));

afterEach(() => {
  cleanup();
});

describe("workspace forms catalog", () => {
  it("shows Forms as its own section and uses searchable selects", async () => {
    expect(navigation.some((item) => item.moduleName === "Workforce")).toBe(false);
    expect(navigation.find((item) => item.name === "Forms")?.moduleName).toBe("Forms");

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <OhFormsPage />
      </QueryClientProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "New form" }));
    expect(await screen.findByTestId("oh-form-type-select")).toBeTruthy();
    expect(screen.getByTestId("oh-form-group-select")).toBeTruthy();
    expect(document.querySelector("select:not([aria-hidden='true'])")).toBeNull();
    fireEvent.click(screen.getByTestId("oh-form-type-select"));
    expect(await screen.findByRole("option", { name: "Employee form" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "Examination" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "Certificate of fitness" })).toBeTruthy();
    expect(await screen.findByText("Warehouse employee form")).toBeTruthy();
  });

  it("creates an employee form from the same dialog", async () => {
    const service = await import("@/features/occupational-health/services/oh.service");
    vi.mocked(service.createClinicalForm).mockResolvedValue({
      uuid: "form-1",
      name: "Site induction",
      family: "occupational_health",
      system_type: "employee_form",
      placement: null,
      group: null,
      template_kind: "employee",
      template_uuid: "template-new",
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <OhFormsPage />
      </QueryClientProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "New form" }));
    const dialog = await screen.findByTestId("oh-create-form-dialog");
    const name = dialog.querySelector("input[required]") as HTMLInputElement;
    fireEvent.change(name, { target: { value: "Site induction" } });
    const button = screen.getByRole("button", { name: "Create" });
    expect(button).toBeEnabled();
    fireEvent.click(button);
    await waitFor(() => {
      expect(service.createClinicalForm).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Site induction",
          family: "occupational_health",
          system_type: "employee_form",
        }),
        expect.anything(),
      );
    });
  });

  it("shows type and status badges and an Edit link into the builder", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <OhFormsPage />
      </QueryClientProvider>,
    );
    const name = await screen.findByText("Warehouse employee form");
    const row = name.closest("tr");
    expect(row).toBeTruthy();
    expect(within(row as HTMLElement).getByText("Employee")).toBeTruthy();
    expect(within(row as HTMLElement).getByText("Draft")).toBeTruthy();
    const edit = within(row as HTMLElement).getByRole("link", { name: "Edit" });
    expect(edit.getAttribute("href")).toBe("/templates/employee/employee-template-1");
    expect(screen.getByRole("button", { name: "Rename" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Publish" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Archive" })).toBeTruthy();
  });
});
