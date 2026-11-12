import type { ReactNode } from "react";

import { TheatreEncounterWorkspacePage } from "@/features/clinical-theatre/pages/TheatreEncounterWorkspacePage";

type Props = {
  children: ReactNode;
  params: Promise<{ visitUuid: string; encounterUuid: string }>;
};

export default async function Layout({ children, params }: Props) {
  const { visitUuid, encounterUuid } = await params;
  return (
    <TheatreEncounterWorkspacePage visitUuid={visitUuid} encounterUuid={encounterUuid}>
      {children}
    </TheatreEncounterWorkspacePage>
  );
}
