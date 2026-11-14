import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { OhQueuePage } from "@/features/occupational-health/pages/OhQueuePage";

const AUTHORIZED_USER = {
  isLoading: false,
  userData: {
    groups: ["OccupationalHealth"],
    enabled_modules: ["OccupationalHealth"],
  },
};

const useUserMock = vi.fn(() => AUTHORIZED_USER);

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
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

  it("counts visits per status and filters by status", () => {
    renderPage();

    expect(screen.getByTestId("oh-queue-status-all")).toHaveTextContent("All2");
    expect(screen.getByTestId("oh-queue-status-waiting")).toHaveTextContent("Waiting1");
    expect(screen.getByTestId("oh-queue-status-in_progress")).toHaveTextContent("In progress1");
    expect(screen.getByTestId("oh-queue-summary")).toHaveTextContent("Longest wait");

    fireEvent.click(screen.getByTestId("oh-queue-status-in_progress"));

    expect(screen.queryByText("Jane Doe")).not.toBeInTheDocument();
    expect(screen.getByText("Sam Banda")).toBeInTheDocument();
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
