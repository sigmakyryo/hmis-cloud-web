import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

import { ComplianceOverview } from "@/app/(app)/immunizations/_components/compliance/ComplianceOverview";

vi.mock("@/providers/toast-provider", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/features/occupational-health/services/immunisation.service", () => ({
  downloadOhImmComplianceCsv: vi.fn(),
}));

afterEach(cleanup);

it("renders empty state when summary is missing (BFF shape mismatch / error payload)", () => {
  render(<ComplianceOverview data={undefined} loading={false} />);
  expect(screen.getByText(/No compliance data/i)).toBeTruthy();
});

it("renders summary when Laravel object shape is passed as-is", () => {
  render(
    <ComplianceOverview
      loading={false}
      data={{
        summary: {
          people: 10,
          compliant: 8,
          percent_compliant: 80,
          overdue_rows: 2,
        },
        groups: [
          {
            group: "Acme",
            people: 10,
            compliant: 8,
            overdue: 2,
            percent_compliant: 80,
          },
        ],
        overdue: [],
      }}
    />,
  );
  expect(screen.getByText(/80% compliant/i)).toBeTruthy();
  expect(screen.getByText(/Acme/)).toBeTruthy();
});

it("does not crash when a list-wrapped payload lacks summary", () => {
  // Simulate the pre-fix BFF mistake: { results: { summary… } } typed as dashboard
  render(
    <ComplianceOverview
      loading={false}
      data={{ results: { summary: { people: 1 } } } as never}
    />,
  );
  expect(screen.getByText(/No compliance data/i)).toBeTruthy();
});
