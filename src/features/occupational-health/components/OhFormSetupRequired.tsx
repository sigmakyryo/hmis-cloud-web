import { ROUTES } from "@/constants/routes";
import { OhExaminationSetupState } from "@/features/occupational-health/components/OhExaminationSetupState";
import type { OhHazardProfile } from "@/features/occupational-health/types";
import { useUser } from "@/providers/user-provider";

export function OhFormSetupRequired({
  form,
  profile,
  pinned = false,
  refreshing,
  onRecheck,
}: {
  form: string;
  profile: OhHazardProfile | null;
  pinned?: boolean;
  refreshing: boolean;
  onRecheck: () => void;
}) {
  const { userData } = useUser();
  const canConfigure = Boolean(userData?.is_admin);
  const href = profile?.employer_uuid
    ? `${ROUTES.settingsOccupationalHealthEmployer(profile.employer_uuid, "risk-profiles")}&profile=${encodeURIComponent(profile.uuid)}`
    : ROUTES.settingsModuleOccupationalHealth;

  return (
    <OhExaminationSetupState
      title={`Set up ${form}`}
      description={pinned
        ? "This visit already has answers linked to an archived form. Restore the original form in Occupational Health Forms to continue this visit."
        : "Choose an active, published form in the employer’s risk profile. You can restore archived forms from Occupational Health Forms."}
      href={canConfigure ? href : undefined}
      actionLabel="Edit risk profile forms"
      needsAdministrator={!canConfigure}
      refreshing={refreshing}
      onRecheck={onRecheck}
    />
  );
}
