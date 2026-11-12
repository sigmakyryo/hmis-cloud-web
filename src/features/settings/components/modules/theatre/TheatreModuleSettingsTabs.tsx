"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { TheatreCssdSettingsPanel } from "@/features/clinical-theatre/components/TheatreCssdSettingsPanel";
import { TheatreMonitorsSettingsPanel } from "@/features/clinical-theatre/components/TheatreMonitorsSettingsPanel";
import { TheatreCancellationReasonsSettingsPanel } from "@/features/clinical-theatre/components/TheatreCancellationReasonsSettingsPanel";
import { TheatrePreferenceCardsSettingsPanel } from "@/features/clinical-theatre/components/TheatrePreferenceCardsSettingsPanel";
import { TheatrePreOpRulesSettingsPanel } from "@/features/clinical-theatre/components/TheatrePreOpRulesSettingsPanel";
import { TheatreProcedureCodesSettingsPanel } from "@/features/clinical-theatre/components/TheatreProcedureCodesSettingsPanel";
import { TheatreRoomsSettingsPanel } from "@/features/clinical-theatre/components/TheatreRoomsSettingsPanel";
import { TheatreSessionsSettingsPanel } from "@/features/clinical-theatre/components/TheatreSessionsSettingsPanel";
import { TheatreUrgencyCategoriesSettingsPanel } from "@/features/clinical-theatre/components/TheatreUrgencyCategoriesSettingsPanel";
import {
  useRoleCapabilities,
  useUpdateRoleCapabilities,
} from "@/features/clinical-opd/hooks/use-clinical-opd";
import {
  ClinicalRoleCapabilitiesMatrix,
  THEATRE_CAPABILITY_ROLES,
  type ClinicalCapabilityRoleKey,
} from "@/features/settings/components/ClinicalRoleCapabilitiesMatrix";
import { SettingsContentSkeleton } from "@/features/settings/components/SettingsContentSkeleton";
import {
  SettingsSection,
  SettingsUnderlineTabs,
} from "@/features/settings/components/SettingsPageLayout";
import { THEATRE_ROLE_CAPABILITIES } from "@/features/settings/constants/clinical-role-capability-config";

export type TheatreModuleTabId =
  | "rooms"
  | "sessions"
  | "urgency-categories"
  | "pre-op-rules"
  | "cancellations"
  | "preference-cards"
  | "procedure-codes"
  | "cssd"
  | "monitors"
  | "capabilities";

const TABS: Array<{ id: TheatreModuleTabId; label: string }> = [
  { id: "rooms", label: "Rooms" },
  { id: "sessions", label: "Sessions" },
  { id: "urgency-categories", label: "Waiting list categories" },
  { id: "pre-op-rules", label: "Pre-op test rules" },
  { id: "cancellations", label: "Cancellation reasons" },
  { id: "preference-cards", label: "Preference cards" },
  { id: "procedure-codes", label: "Procedure codes" },
  { id: "cssd", label: "CSSD & counts" },
  { id: "monitors", label: "Monitors & family board" },
  { id: "capabilities", label: "Role capabilities" },
];

function parseTab(value: string | null): TheatreModuleTabId {
  if (
    value === "capabilities" ||
    value === "sessions" ||
    value === "urgency-categories" ||
    value === "pre-op-rules" ||
    value === "cancellations" ||
    value === "preference-cards" ||
    value === "procedure-codes" ||
    value === "cssd" ||
    value === "monitors"
  ) {
    return value;
  }
  return "rooms";
}

export function TheatreModuleSettingsTabs() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = useMemo(
    () => parseTab(searchParams.get("tab")),
    [searchParams],
  );

  function setActiveTab(tab: TheatreModuleTabId) {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "rooms") {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return (
    <div data-testid="theatre-module-settings">
      <SettingsUnderlineTabs
        tabs={TABS}
        activeTab={activeTab}
        onChange={setActiveTab}
        ariaLabel="Theatre module settings"
      />

      <div className="pt-6">
        {activeTab === "rooms" ? <TheatreRoomsSettingsPanel /> : null}
        {activeTab === "sessions" ? <TheatreSessionsSettingsPanel /> : null}
        {activeTab === "urgency-categories" ? (
          <TheatreUrgencyCategoriesSettingsPanel />
        ) : null}
        {activeTab === "pre-op-rules" ? <TheatrePreOpRulesSettingsPanel /> : null}
        {activeTab === "cancellations" ? (
          <TheatreCancellationReasonsSettingsPanel />
        ) : null}
        {activeTab === "preference-cards" ? (
          <TheatrePreferenceCardsSettingsPanel />
        ) : null}
        {activeTab === "procedure-codes" ? (
          <TheatreProcedureCodesSettingsPanel />
        ) : null}
        {activeTab === "cssd" ? <TheatreCssdSettingsPanel /> : null}
        {activeTab === "monitors" ? <TheatreMonitorsSettingsPanel /> : null}
        {activeTab === "capabilities" ? <TheatreRoleCapabilitiesTab /> : null}
      </div>
    </div>
  );
}

function TheatreRoleCapabilitiesTab() {
  const { data = [], isLoading } = useRoleCapabilities();
  const updateCapabilities = useUpdateRoleCapabilities();
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);

  if (isLoading) {
    return <SettingsContentSkeleton variant="matrix" />;
  }

  async function toggleCapability(
    role: ClinicalCapabilityRoleKey,
    capability: string,
    enabled: boolean,
  ) {
    const key = `${role}:${capability}`;
    setUpdatingKey(key);
    try {
      await updateCapabilities.mutateAsync([
        { user_role: role, capability, enabled },
      ]);
    } finally {
      setUpdatingKey(null);
    }
  }

  return (
    <SettingsSection
      title="Role capabilities"
      description="Choose what nurses and physicians can do in theatre. Tenant administrators always have every capability."
      flush
    >
      <ClinicalRoleCapabilitiesMatrix
        capabilities={THEATRE_ROLE_CAPABILITIES}
        roles={THEATRE_CAPABILITY_ROLES}
        entries={data}
        updatingKey={updatingKey}
        onToggle={(role, capability, enabled) =>
          void toggleCapability(role, capability, enabled)
        }
      />
    </SettingsSection>
  );
}
