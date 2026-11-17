import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AnnualDashboard } from "@/features/employer-portal/annual/AnnualDashboard";
import type { AnnualReport } from "@/features/occupational-health/services/oh-annual-report.service";

vi.mock("next/dynamic", () => ({
  default: () =>
    function Chart({ data, label }: { data: Array<{ year: string; value: number | null }>; label: string }) {
      return <div data-testid="trend-chart">{`${label}: ${data.map((point) => `${point.year}=${point.value ?? "gap"}`).join(",")}`}</div>;
    },
}));

afterEach(cleanup);

function report(year: number, scale: number, hidden = false): AnnualReport {
  return {
    year,
    audience: "employer",
    employer: null,
    generated_at: "",
    suppression: "Counts under 5 are hidden.",
    sections: {
      workforce: { "Workers on file during the year": 100 * scale },
      medicals: { Examinations: hidden ? "<5" : 50 * scale, "Examinations: periodic": hidden ? "<5" : 30 * scale, "Examinations: exit": hidden ? "<5" : 20 * scale },
      fitness: { "Outcome: fit": 40, "Certificates issued": 45 },
      surveillance: { Completed: 30, "Not completed": 10, "Completion %": "75" },
      injuries: { "Injury on duty cases": 3 },
      sick_leave: { "Sick-leave days": 12 },
      drug_alcohol: { "Tests collected": 8, "Reason: random": 8 },
      health_programmes: { "Wellbeing · recorded": 6 },
      immunisation: {},
      exposure: { "Exposure results recorded": 9 },
    },
  };
}

const series = [
  { year: 2024, report: report(2024, 1) },
  { year: 2025, report: report(2025, 2) },
  { year: 2026, report: report(2026, 3, true) },
];

describe("annual dashboard", () => {
  it("shows the figures with the change on the year before", () => {
    render(<AnnualDashboard series={series.slice(0, 2)} year={2025} accent="#f26a1b" />);
    const stats = within(screen.getByTestId("portal-stats"));
    expect(stats.getByText("200")).toBeTruthy();
    expect(stats.getByText("+100 vs 2024")).toBeTruthy();
    expect(stats.getByText("75%")).toBeTruthy();
  });

  it("charts the chosen measure and switches measure", () => {
    render(<AnnualDashboard series={series} year={2025} accent="#f26a1b" />);
    expect(screen.getByTestId("trend-chart").textContent).toBe("Examinations: 2024=50,2025=100,2026=gap");
    fireEvent.click(screen.getByRole("button", { name: "Workers" }));
    expect(screen.getByTestId("trend-chart").textContent).toBe("Workers: 2024=100,2025=200,2026=300");
  });

  it("breaks examinations down and explains hidden small numbers", () => {
    const { rerender } = render(<AnnualDashboard series={series} year={2025} accent="#f26a1b" />);
    expect(screen.getByText("Periodic")).toBeTruthy();
    expect(screen.getByText("Exit")).toBeTruthy();
    rerender(<AnnualDashboard series={series} year={2026} accent="#f26a1b" />);
    expect(screen.getByText("Small numbers are hidden to protect privacy.")).toBeTruthy();
  });

  it("lists the other sections in the side column and the privacy note", () => {
    render(<AnnualDashboard series={series} year={2025} accent="#f26a1b" suppression="Counts under 5 are hidden." />);
    expect(screen.getByText("More from 2025")).toBeTruthy();
    expect(screen.getByText("Wellbeing · recorded")).toBeTruthy();
    expect(screen.getByText("Counts under 5 are hidden.")).toBeTruthy();
  });
});
