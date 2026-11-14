import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { OhFormsPage } from "@/features/occupational-health/pages/OhFormsPage";
import {
  formsFiltersFromSearchParams,
  matchesFormsView,
  ohFormsHref,
} from "@/features/occupational-health/utils/oh-forms-list-url";

const nav = vi.hoisted(() => ({ params: new URLSearchParams(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: nav.replace, prefetch: vi.fn() }),
  useSearchParams: () => nav.params,
  usePathname: () => "/occupational-health/forms",
}));
vi.mock("@/providers/toast-provider", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/features/occupational-health/services/oh.service", () => ({
  fetchClinicalForms: vi.fn(async () => []),
  fetchOhVisitTypes: vi.fn(async () => []),
  fetchFormGroups: vi.fn(async () => []),
  fetchOhEmployeeFormTemplates: vi.fn(async () => [
    { uuid: "e1", name: "Warehouse employee form", active: true },
    { uuid: "e2", name: "Old intake form", active: false },
  ]),
  fetchOhExamTemplates: vi.fn(async () => [
    { uuid: "x1", name: "Audiometry", active: true, published_version_number: 2 },
  ]),
  fetchOhCofTemplates: vi.fn(async () => []),
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
  renameFormGroup: vi.fn(),
  deleteFormGroup: vi.fn(),
  saveFormLayout: vi.fn(),
}));

afterEach(() => {
  cleanup();
  nav.params = new URLSearchParams();
  nav.replace.mockReset();
});

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <OhFormsPage />
    </QueryClientProvider>,
  );
}

describe("forms Live / Archived URL", () => {
  it("defaults to live and keeps compact hrefs", () => {
    expect(formsFiltersFromSearchParams(new URLSearchParams())).toEqual({ view: "live", status: "all", type: "all", search: "", layout: "list" });
    expect(ohFormsHref({ view: "live" })).toBe("/occupational-health/forms");
    expect(ohFormsHref({ view: "archived", search: "intake", type: "employee", status: "draft" })).toBe(
      "/occupational-health/forms?q=intake&type=employee&view=archived",
    );
    expect(ohFormsHref({ view: "live", status: "published" })).toBe("/occupational-health/forms?status=published");
  });

  it("treats live as not archived", () => {
    expect(matchesFormsView("draft", "live", "all")).toBe(true);
    expect(matchesFormsView("archived", "live", "all")).toBe(false);
    expect(matchesFormsView("archived", "archived", "all")).toBe(true);
    expect(matchesFormsView("published", "live", "draft")).toBe(false);
  });
});

describe("forms page Live / Archived filter", () => {
  it("shows only live forms by default with counts", async () => {
    renderPage();
    expect(await screen.findByText("Warehouse employee form")).toBeInTheDocument();
    expect(screen.getByText("Audiometry")).toBeInTheDocument();
    expect(screen.queryByText("Old intake form")).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Live\s*2/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: /Archived\s*1/ })).toBeInTheDocument();
  });

  it("writes the archived view to the URL", async () => {
    renderPage();
    await screen.findByText("Warehouse employee form");
    fireEvent.click(screen.getByRole("tab", { name: /Archived/ }));
    expect(nav.replace).toHaveBeenCalledWith("/occupational-health/forms?view=archived", { scroll: false });
  });

  it("reads the archived view and search from the URL", async () => {
    nav.params = new URLSearchParams("view=archived&q=intake");
    renderPage();
    expect(await screen.findByText("Old intake form")).toBeInTheDocument();
    expect(screen.queryByText("Warehouse employee form")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Search forms")).toHaveValue("intake");
  });

  it("combines the live view with type and search", async () => {
    nav.params = new URLSearchParams("type=exam");
    renderPage();
    expect(await screen.findByText("Audiometry")).toBeInTheDocument();
    expect(screen.queryByText("Warehouse employee form")).not.toBeInTheDocument();
  });
});

describe("forms page organise groups mode", () => {
  it("switches to the groups board through the URL", async () => {
    renderPage();
    fireEvent.click(await screen.findByTestId("oh-forms-organise-groups"));
    expect(nav.replace).toHaveBeenCalledWith("/occupational-health/forms?layout=groups", { scroll: false });
  });

  it("renders the board with live forms when layout=groups", async () => {
    nav.params = new URLSearchParams("layout=groups");
    renderPage();
    expect(await screen.findByTestId("oh-form-groups-board")).toBeInTheDocument();
    expect(await screen.findByText("Warehouse employee form")).toBeInTheDocument();
    expect(screen.queryByText("Old intake form")).not.toBeInTheDocument();
    expect(screen.queryByTestId("oh-forms-list")).not.toBeInTheDocument();
  });
});
