import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { OhVisitJourneyRail } from "@/features/occupational-health/components/workspace/OhVisitJourneyRail";

vi.mock("@/features/occupational-health/hooks/use-oh-workspace-layout", () => ({
  useOhWorkspaceLayout: () => ({
    included: ["immunizations", "drug-alcohol", "health-programs", "injuries", "employment", "exposure"],
    isReady: true,
    isLoading: false,
    isError: false,
  }),
}));

afterEach(cleanup);

describe("OhVisitJourneyRail", () => {
  it("omits a record whose area is switched off", () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={client}>
        <OhVisitJourneyRail
          steps={[{ kind: "examination", title: "Examination" }]}
          activeStep="examination"
          liveStep="examination"
          statuses={{ examination: "in_progress" }}
          activePanel="medical-examinations"
          onSelectStep={() => undefined}
          onSelectModule={() => undefined}
        />
      </QueryClientProvider>,
    );

    expect(screen.getByTestId("oh-journey-module-immunizations")).toBeInTheDocument();
    expect(screen.queryByTestId("oh-journey-module-fitness")).not.toBeInTheDocument();
  });
});
