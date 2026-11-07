import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  PricelistSyncResultToast,
  showPricelistSyncResultToast,
} from "@/features/inventory/components/detail/PricelistSyncResultToast";

const dismissMock = vi.hoisted(() => vi.fn());
const customMock = vi.hoisted(() => vi.fn(() => "toast-new"));

vi.mock("sonner", () => ({
  toast: {
    dismiss: dismissMock,
    custom: customMock,
  },
}));

afterEach(() => {
  cleanup();
});

describe("PricelistSyncResultToast", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("dismisses the loading toast before showing a new custom result toast", () => {
    showPricelistSyncResultToast(
      {
        matched: 1,
        updated: 1,
        names_updated: 0,
        imported: 0,
        unchanged: 0,
        approval_required: 0,
      },
      { replaceId: "loading-1", title: "Done" },
    );

    expect(dismissMock).toHaveBeenCalledWith("loading-1");
    expect(customMock).toHaveBeenCalled();
    const options = customMock.mock.calls[0]?.[1];
    expect(options?.id).toBeUndefined();
    expect(options?.icon).toBeNull();
  });

  it("reveals sync stats when View details is clicked", () => {
    render(
      <PricelistSyncResultToast
        toastId="toast-1"
        title="MASM Core prices synced"
        stats={{
          matched: 4,
          updated: 0,
          names_updated: 0,
          imported: 1611,
          unchanged: 4,
          approval_required: 0,
        }}
      />,
    );

    const toggle = screen.getByTestId("pricelist-sync-result-toast-toggle");
    expect(screen.getByTestId("pricelist-sync-result-toast")).toBeInTheDocument();
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveTextContent("View details");

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(toggle).toHaveTextContent("Hide details");
    expect(screen.getByTestId("pricelist-sync-result-toast-details")).toBeVisible();
    expect(screen.getByText("1611")).toBeVisible();
    expect(screen.getByText("Matched")).toBeVisible();
    expect(screen.getByText("Pending approval")).toBeVisible();
  });
});
