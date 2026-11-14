"use client";

import { Suspense, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { SettingsContentSkeleton } from "@/features/settings/components/SettingsContentSkeleton";
import { OhEmployerSettingsPage } from "@/features/settings/components/modules/occupational-health/OhEmployerSettingsPage";
import { OhEmployersSettingsTab } from "@/features/settings/components/modules/occupational-health/OhEmployersSettingsTab";
import { OhVisitTypesSettingsTab } from "@/features/settings/components/modules/occupational-health/OhVisitTypesSettingsTab";
import { OhDispensingSettingsTab } from "@/features/settings/components/modules/occupational-health/OhDispensingSettingsTab";
import { cn } from "@/lib/utils";

export type OhModuleTabId = "employers" | "visit-types" | "dispensing";

export const OH_MODULE_TABS: Array<{ id: OhModuleTabId; label: string }> = [
  { id: "employers", label: "Employers" },
  { id: "visit-types", label: "Visit services" },
  { id: "dispensing", label: "Dispensing" },
];

function parseTab(value: string | null): OhModuleTabId {
  return OH_MODULE_TABS.find((tab) => tab.id === value)?.id ?? "employers";
}

function OhModuleSettingsTabsInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = useMemo(
    () => parseTab(searchParams.get("tab")),
    [searchParams],
  );

  const employerUuid = searchParams.get("employer");

  function setActiveTab(tab: OhModuleTabId) {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "employers") {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  if (employerUuid) {
    return <OhEmployerSettingsPage employerUuid={employerUuid} />;
  }

  return (
    <div>
      <nav
        aria-label="Occupational health module settings"
        className="flex gap-6 border-b border-dash-border"
      >
        {OH_MODULE_TABS.map((tab) => {
          const selected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              aria-current={selected ? "page" : undefined}
              className={cn(
                "-mb-px border-b-2 pb-2.5 text-[13px]",
                selected
                  ? "border-brand-navy font-medium text-brand-navy"
                  : "border-transparent text-dash-muted hover:text-brand-navy",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>
      <div>
        <OhEmployersSettingsTab isActive={activeTab === "employers"} />
        <OhVisitTypesSettingsTab isActive={activeTab === "visit-types"} />
        <OhDispensingSettingsTab isActive={activeTab === "dispensing"} />
      </div>
    </div>
  );
}

export function OhModuleSettingsTabs() {
  return (
    <Suspense fallback={<SettingsContentSkeleton />}>
      <OhModuleSettingsTabsInner />
    </Suspense>
  );
}
