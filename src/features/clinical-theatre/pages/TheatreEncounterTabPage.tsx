"use client";

import type { TheatreEncounterTabId } from "@/features/clinical-theatre/constants/theatre-workspace-routing";
import { EncounterTabPage } from "@/features/clinical-opd/pages/OpdEncounterTabPage";

export function TheatreEncounterTabPage({ tab }: { tab: TheatreEncounterTabId }) {
  return <EncounterTabPage tab={tab} />;
}
