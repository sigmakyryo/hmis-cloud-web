"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { TheatreRoomsSettingsPanel } from "@/features/clinical-theatre/components/TheatreRoomsSettingsPanel";
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

export type TheatreModuleTabId = "rooms" | "capabilities";

const TABS: Array<{ id: TheatreModuleTabId; label: string }> = [
  { id: "rooms", label: "Rooms" },
  { id: "capabilities", label: "Role capabilities" },
];

function parseTab(value: string | null): TheatreModuleTabId {
  return value === "capabilities" ? "capabilities" : "rooms";
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
