import { redirect } from "next/navigation";

import { theatreLegacySegmentHref } from "@/features/clinical-theatre/constants/theatre-workspace-routing";

type Props = { params: Promise<{ visitUuid: string; encounterUuid: string }> };

/** Old "checklist" tab: now part of a grouped theatre section. */
export default async function Page({ params }: Props) {
  const { visitUuid, encounterUuid } = await params;
  redirect(theatreLegacySegmentHref(visitUuid, encounterUuid, "checklist"));
}
