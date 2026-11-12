"use client";

import { IPD_WORKSPACE_ROUTING } from "@/features/clinical-ipd/constants/ipd-workspace-routing";
import { ClinicalQueuePage } from "@/features/clinical-opd/pages/ClinicalQueuePage";

export function IpdQueuePage() {
  return <ClinicalQueuePage routing={IPD_WORKSPACE_ROUTING} />;
}
