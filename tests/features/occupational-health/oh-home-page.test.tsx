import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ROUTES } from "@/constants/routes";
import { OhModuleBar } from "@/features/occupational-health/components/OhModuleBar";
import { recordOhRecentPage } from "@/features/occupational-health/lib/oh-recent-pages";
import { OhHomePage } from "@/features/occupational-health/pages/OhHomePage";

const nav = vi.hoisted(() => ({
  replace: vi.fn(),
  pathname: "/occupational-health/home",
  search: "",
}));

const queue = vi.hoisted(() => ({
  encounters: [] as Array<Record<string, unknown>>,
  compliance: null as { overdue: number; due: number } | null,
}));

const user = vi.hoisted(() => ({
  value: {
    userData: { groups: ["OccupationalHealth"], enabled_modules: ["OccupationalHealth"], is_admin: false },
    isLoading: false,
  } as { userData: unknown; isLoading: boolean },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: nav.replace, prefetch: vi.fn() }),
  usePathname: () => nav.pathname,
  useSearchParams: () => new URLSearchParams(nav.search),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@/providers/user-provider", () => ({
  useUser: () => user.value,
}));

vi.mock("@/features/occupational-health/hooks/use-occupational-health", () => ({
  useOhEncounters: () => ({
    data: queue.encounters,
    isLoading: false,
    isSuccess: true,
    isError: false,
    refetch: vi.fn(),
  }),
  useOhComplianceDashboard: () => ({ data: queue.compliance }),
}));

afterEach(cleanup);

describe("OhHomePage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    queue.encounters = [];
    queue.compliance = null;
    nav.replace.mockReset();
    nav.pathname = "/occupational-health/home";
    nav.search = "";
    user.value = {
      userData: { groups: ["OccupationalHealth"], enabled_modules: ["OccupationalHealth"], is_admin: false },
      isLoading: false,
    };
  });

  it("opens on the clinic module with its pages and a start link", () => {
    render(<OhHomePage />);

    const detail = screen.getByTestId("oh-home-module-detail");
    expect(within(detail).getByRole("heading", { name: "OHS clinic" })).toBeInTheDocument();
    expect(within(detail).getByRole("link", { name: "Open queue" })).toHaveAttribute("href", ROUTES.occupationalHealth);
    expect(within(detail).getByText("No visits in the queue.")).toBeInTheDocument();
    expect(within(detail).getByRole("link", { name: /^Employees/ })).toHaveAttribute(
      "href",
      ROUTES.occupationalHealthEmployees,
    );
    expect(screen.getByTestId("oh-home-module-clinic")).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("heading", { level: 1, name: "Occupational Health" })).toHaveClass("sr-only");
  });

  it("lists the visits waiting in the clinic queue", () => {
    queue.encounters = [
      {
        uuid: "enc-1",
        visit: "visit-1",
        customer_name: "Owen Onions",
        customer_uuid: "worker-1",
        employer_name: "Illovo",
        department_name: "OHS",
        status: "waiting",
        started_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      },
    ];
    queue.compliance = { overdue: 4, due: 2 };

    render(<OhHomePage />);

    const row = screen.getByTestId("oh-home-queue-row");
    expect(row).toHaveAttribute("href", ROUTES.occupationalHealthEncounter("visit-1", "enc-1"));
    expect(row).toHaveTextContent("Owen Onions");
    expect(row).toHaveTextContent("Illovo");
    expect(screen.getByRole("link", { name: /^OHS Compliance/ })).toHaveTextContent("4 overdue, 2 due");
  });

  it("lists recently opened OH pages", () => {
    recordOhRecentPage(ROUTES.drugAlcoholMro);
    recordOhRecentPage("/not-an-oh-page");

    render(<OhHomePage />);

    const recent = screen.getByTestId("oh-home-recent");
    expect(within(recent).getAllByRole("link")).toHaveLength(1);
    expect(within(recent).getByRole("link", { name: /MRO review/ })).toHaveAttribute("href", ROUTES.drugAlcoholMro);
  });

  it("focuses search when / is pressed", () => {
    render(<OhHomePage />);

    fireEvent.keyDown(window, { key: "/" });

    expect(screen.getByTestId("oh-home-search")).toHaveFocus();
  });

  it("shows the module named in the URL", () => {
    nav.search = "module=drug-alcohol";

    render(<OhHomePage />);

    const detail = screen.getByTestId("oh-home-module-detail");
    expect(within(detail).getByRole("heading", { name: "Drug & Alcohol" })).toBeInTheDocument();
    expect(within(detail).getByRole("link", { name: /MRO review/ })).toHaveAttribute("href", ROUTES.drugAlcoholMro);
  });

  it("writes the chosen module to the URL", () => {
    render(<OhHomePage />);

    fireEvent.click(screen.getByTestId("oh-home-module-fitness"));

    expect(nav.replace).toHaveBeenCalledWith("/occupational-health/home?module=fitness", { scroll: false });
  });

  it("searches pages across modules", () => {
    render(<OhHomePage />);

    fireEvent.change(screen.getByTestId("oh-home-search"), { target: { value: "spirometry" } });

    const links = screen.getAllByTestId("oh-home-page-link");
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute("href", ROUTES.healthProgramsLung);
    expect(links[0]).toHaveTextContent("Health programs");
  });

  it("says when no page matches", () => {
    render(<OhHomePage />);

    fireEvent.change(screen.getByTestId("oh-home-search"), { target: { value: "zzz" } });

    expect(screen.getByTestId("oh-home-no-results")).toBeInTheDocument();
  });

  it("denies access without OH modules", () => {
    user.value = { userData: { groups: ["Registration"], enabled_modules: ["Registration"] }, isLoading: false };

    render(<OhHomePage />);

    expect(screen.getByTestId("oh-access-denied")).toBeInTheDocument();
  });
});

describe("OhModuleBar", () => {
  beforeEach(() => {
    user.value = {
      userData: { groups: ["OccupationalHealth"], enabled_modules: ["OccupationalHealth"], is_admin: false },
      isLoading: false,
    };
  });

  it("shows the module's pages as tabs with the current one marked", () => {
    nav.pathname = ROUTES.drugAlcoholMro;

    render(<OhModuleBar />);

    const tabs = screen.getByRole("navigation", { name: "Drug & Alcohol pages" });
    expect(within(tabs).getByRole("link", { name: "MRO review" })).toHaveAttribute("aria-current", "page");
    expect(within(tabs).getByRole("link", { name: "Due" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: "All Occupational Health modules" })).toHaveAttribute(
      "href",
      ROUTES.occupationalHealthHome,
    );
  });

  it("stays hidden on the OH home page", () => {
    nav.pathname = ROUTES.occupationalHealthHome;

    render(<OhModuleBar />);

    expect(screen.queryByTestId("oh-module-bar")).not.toBeInTheDocument();
  });
});
