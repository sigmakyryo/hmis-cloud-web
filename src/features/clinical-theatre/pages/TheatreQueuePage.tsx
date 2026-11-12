"use client";

import { THEATRE_WORKSPACE_ROUTING } from "@/features/clinical-theatre/constants/theatre-workspace-routing";
import { ClinicalQueuePage } from "@/features/clinical-opd/pages/ClinicalQueuePage";

export function TheatreQueuePage() {
  return <ClinicalQueuePage routing={THEATRE_WORKSPACE_ROUTING} />;
}
