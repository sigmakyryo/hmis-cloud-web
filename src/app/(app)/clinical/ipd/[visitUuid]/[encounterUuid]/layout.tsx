import type { ReactNode } from "react";

import { IpdEncounterWorkspacePage } from "@/features/clinical-ipd/pages/IpdEncounterWorkspacePage";

type Props = {
  children: ReactNode;
  params: Promise<{ visitUuid: string; encounterUuid: string }>;
};

export default async function Layout({ children, params }: Props) {
  const { visitUuid, encounterUuid } = await params;
  return (
    <IpdEncounterWorkspacePage visitUuid={visitUuid} encounterUuid={encounterUuid}>
      {children}
    </IpdEncounterWorkspacePage>
  );
}
