import { act, cleanup, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ComplianceOverview } from "@/app/(app)/immunizations/_components/compliance/ComplianceOverview";
import { IMM_PAGE_SIZE, useImmList } from "@/app/(app)/immunizations/_components/shared/use-imm-list";

vi.mock("@/providers/toast-provider", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/features/occupational-health/services/immunisation.service", () => ({
  downloadOhImmComplianceCsv: vi.fn(),
}));

afterEach(cleanup);

type Item = { name: string; due: string | null };

const ITEMS: Item[] = [
  { name: "Bravo", due: "2026-03-01" },
  { name: "alpha", due: null },
  { name: "Charlie", due: "2026-01-15" },
];

describe("useImmList", () => {
  it("filters by search text case-insensitively and resets to page one", () => {
    const { result } = renderHook(() =>
      useImmList({ rows: ITEMS, searchText: (item) => item.name, pageSize: 1 }),
    );

    act(() => result.current.controls.setPage(2));
    act(() => result.current.setQuery("ALP"));

    expect(result.current.matchedRows.map((item) => item.name)).toEqual(["alpha"]);
    expect(result.current.controls.page).toBe(1);
    expect(result.current.total).toBe(3);
  });

  it("keeps empty values last in both sort directions", () => {
    const { result } = renderHook(() =>
      useImmList({ rows: ITEMS, sortValue: (item) => item.due, defaultSort: { key: "due", direction: "asc" } }),
    );

    expect(result.current.matchedRows.map((item) => item.name)).toEqual(["Charlie", "Bravo", "alpha"]);

    act(() => result.current.controls.toggleSort("due"));

    expect(result.current.matchedRows.map((item) => item.name)).toEqual(["Bravo", "Charlie", "alpha"]);
  });

  it("pages rows and clamps the page when results shrink", () => {
    const rows = Array.from({ length: IMM_PAGE_SIZE + 5 }, (_, index) => ({ name: `Row ${index}`, due: null }));
    const { result } = renderHook(() => useImmList({ rows, searchText: (item) => item.name }));

    act(() => result.current.controls.setPage(2));
    expect(result.current.pageRows).toHaveLength(5);

    act(() => result.current.setQuery("Row 1"));
    expect(result.current.controls.page).toBe(1);
    expect(result.current.pageRows.length).toBeLessThanOrEqual(IMM_PAGE_SIZE);
  });
});

describe("ComplianceOverview employer list", () => {
  const groups = [
    { group: "Low Co", people: 10, compliant: 5, overdue: 4, percent_compliant: 50 },
    { group: "Mid Co", people: 10, compliant: 8, overdue: 1, percent_compliant: 80 },
    { group: "Top Co", people: 10, compliant: 10, overdue: 0, percent_compliant: 100 },
  ];

  function renderOverview() {
    render(
      <ComplianceOverview
        loading={false}
        data={{ summary: { people: 30, compliant: 23, percent_compliant: 77, overdue_rows: 5 }, groups, overdue: [] }}
      />,
    );
  }

  it("filters employers when a coverage band is selected", () => {
    renderOverview();

    fireEvent.click(screen.getByRole("button", { name: /Below 70%/ }));

    expect(screen.getByText("Low Co")).toBeTruthy();
    expect(screen.queryByText("Mid Co")).toBeNull();
    expect(screen.queryByText("Top Co")).toBeNull();
  });

  it("lists the lowest coverage first by default", () => {
    renderOverview();

    const names = screen.getAllByText(/ Co$/).map((node) => node.textContent);

    expect(names).toEqual(["Low Co", "Mid Co", "Top Co"]);
  });
});
