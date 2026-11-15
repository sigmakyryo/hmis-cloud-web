import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { OhQueuePage } from "@/features/occupational-health/pages/OhQueuePage";

// Why: Radix Select relies on pointer capture, which jsdom does not implement.
Element.prototype.hasPointerCapture ??= () => false;
Element.prototype.releasePointerCapture ??= () => undefined;

/** Opens a filter select from the keyboard and picks an option, as a keyboard user would. */
function choose(testId: string, option: RegExp) {
  fireEvent.keyDown(screen.getByTestId(testId), { key: "Enter" });
  fireEvent.keyDown(screen.getByRole("option", { name: option }), { key: "Enter" });
}

const AUTHORIZED_USER = {
  isLoading: false,
  userData: {
    groups: ["OccupationalHealth"],
    enabled_modules: ["OccupationalHealth"],
  },
};

const useUserMock = vi.fn(() => AUTHORIZED_USER);

const nav = vi.hoisted(() => ({ search: "view=list", replace: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: nav.replace,
    prefetch: vi.fn(),
  }),
  usePathname: () => "/occupational-health",
  useSearchParams: () => new URLSearchParams(nav.search),
}));

vi.mock("@/providers/user-provider", () => ({
  useUser: () => useUserMock(),
}));

vi.mock("@/features/occupational-health/hooks/use-occupational-health", () => ({
  useOhEncounters: () => ({
    data: [
      {
        id: 1,
        uuid: "enc-1",
        visit: "visit-1",
        customer_uuid: "cust-1",
        customer_name: "Jane Doe",
        department: "dept-1",
        department_name: "Occupational Health",
        department_type: "occupational_health",
        location: null,
        location_name: null,
        clinician: null,
        clinician_name: "Dr OH",
        status: "waiting",
        billing_mode: null,
        started_at: "2026-01-01T10:00:00Z",
        ended_at: null,
        notes: "",
        is_active: true,
        created_at: "2026-01-01T10:00:00Z",
        updated_at: "2026-01-01T10:00:00Z",
      },
      {
        id: 2,
        uuid: "enc-2",
        visit: "visit-2",
        customer_uuid: "cust-2",
        customer_name: "Sam Banda",
        employer_name: "Illovo",
        department: "dept-1",
        department_name: "Occupational Health",
        department_type: "occupational_health",
        location: null,
        location_name: null,
        clinician: 3,
        clinician_name: "Dr Phiri",
        status: "in_progress",
        billing_mode: null,
        started_at: "2026-01-01T11:00:00Z",
        ended_at: null,
        notes: "",
        is_active: true,
        created_at: "2026-01-01T11:00:00Z",
        updated_at: "2026-01-01T11:00:00Z",
      },
    ],
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

afterEach(() => {
  cleanup();
  useUserMock.mockReturnValue(AUTHORIZED_USER);
  nav.search = "view=list";
  nav.replace.mockReset();
});

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <OhQueuePage />
    </QueryClientProvider>,
  );
}

describe("OhQueuePage", () => {
  it("renders OH queue rows for authorized users", async () => {
    renderPage();

    expect(screen.getByTestId("oh-queue-page")).toBeInTheDocument();
    expect(screen.getByTestId("oh-queue-search")).toBeInTheDocument();
    expect(await screen.findByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Open" })[0]).toHaveAttribute(
      "href",
      "/occupational-health/visit-1/enc-1?panel=fitness",
    );
  });

  it("has no page heading, just search and filters, and counts each status in the list view", () => {
    renderPage();

    expect(screen.queryByText("Queue", { selector: "h1:not(.sr-only)" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "OHS queue" })).toHaveClass("sr-only");
    expect(screen.getByTestId("oh-queue-status-filter")).toHaveTextContent("All statuses2");

    choose("oh-queue-status-filter", /^In progress/);

    expect(screen.getByTestId("oh-queue-status-filter")).toHaveTextContent("In progress1");
    expect(screen.queryByText("Jane Doe")).not.toBeInTheDocument();
    expect(screen.getByText("Sam Banda")).toBeInTheDocument();
  });

  it("filters by employer on both views, and lists each employer once", () => {
    renderPage();

    fireEvent.keyDown(screen.getByTestId("oh-queue-employer-filter"), { key: "Enter" });
    expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual(["All employers", "Illovo"]);
    fireEvent.keyDown(screen.getByRole("option", { name: "Illovo" }), { key: "Enter" });

    expect(screen.queryByText("Jane Doe")).not.toBeInTheDocument();
    expect(screen.getByText("Sam Banda")).toBeInTheDocument();

    cleanup();
    nav.search = "";
    renderPage();
    choose("oh-queue-employer-filter", /^Illovo$/);
    expect(screen.getByTestId("oh-queue-left-open")).toHaveTextContent("1 visit left open");
    expect(screen.getByTestId("oh-queue-left-open")).not.toHaveTextContent("Jane Doe");
  });

  it("filters as you type, and offers a way back when nobody matches", () => {
    renderPage();

    fireEvent.change(screen.getByTestId("oh-queue-search"), { target: { value: "phiri" } });
    expect(screen.queryByText("Jane Doe")).not.toBeInTheDocument();
    expect(screen.getByText("Sam Banda")).toBeInTheDocument();

    fireEvent.change(screen.getByTestId("oh-queue-search"), { target: { value: "zzz" } });
    expect(screen.getByText("Nobody matches")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show everyone" }));
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
  });

  it("opens on the board, with visits from an earlier day set apart", () => {
    nav.search = "";

    renderPage();

    expect(screen.getByTestId("oh-queue-board")).toBeInTheDocument();
    expect(screen.getByTestId("oh-queue-view-board")).toHaveAttribute("aria-pressed", "true");
    const leftOpen = screen.getByTestId("oh-queue-left-open");
    expect(leftOpen).toHaveTextContent("2 visits left open");
    expect(leftOpen).toHaveTextContent("Jane Doe");
    expect(screen.getByTestId("oh-queue-lane-waiting")).toHaveTextContent("Nobody is waiting.");
    expect(screen.queryByTestId("oh-queue-status-filter")).not.toBeInTheDocument();
    expect(screen.getByTestId("oh-queue-employer-filter")).toBeInTheDocument();
  });

  it("switches between board and list in the URL", () => {
    nav.search = "";
    renderPage();

    fireEvent.click(screen.getByTestId("oh-queue-view-list"));
    expect(nav.replace).toHaveBeenCalledWith("/occupational-health?view=list", { scroll: false });

    cleanup();
    nav.search = "view=list";
    renderPage();
    fireEvent.click(screen.getByTestId("oh-queue-view-board"));
    expect(nav.replace).toHaveBeenLastCalledWith("/occupational-health", { scroll: false });
  });

  it("shows a modern access denied blank state without OccupationalHealth", () => {
    useUserMock.mockReturnValue({
      isLoading: false,
      userData: { groups: ["Clinical"] },
    });

    renderPage();

    expect(screen.getByTestId("oh-queue-page")).toBeInTheDocument();
    expect(screen.getByText("Access denied")).toBeInTheDocument();
    expect(
      screen.getByText(/OccupationalHealth group/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Back to overview" }),
    ).toHaveAttribute("href", "/overview");
  });
});
