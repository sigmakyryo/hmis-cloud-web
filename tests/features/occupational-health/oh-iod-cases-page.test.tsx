import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ toast: vi.fn(), updateIodCase: vi.fn() }));

vi.mock("@/providers/toast-provider", () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock("@/features/occupational-health/services/oh.service", () => {
  const base = { id: 1, customer: 42, employment_episode: null, encounter: null, she_reference: "", lost_days: 0, work_related: true, safety_classification: "", created_at: "2026-11-10T08:00:00Z", updated_at: "2026-11-10T08:00:00Z" };
  return {
    fetchIodCases: vi.fn(async () => [
      { ...base, uuid: "iod-minor", severity: "minor", status: "open", onset_date: "2026-11-14", mechanism: "dust", body_part: "eye", incident_location: "", description: "", worker_name: "", employer_name: "Illovo", immediate_action: "", treatment_given: "", root_cause: "" },
      { ...base, uuid: "iod-major", severity: "major", status: "open", onset_date: "2026-11-10", mechanism: "crush", body_part: "left hand", incident_location: "press shop", description: "", worker_name: "Chikondi Phiri", employer_name: "Illovo", immediate_action: "Isolated", treatment_given: "", root_cause: "No guard", lost_days: 4 },
      { ...base, uuid: "iod-review", severity: "moderate", status: "under_review", onset_date: "2026-11-05", mechanism: "lifting", body_part: "back", incident_location: "", description: "", worker_name: "Grace Mwale", employer_name: "Press Cane", immediate_action: "Rest", treatment_given: "", root_cause: "Heavy load" },
      { ...base, uuid: "iod-closed", severity: "minor", status: "closed", onset_date: "2026-09-01", closed_on: "2026-09-10", mechanism: "slip", body_part: "wrist", incident_location: "workshop", description: "", worker_name: "Esther Nkhoma", employer_name: "Illovo" },
    ]),
    fetchOhEmployees: vi.fn(async () => ({ results: [], pagination: null })),
    createIodCase: vi.fn(),
    updateIodCase: (...args: unknown[]) => mocks.updateIodCase(...args),
    downloadIodStatutoryPack: vi.fn(),
  };
});

// Why: Radix Select and menus rely on pointer capture, which jsdom does not implement.
Element.prototype.hasPointerCapture ??= () => false;
Element.prototype.releasePointerCapture ??= () => undefined;

import { OhIodCasesPage } from "@/features/occupational-health/pages/OhIodCasesPage";

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <OhIodCasesPage />
    </QueryClientProvider>,
  );
}

const rowTitles = () => screen.getAllByTestId("oh-iod-row").map((row) => row.querySelector("a span span")?.textContent);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.updateIodCase.mockResolvedValue({});
});
afterEach(cleanup);

describe("OhIodCasesPage", () => {
  it("groups open and closed cases, worst first, with who and where", async () => {
    renderPage();

    await screen.findAllByTestId("oh-iod-row");
    const open = within(screen.getByTestId("oh-iod-group-open"));
    expect(open.getAllByTestId("oh-iod-row").map((row) => row.textContent)).toEqual([
      expect.stringContaining("left hand · crush"),
      expect.stringContaining("back · lifting"),
      expect.stringContaining("eye · dust"),
    ]);
    expect(open.getAllByTestId("oh-iod-row")[0]).toHaveTextContent("Chikondi Phiri · Illovo · press shop");
    expect(open.getAllByTestId("oh-iod-row")[1]).toHaveTextContent("Under review");
    expect(within(screen.getByTestId("oh-iod-group-closed")).getByTestId("oh-iod-row")).toHaveTextContent("Closed 10 Sep 2026");
    expect(rowTitles()).toHaveLength(4);
  });

  it("says what an open case has not recorded, but not for a case that has it", async () => {
    renderPage();

    const rows = await screen.findAllByTestId("oh-iod-row");
    // Worst first: the major and the under-review cases both have a response and a cause recorded.
    expect(rows[0].querySelector("[data-testid='oh-iod-missing']")).toBeNull();
    expect(rows[1].querySelector("[data-testid='oh-iod-missing']")).toBeNull();
    expect(rows[2]).toHaveTextContent("No treatment recorded");
    expect(rows[2]).toHaveTextContent("No root cause");
    // A closed case is never nagged about.
    expect(rows[3].querySelector("[data-testid='oh-iod-missing']")).toBeNull();
  });

  it("opens a case from its row", async () => {
    renderPage();

    const rows = await screen.findAllByTestId("oh-iod-row");
    expect(within(rows[0]).getAllByRole("link")[0].getAttribute("href")).toBe("/occupational-health/records/iod/iod-major");
  });

  it("filters as you type by worker, employer or body part, and offers a way back", async () => {
    renderPage();
    await screen.findAllByTestId("oh-iod-row");

    fireEvent.change(screen.getByTestId("oh-iod-search"), { target: { value: "mwale" } });
    expect(screen.getAllByTestId("oh-iod-row")).toHaveLength(1);
    expect(screen.getByText("back · lifting")).toBeTruthy();

    fireEvent.change(screen.getByTestId("oh-iod-search"), { target: { value: "zzz" } });
    expect(screen.getByTestId("oh-iod-no-matches")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Show every case" }));
    expect(screen.getAllByTestId("oh-iod-row")).toHaveLength(4);
  });

  it("filters by status from the toolbar, with a count on each option", async () => {
    renderPage();
    await screen.findAllByTestId("oh-iod-row");

    fireEvent.keyDown(screen.getByTestId("oh-iod-status-filter"), { key: "Enter" });
    expect(screen.getByRole("option", { name: /^Under review/ })).toHaveTextContent("Under review1");
    fireEvent.keyDown(screen.getByRole("option", { name: /^Closed/ }), { key: "Enter" });

    expect(screen.getAllByTestId("oh-iod-row")).toHaveLength(1);
    expect(screen.queryByTestId("oh-iod-group-open")).toBeNull();
  });

  it("marks a case as under review from its menu", async () => {
    renderPage();
    const rows = await screen.findAllByTestId("oh-iod-row");

    fireEvent.keyDown(within(rows[0]).getByRole("button", { name: /^Actions for left hand/ }), { key: "Enter" });
    fireEvent.click(await screen.findByRole("menuitem", { name: "Mark as under review" }));

    await waitFor(() => expect(mocks.updateIodCase).toHaveBeenCalledWith("iod-major", { status: "under_review" }));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ variant: "success", title: "Case updated" })));
  });

  it("offers reopen on a closed case and back to open on one under review", async () => {
    renderPage();
    const rows = await screen.findAllByTestId("oh-iod-row");

    fireEvent.keyDown(within(rows[1]).getByRole("button", { name: /^Actions for back/ }), { key: "Enter" });
    expect(await screen.findByRole("menuitem", { name: "Back to open" })).toBeTruthy();
    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());

    fireEvent.keyDown(within(rows[3]).getByRole("button", { name: /^Actions for wrist/ }), { key: "Enter" });
    fireEvent.click(await screen.findByRole("menuitem", { name: "Reopen case" }));
    await waitFor(() => expect(mocks.updateIodCase).toHaveBeenCalledWith("iod-closed", { status: "open" }));
  });

  it("starts a new case by choosing the employee first", async () => {
    renderPage();
    await screen.findAllByTestId("oh-iod-row");

    fireEvent.click(screen.getByRole("button", { name: "Open case" }));

    expect(screen.getByTestId("oh-iod-case-dialog")).toBeTruthy();
    expect(screen.getByTestId("oh-iod-employee-picker")).toBeTruthy();
  });
});
