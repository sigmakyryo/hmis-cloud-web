import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import {
  ASSISTANT_OPEN_KEY,
  OhCertificateReadiness,
} from "@/features/occupational-health/components/OhCertificateReadiness";
import { fetchVisitBrief } from "@/features/occupational-health/services/visit-copilot.service";

vi.mock("@/providers/toast-provider", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/providers/user-provider", () => ({
  useUser: () => ({ userData: { id: 7 } }),
}));

vi.mock("@/features/occupational-health/services/visit-copilot.service", () => ({
  fetchVisitBrief: vi.fn(),
  askVisitCopilot: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

function renderWithQuery(ui: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

const BRIEF = {
  refused: false,
  message: "Two items are still open.",
  points: [
    {
      fact_id: "fitness-overall",
      source: "fitness",
      label: "Fitness unknown",
      panel: "fitness",
      text: "No medical on file.",
    },
  ],
  draft: { wording: "Not ready to certify.", restrictions: ["No night shift"] },
};

beforeEach(() => {
  window.localStorage.removeItem(ASSISTANT_OPEN_KEY);
  vi.mocked(fetchVisitBrief).mockResolvedValue(BRIEF);
});

afterEach(() => {
  window.localStorage.removeItem(ASSISTANT_OPEN_KEY);
  cleanup();
});

it("stays expanded when the assistant is not collapsible", async () => {
  renderWithQuery(<OhCertificateReadiness visitUuid="visit-1" gateWarnings={["HepB booster due"]} />);

  expect(await screen.findByText("Two items are still open.")).toBeTruthy();
  expect(screen.getByTestId("oh-cof-readiness").getAttribute("data-collapsed")).toBeNull();
  expect(screen.queryByTestId("oh-cof-assistant-toggle")).toBeNull();
  expect(screen.getByTestId("oh-cof-readiness-summary").textContent).toBe("2 to review");
});

it("collapses the assistant by default and shows the review-count badge", async () => {
  renderWithQuery(
    <OhCertificateReadiness visitUuid="visit-1" collapsible gateWarnings={["HepB booster due"]} />,
  );

  const aside = screen.getByTestId("oh-cof-readiness");
  expect(aside.getAttribute("data-collapsed")).toBe("true");
  const toggle = screen.getByTestId("oh-cof-assistant-toggle");
  expect(toggle).toBeVisible();
  expect(toggle).toHaveAttribute("aria-expanded", "false");
  expect(screen.queryByText("Two items are still open.")).toBeNull();
  expect(screen.queryByTestId("oh-cof-assistant-body")).toBeNull();

  await waitFor(() =>
    expect(screen.getByTestId("oh-cof-assistant-review-count")).toHaveTextContent("2"),
  );
  expect(toggle).toHaveAccessibleName(/Show assistant, 2 to review/);

  fireEvent.click(toggle);
  expect(aside.getAttribute("data-collapsed")).toBeNull();
  expect(await screen.findByText("Two items are still open.")).toBeTruthy();
  expect(screen.getByTestId("oh-cof-readiness-summary").textContent).toBe("2 to review");
  expect(window.localStorage.getItem(ASSISTANT_OPEN_KEY)).toBe("1");

  fireEvent.click(screen.getByTestId("oh-cof-assistant-toggle"));
  expect(aside.getAttribute("data-collapsed")).toBe("true");
  expect(window.localStorage.getItem(ASSISTANT_OPEN_KEY)).toBe("0");
  expect(screen.queryByText("Two items are still open.")).toBeNull();
});

it("opens the collapsible assistant when the stored preference is open", async () => {
  window.localStorage.setItem(ASSISTANT_OPEN_KEY, "1");
  renderWithQuery(
    <OhCertificateReadiness visitUuid="visit-1" collapsible gateWarnings={["HepB booster due"]} />,
  );

  await waitFor(() =>
    expect(screen.getByTestId("oh-cof-readiness").getAttribute("data-collapsed")).toBeNull(),
  );
  expect(await screen.findByText("Two items are still open.")).toBeTruthy();
});
