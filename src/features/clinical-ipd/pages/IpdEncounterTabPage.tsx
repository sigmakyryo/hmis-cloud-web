"use client";

import type { IpdEncounterTabId } from "@/features/clinical-ipd/constants/ipd-workspace-routing";
import { EncounterTabPage } from "@/features/clinical-opd/pages/OpdEncounterTabPage";

export function IpdEncounterTabPage({ tab }: { tab: IpdEncounterTabId }) {
  return <EncounterTabPage tab={tab} />;
}
