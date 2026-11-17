import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { PortalPagination } from "@/features/employer-portal/components/PortalPagination";
import { usePortalPagination } from "@/features/employer-portal/hooks/usePortalPagination";
import { clampPage, pageItems } from "@/features/employer-portal/utils/pagination";

afterEach(cleanup);

describe("page items", () => {
  it("lists every page when there are few", () => {
    expect(pageItems(2, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it("matches the reference: first pages, a gap, then the last page", () => {
    expect(pageItems(4, 16)).toEqual([1, 2, 3, 4, 5, "gap", 16]);
  });

  it("keeps the current page in view in the middle and at the end", () => {
    expect(pageItems(9, 16)).toEqual([1, "gap", 8, 9, 10, "gap", 16]);
    expect(pageItems(15, 16)).toEqual([1, "gap", 12, 13, 14, 15, 16]);
  });

  it("clamps out-of-range pages", () => {
    expect(clampPage(0, 3)).toBe(1);
    expect(clampPage(9, 3)).toBe(3);
    expect(clampPage(2, 0)).toBe(1);
  });
});

function Harness({ count, resetKey = "" }: { count: number; resetKey?: string }) {
  const rows = Array.from({ length: count }, (_, index) => `Row ${index + 1}`);
  const { pageRows, pagination } = usePortalPagination(rows, resetKey, 7);
  return (
    <>
      <ul>
        {pageRows.map((row) => (
          <li key={row}>{row}</li>
        ))}
      </ul>
      <PortalPagination {...pagination} />
    </>
  );
}

describe("portal pagination", () => {
  it("shows Page X of Y, moves between pages and marks the current one", () => {
    render(<Harness count={30} />);
    expect(screen.getByText("Page 1 of 5")).toBeTruthy();
    expect(screen.getAllByRole("listitem")).toHaveLength(7);
    expect((screen.getByRole("button", { name: "Previous page" }) as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(screen.getByText("Page 2 of 5")).toBeTruthy();
    expect(screen.getByText("Row 8")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Page 2" }).getAttribute("aria-current")).toBe("page");

    fireEvent.click(screen.getByRole("button", { name: "Last page" }));
    expect(screen.getByText("Page 5 of 5")).toBeTruthy();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect((screen.getByRole("button", { name: "Next page" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("changes the page size and returns to page 1", () => {
    render(<Harness count={30} />);
    fireEvent.click(screen.getByRole("button", { name: "Page 3" }));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "25" } });
    expect(screen.getByText("Page 1 of 2")).toBeTruthy();
    expect(screen.getAllByRole("listitem")).toHaveLength(25);
  });

  it("goes back to page 1 when the search changes", () => {
    const { rerender } = render(<Harness count={30} resetKey="" />);
    fireEvent.click(screen.getByRole("button", { name: "Page 3" }));
    expect(screen.getByText("Page 3 of 5")).toBeTruthy();
    rerender(<Harness count={30} resetKey="ann" />);
    expect(screen.getByText("Page 1 of 5")).toBeTruthy();
  });

  it("shows nothing for an empty list", () => {
    render(<Harness count={0} />);
    expect(screen.queryByTestId("portal-pagination")).toBeNull();
  });
});
