"use client";

import { useQuery } from "@tanstack/react-query";
import { MoreVertical } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { SecondaryButton } from "@/components/ui/app-buttons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROUTES } from "@/constants/routes";
import { isModuleEnabled } from "@/features/app-shell/utils/module-entitlements";
import { RecordIodDialog } from "@/features/clinical-opd/components/detail/RecordIodDialog";
import { useOpdEncounterWorkspace } from "@/features/clinical-opd/components/detail/opd-encounter-workspace-context";
import {
  fetchIodForEncounter,
  iodForEncounterKey,
} from "@/features/occupational-health/iod-case/iod-from-visit.service";
import { canAccessOccupationalHealth } from "@/features/occupational-health/utils/oh-access";
import { appFont } from "@/lib/fonts";
import { useUser } from "@/providers/user-provider";

/**
 * The encounter's ⋮ menu. Today it holds one action, recording an injury on duty; it is hidden for tenants
 * without the Occupational Health module. Any clinician who can open the encounter can record an injury, but
 * only OH staff can open the case afterwards.
 */
export function OpdEncounterMoreMenu() {
  const { userData } = useUser();
  const { visitUuid, encounterUuid, encounter } = useOpdEncounterWorkspace();
  const [recording, setRecording] = useState(false);
  const moduleEnabled = isModuleEnabled(userData, "OccupationalHealth");
  const canOpenCase = canAccessOccupationalHealth(userData);

  const recorded = useQuery({
    queryKey: iodForEncounterKey(encounterUuid),
    queryFn: () => fetchIodForEncounter(encounterUuid),
    enabled: moduleEnabled && Boolean(encounterUuid),
    retry: false,
    staleTime: 30_000,
  });

  if (!moduleEnabled || !encounterUuid || !visitUuid) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SecondaryButton
            type="button"
            size="sm"
            aria-label="More actions"
            className="px-2"
            data-testid="opd-encounter-more-menu"
          >
            <MoreVertical className="size-4" aria-hidden="true" />
          </SecondaryButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className={appFont.className}>
          {recorded.data ? (
            canOpenCase ? (
              <DropdownMenuItem asChild>
                <Link href={ROUTES.occupationalHealthRecord("iod", recorded.data.uuid)}>View IOD case</Link>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem disabled>Injury on duty recorded</DropdownMenuItem>
            )
          ) : (
            <DropdownMenuItem disabled={recorded.isLoading} onSelect={() => setRecording(true)}>
              Record injury on duty
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <RecordIodDialog
        open={recording}
        onOpenChange={setRecording}
        visitUuid={visitUuid}
        encounterUuid={encounterUuid}
        startedAt={encounter?.started_at}
        canOpenCase={canOpenCase}
      />
    </>
  );
}
