"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import {
  PageActionButton,
  SecondaryButton,
} from "@/components/ui/app-buttons";
import { fetchCatalogPricelistSettings } from "@/features/catalog/services/catalog.service";
import type {
  CatalogPricelist,
  CatalogPricelistSettings,
} from "@/features/catalog/types/catalog.types";
import {
  DEFAULT_PAYER_SYNC_DRAFT,
  PricelistPayerSyncDialog,
} from "@/features/inventory/components/detail/PricelistPayerSyncDialog";
import {
  SettingsFieldRow,
  SettingsPanelSection,
} from "@/features/settings/components/SettingsPageLayout";
import { useUser } from "@/providers/user-provider";

type PricelistDetailSettingsTabProps = {
  pricelist: CatalogPricelist;
  isActive: boolean;
  syncInProgress?: boolean;
  syncReloadToken?: number;
  onSyncStarted?: (jobUuid: string, toastId: string | number) => void;
};

export function PricelistDetailSettingsTab({
  pricelist,
  isActive,
  syncInProgress = false,
  syncReloadToken = 0,
  onSyncStarted,
}: PricelistDetailSettingsTabProps) {
  const { userData } = useUser();
  const isTenantAdmin = Boolean(userData?.is_admin);
  const [settings, setSettings] = useState<CatalogPricelistSettings | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      setError(null);
      const payload = await fetchCatalogPricelistSettings(pricelist.uuid);
      setSettings(payload);
    } catch (err) {
      setSettings(null);
      setError(err instanceof Error ? err.message : "Failed to load settings.");
    } finally {
      setIsLoading(false);
      setHasLoaded(true);
    }
  }, [pricelist.uuid]);

  useEffect(() => {
    if (!isActive) {
      return;
    }
    void loadSettings();
  }, [isActive, loadSettings]);

  useEffect(() => {
    if (!isActive || syncReloadToken <= 0) {
      return;
    }
    void loadSettings();
  }, [syncReloadToken]); // eslint-disable-line react-hooks/exhaustive-deps -- parent signals sync completion

  if (!isActive) {
    return null;
  }

  if (isLoading && !hasLoaded) {
    return (
      <div
        className="flex items-center gap-2 py-10 text-sm text-brand-muted"
        data-testid="pricelist-settings-tab-skeleton"
      >
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        Loading settings…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        <p>{error}</p>
        <SecondaryButton type="button" className="mt-4" onClick={() => void loadSettings()}>
          Try again
        </SecondaryButton>
      </div>
    );
  }

  const schemes = settings?.schemes ?? [];
  const coreProviderId = settings?.core_provider_id ?? null;
  const canResolveProvider = coreProviderId != null;
  const syncDisabledReason = !isTenantAdmin
    ? "You don't have permissions to run a sync."
    : !canResolveProvider
      ? "Add a service provider code on a linked practitioner mapping."
      : syncInProgress
        ? "A sync is already in progress."
        : null;
  const syncEnabled = syncDisabledReason == null;

  return (
    <div className="max-w-3xl space-y-8" data-testid="pricelist-settings-tab">
      <SettingsPanelSection
        title="Scheme mapping"
        description="Insurance schemes linked to this pricelist."
      >
        {schemes.length === 0 ? (
          <p className="text-sm text-slate-400">
            No insurance schemes are linked to this pricelist yet.
          </p>
        ) : (
          <div className="divide-y divide-brand-border border-y border-brand-border">
            {schemes.map((scheme) => (
              <div key={scheme.uuid} className="space-y-0 py-1">
                <SettingsFieldRow label="Scheme">{scheme.name}</SettingsFieldRow>
                <SettingsFieldRow label="Company">
                  {scheme.company_name || "—"}
                </SettingsFieldRow>
                <SettingsFieldRow label="Code">{scheme.code || "—"}</SettingsFieldRow>
                <SettingsFieldRow label="Status">
                  {scheme.is_active ? "Active" : "Inactive"}
                </SettingsFieldRow>
              </div>
            ))}
          </div>
        )}
      </SettingsPanelSection>

      <SettingsPanelSection
        title="MASM Core sync"
        description="Update this pricelist from MASM Core tariffs."
        action={
          <div className="flex flex-wrap items-center justify-end gap-2">
            {syncDisabledReason ? (
              <p
                className="max-w-xs text-right text-xs text-slate-400"
                data-testid="pricelist-masm-sync-hint"
              >
                {syncDisabledReason}
              </p>
            ) : coreProviderId != null ? (
              <p className="text-xs text-slate-400">Provider id {coreProviderId}</p>
            ) : null}
            <PageActionButton
              type="button"
              disabled={!syncEnabled}
              onClick={() => setConfirmOpen(true)}
              data-testid="pricelist-masm-sync-button"
            >
              Update from MASM Core
            </PageActionButton>
          </div>
        }
      >
        <p className="text-sm text-slate-400">
          Choose whether to update prices, product names, validity dates, and whether to
          import Core tariffs that are not yet in HMIS.
        </p>
      </SettingsPanelSection>

      <PricelistPayerSyncDialog
        pricelistUuid={pricelist.uuid}
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        payerName={settings?.sync_payer_name}
        coreProviderId={coreProviderId}
        initialDraft={DEFAULT_PAYER_SYNC_DRAFT}
        title="Update from MASM Core"
        onStarted={(jobUuid, toastId) => {
          onSyncStarted?.(jobUuid, toastId);
        }}
      />
    </div>
  );
}
