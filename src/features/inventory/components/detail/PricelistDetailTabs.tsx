"use client";

import { useCallback, useRef, useState } from "react";

import {
  DetailPageMainSection,
  DetailPageTabNavItem,
  DetailPageTabsNavSection,
  DetailPageTabsSection,
} from "@/features/app-shell/components/page-layout";
import type {
  CatalogPricelist,
  CatalogPricelistMasmCoreSyncJob,
} from "@/features/catalog/types/catalog.types";
import { PricelistDetailActivityTab } from "@/features/inventory/components/detail/PricelistDetailActivityTab";
import { PricelistDetailAdvisorPackTab } from "@/features/inventory/components/detail/PricelistDetailAdvisorPackTab";
import { PricelistDetailPriceChangesTab } from "@/features/inventory/components/detail/PricelistDetailPriceChangesTab";
import { PricelistDetailProductsTab } from "@/features/inventory/components/detail/PricelistDetailProductsTab";
import { PricelistDetailRulesTab } from "@/features/inventory/components/detail/PricelistDetailRulesTab";
import { PricelistDetailSettingsTab } from "@/features/inventory/components/detail/PricelistDetailSettingsTab";
import { showPricelistSyncResultToast } from "@/features/inventory/components/detail/PricelistSyncResultToast";
import { usePricelistMasmSyncJobPoll } from "@/features/inventory/hooks/use-pricelist-masm-sync-job-poll";
import { useToast } from "@/providers/toast-provider";

type PricelistDetailTabsProps = {
  pricelist: CatalogPricelist;
};

type DetailTabId =
  | "products"
  | "rules"
  | "approvals"
  | "advisor"
  | "settings"
  | "activity";

const tabs: Array<{ id: DetailTabId; label: string }> = [
  { id: "products", label: "Products" },
  { id: "rules", label: "Payment rules" },
  { id: "approvals", label: "Price approvals" },
  { id: "advisor", label: "Advisor pack" },
  { id: "settings", label: "Settings" },
  { id: "activity", label: "Activity" },
];

export function PricelistDetailTabs({ pricelist }: PricelistDetailTabsProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<DetailTabId>("products");
  const [syncJobUuid, setSyncJobUuid] = useState<string | null>(null);
  const [syncReloadToken, setSyncReloadToken] = useState(0);
  const syncToastIdRef = useRef<string | number | null>(null);

  const handleSyncStarted = useCallback((jobUuid: string, toastId: string | number) => {
    syncToastIdRef.current = toastId;
    setSyncJobUuid(jobUuid);
  }, []);

  const handleSyncTerminal = useCallback(
    (job: CatalogPricelistMasmCoreSyncJob) => {
      const loadingToastId = syncToastIdRef.current;
      if (job.status === "completed") {
        showPricelistSyncResultToast(
          {
            matched: job.matched,
            updated: job.updated,
            unchanged: job.unchanged,
            imported: job.imported,
            approval_required: job.approval_required,
            names_updated: job.names_updated ?? 0,
          },
          {
            replaceId: loadingToastId ?? undefined,
            title: "MASM Core prices synced",
          },
        );
      } else {
        toast({
          id: loadingToastId ?? undefined,
          variant: "error",
          title: "MASM Core sync failed",
          description:
            job.failure_message || "Prices could not be synced from MASM Core.",
        });
      }
      syncToastIdRef.current = null;
      setSyncJobUuid(null);
      setSyncReloadToken((token) => token + 1);
    },
    [toast],
  );

  usePricelistMasmSyncJobPoll(pricelist.uuid, syncJobUuid, {
    onTerminal: handleSyncTerminal,
  });

  const syncInProgress = Boolean(syncJobUuid);

  return (
    <DetailPageTabsSection>
      <DetailPageTabsNavSection aria-label="Pricelist sections">
        {tabs.map((tab) => (
          <DetailPageTabNavItem
            key={tab.id}
            isActive={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </DetailPageTabNavItem>
        ))}
      </DetailPageTabsNavSection>

      <DetailPageMainSection>
        <PricelistDetailProductsTab
          pricelist={pricelist}
          isActive={activeTab === "products"}
          syncInProgress={syncInProgress}
          syncReloadToken={syncReloadToken}
          onSyncStarted={handleSyncStarted}
        />
        <PricelistDetailRulesTab pricelist={pricelist} isActive={activeTab === "rules"} />
        <PricelistDetailPriceChangesTab
          pricelist={pricelist}
          isActive={activeTab === "approvals"}
        />
        <PricelistDetailAdvisorPackTab
          pricelist={pricelist}
          isActive={activeTab === "advisor"}
        />
        <PricelistDetailSettingsTab
          pricelist={pricelist}
          isActive={activeTab === "settings"}
          syncInProgress={syncInProgress}
          syncReloadToken={syncReloadToken}
          onSyncStarted={handleSyncStarted}
        />
        <PricelistDetailActivityTab
          pricelist={pricelist}
          isActive={activeTab === "activity"}
        />
      </DetailPageMainSection>
    </DetailPageTabsSection>
  );
}
