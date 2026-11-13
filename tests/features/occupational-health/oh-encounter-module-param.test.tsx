import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

import {
  resolveOhEncounterPanelParam,
  useOhEncounterModuleParam,
} from "@/features/occupational-health/hooks/use-oh-encounter-module-param";

function Probe() {
  const [panel] = useOhEncounterModuleParam();
  return <div data-testid="panel">{panel}</div>;
}

afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/");
});

describe("useOhEncounterModuleParam", () => {
  it("defaults a bare visit URL to fitness and writes ?panel=fitness", async () => {
    window.history.replaceState(
      null,
      "",
      "/occupational-health/visit-1/enc-1",
    );
    render(<Probe />);
    expect(screen.getByTestId("panel").textContent).toBe("fitness");
    await waitFor(() => {
      expect(window.location.search).toBe("?panel=fitness");
    });
  });

  it("honours an explicit ?panel value", () => {
    window.history.replaceState(
      null,
      "",
      "/occupational-health/visit-1/enc-1?panel=immunizations",
    );
    render(<Probe />);
    expect(screen.getByTestId("panel").textContent).toBe("immunizations");
    expect(window.location.search).toBe("?panel=immunizations");
  });

  it("maps legacy exam panel aliases to medical examinations", () => {
    expect(resolveOhEncounterPanelParam("exam")).toBe("medical-examinations");
    expect(resolveOhEncounterPanelParam("examinations")).toBe("medical-examinations");
    expect(resolveOhEncounterPanelParam(null)).toBe("fitness");
    expect(resolveOhEncounterPanelParam("drug-alcohol")).toBe("drug-alcohol");
  });
});
