import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { navigation } from "@/features/app-shell/constants/navigation-config";
import { OhFormsPage } from "@/features/occupational-health/pages/OhFormsPage";

const toasts = vi.hoisted(() => ({ toast: vi.fn(() => "toast-id") }));
vi.mock("@/providers/toast-provider", () => ({ useToast: () => toasts }));

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

  it("requires confirmation in an alert dialog before archiving", async () => {
    const service = await import("@/features/occupational-health/services/oh.service");
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><OhFormsPage /></QueryClientProvider>);
    fireEvent.click(await screen.findByRole("button", { name: "Archive" }));
    const dialog = screen.getByRole("alertdialog", { name: /Archive Warehouse employee form/ });
    expect(service.archiveOhEmployeeFormTemplate).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole("button", { name: "Archive form" }));
    await waitFor(() => expect(service.archiveOhEmployeeFormTemplate).toHaveBeenCalledWith("employee-template-1"));
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
    expect(screen.queryByRole("heading", { name: "Forms" })).toBeNull();
    expect(
      screen.queryByText(/Edit the working copy any time/),
    ).toBeNull();
  });

  it("updates the status badge to Published vN and toasts after publish", async () => {
    const service = await import("@/features/occupational-health/services/oh.service");
    vi.mocked(service.publishOhEmployeeFormTemplate).mockImplementation(async () => {
      vi.mocked(service.fetchOhEmployeeFormTemplates).mockResolvedValue([
        {
          id: 1,
          uuid: "employee-template-1",
          name: "Warehouse employee form",
          code: "WEF",
          active: true,
          published_version_number: 2,
          published_version_status: "published",
        },
      ]);
      return {
        id: 2,
        uuid: "ver-2",
        template: "employee-template-1",
        number: 2,
        status: "published",
        snapshot_json: {},
        content_hash: "abc",
        published_at: "2026-11-13T12:00:00Z",
        published_by: 1,
      };
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <OhFormsPage />
      </QueryClientProvider>,
    );
    const name = await screen.findByText("Warehouse employee form");
    const row = name.closest("tr") as HTMLElement;
    expect(within(row).getByText("Draft")).toBeTruthy();
    fireEvent.click(within(row).getByRole("button", { name: "Publish" }));
    await waitFor(() => {
      expect(service.publishOhEmployeeFormTemplate).toHaveBeenCalledWith("employee-template-1");
    });
    await waitFor(() => {
      expect(within(row).getByText("Published v2")).toBeTruthy();
    });
    expect(within(row).queryByText("Draft")).toBeNull();
    expect(toasts.toast).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: "success",
        title: "Published v2. Visits use this snapshot.",
      }),
    );
  });
});
