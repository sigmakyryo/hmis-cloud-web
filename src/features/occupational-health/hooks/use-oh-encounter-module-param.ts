"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import {
  isOhEncounterPanelId,
  type OhEncounterPanelId,
} from "@/features/occupational-health/lib/oh-encounter-modules";

const PANEL_PARAM = "panel";
const DEFAULT_PANEL: OhEncounterPanelId = "fitness";

function panelFromSearch(search: string | null | undefined): OhEncounterPanelId {
  const requested = search ?? null;
  // Back-compat: old ?tab=exam / ?panel=exam links open Medical Examinations.
  if (requested === "exam" || requested === "examinations") {
    return "medical-examinations";
  }
  if (requested === "employment") {
    return "employment";
  }
  return isOhEncounterPanelId(requested) ? requested : DEFAULT_PANEL;
}

/**
 * Seeds the active OH module from `?panel=` and mirrors changes with
 * `history.replaceState` so reloads keep the same module without a round trip.
 * A visit opened without `?panel` defaults to fitness and writes that into the URL.
 */
export function useOhEncounterModuleParam(): [
  OhEncounterPanelId,
  (panel: OhEncounterPanelId) => void,
] {
  const searchParams = useSearchParams();
  const [activePanel, setActivePanelState] = useState<OhEncounterPanelId>(() =>
    panelFromSearch(searchParams?.get(PANEL_PARAM)),
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requested = params.get(PANEL_PARAM);
    if (requested === "exam" || requested === "examinations" || isOhEncounterPanelId(requested)) {
      return;
    }
    params.set(PANEL_PARAM, DEFAULT_PANEL);
    params.delete("tab");
    const query = params.toString();
    window.history.replaceState(
      window.history.state,
      "",
      `${window.location.pathname}${query ? `?${query}` : ""}`,
    );
  }, []);

  function setActivePanel(panel: OhEncounterPanelId) {
    setActivePanelState(panel);
    const params = new URLSearchParams(window.location.search);
    params.set(PANEL_PARAM, panel);
    params.delete("tab");
    const query = params.toString();
    window.history.replaceState(
      window.history.state,
      "",
      `${window.location.pathname}${query ? `?${query}` : ""}`,
    );
  }

  return [activePanel, setActivePanel];
}

export function resolveOhEncounterPanelParam(
  search: string | null | undefined,
): OhEncounterPanelId {
  return panelFromSearch(search);
}
