"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import {
  PrimaryButton,
  SecondaryButton,
} from "@/components/ui/app-buttons";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { startCatalogMasmCorePriceSync } from "@/features/catalog/services/catalog.service";
import { BffError } from "@/lib/bff-client";
import { formatBffErrorMessage } from "@/lib/bff-field-errors";
import { appFont } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import { useToast } from "@/providers/toast-provider";

export type PricelistPayerSyncDraft = {
  updateFixedPrice: boolean;
  updateName: boolean;
  importMissingTariffs: boolean;
  updateValidity: boolean;
  dateStart: string;
  dateEnd: string;
};

export const DEFAULT_PAYER_SYNC_DRAFT: PricelistPayerSyncDraft = {
  updateFixedPrice: true,
  updateName: false,
  importMissingTariffs: false,
  updateValidity: false,
  dateStart: "",
  dateEnd: "",
};

/** Defaults for the products-tab entry point (pull missing payer tariffs). */
export const PRODUCTS_TAB_PAYER_SYNC_DRAFT: PricelistPayerSyncDraft = {
  ...DEFAULT_PAYER_SYNC_DRAFT,
  importMissingTariffs: true,
};

type PricelistPayerSyncDialogProps = {
  pricelistUuid: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payerName?: string | null;
  coreProviderId?: number | null;
  initialDraft?: PricelistPayerSyncDraft;
  title?: string;
  onStarted: (jobUuid: string, toastId: string | number) => void;
};

export function PricelistPayerSyncDialog({
  pricelistUuid,
  open,
  onOpenChange,
  payerName,
  coreProviderId = null,
  initialDraft = DEFAULT_PAYER_SYNC_DRAFT,
  title,
  onStarted,
}: PricelistPayerSyncDialogProps) {
  const { toast } = useToast();
  const [syncDraft, setSyncDraft] = useState<PricelistPayerSyncDraft>(initialDraft);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    setSyncDraft(initialDraft);
  }, [initialDraft, open]);

  const dialogTitle =
    title?.trim() ||
    (payerName?.trim() ? `Sync with ${payerName.trim()}` : "Update from MASM Core");

  async function handleStartSync() {
    if (
      !syncDraft.updateFixedPrice &&
      !syncDraft.updateName &&
      !syncDraft.importMissingTariffs &&
      !syncDraft.updateValidity
    ) {
      toast({
        variant: "error",
        title: "Select at least one option",
        description: "Choose what to update from the payer before starting.",
      });
      return;
    }
    if (
      syncDraft.updateValidity &&
      syncDraft.dateStart &&
      syncDraft.dateEnd &&
      syncDraft.dateStart > syncDraft.dateEnd
    ) {
      toast({
        variant: "error",
        title: "Invalid validity dates",
        description: "Valid to must be on or after valid from.",
      });
      return;
    }

    setIsStarting(true);
    try {
      const job = await startCatalogMasmCorePriceSync(pricelistUuid, {
        update_fixed_price: syncDraft.updateFixedPrice,
        update_name: syncDraft.updateName,
        import_missing_tariffs: syncDraft.importMissingTariffs,
        update_validity: syncDraft.updateValidity,
        date_start: syncDraft.updateValidity
          ? syncDraft.dateStart || null
          : undefined,
        date_end: syncDraft.updateValidity ? syncDraft.dateEnd || null : undefined,
      });
      onOpenChange(false);
      const toastId = toast({
        variant: "loading",
        title: payerName?.trim()
          ? `Syncing with ${payerName.trim()}`
          : "Syncing from MASM Core",
        description: "Applying selected tariff updates…",
      });
      onStarted(job.uuid, toastId);
    } catch (err) {
      toast({
        variant: "error",
        title: "Could not start sync",
        description:
          err instanceof BffError
            ? formatBffErrorMessage(err.message, err.errors)
            : err instanceof Error
              ? err.message
              : "Something went wrong.",
      });
    } finally {
      setIsStarting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && isStarting) {
          return;
        }
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className={cn("sm:max-w-lg", appFont.className)}>
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>
            Match by scheme tariff code
            {coreProviderId != null ? ` (provider ${coreProviderId})` : ""}. Select what
            to apply.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1" data-testid="pricelist-masm-sync-options">
          <label className="flex items-start gap-3 text-sm text-brand-navy">
            <input
              type="checkbox"
              className="mt-0.5 size-4 rounded border-brand-border"
              checked={syncDraft.updateFixedPrice}
              disabled={isStarting}
              onChange={(event) =>
                setSyncDraft((current) => ({
                  ...current,
                  updateFixedPrice: event.target.checked,
                }))
              }
            />
            <span>
              <span className="font-medium">Update fixed prices</span>
              <span className="mt-0.5 block text-slate-400">
                Set pricelist fixed price from the Core tariff value.
              </span>
            </span>
          </label>

          <label className="flex items-start gap-3 text-sm text-brand-navy">
            <input
              type="checkbox"
              className="mt-0.5 size-4 rounded border-brand-border"
              checked={syncDraft.updateName}
              disabled={isStarting}
              onChange={(event) =>
                setSyncDraft((current) => ({
                  ...current,
                  updateName: event.target.checked,
                }))
              }
            />
            <span>
              <span className="font-medium">Update product names</span>
              <span className="mt-0.5 block text-slate-400">
                Rename matched products using the Core tariff description.
              </span>
            </span>
          </label>

          <label className="flex items-start gap-3 text-sm text-brand-navy">
            <input
              type="checkbox"
              className="mt-0.5 size-4 rounded border-brand-border"
              checked={syncDraft.importMissingTariffs}
              disabled={isStarting}
              onChange={(event) =>
                setSyncDraft((current) => ({
                  ...current,
                  importMissingTariffs: event.target.checked,
                }))
              }
            />
            <span>
              <span className="font-medium">Import missing tariffs</span>
              <span className="mt-0.5 block text-slate-400">
                Create products for Core tariffs not in HMIS and add them to this
                pricelist.
              </span>
            </span>
          </label>

          <label className="flex items-start gap-3 text-sm text-brand-navy">
            <input
              type="checkbox"
              className="mt-0.5 size-4 rounded border-brand-border"
              checked={syncDraft.updateValidity}
              disabled={isStarting}
              onChange={(event) =>
                setSyncDraft((current) => ({
                  ...current,
                  updateValidity: event.target.checked,
                }))
              }
            />
            <span>
              <span className="font-medium">Update valid from / valid to</span>
              <span className="mt-0.5 block text-slate-400">
                Apply the dates below to synced pricelist rows.
              </span>
            </span>
          </label>

          {syncDraft.updateValidity ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="payer-sync-date-start">Valid from</Label>
                <Input
                  id="payer-sync-date-start"
                  type="date"
                  value={syncDraft.dateStart}
                  disabled={isStarting}
                  onChange={(event) =>
                    setSyncDraft((current) => ({
                      ...current,
                      dateStart: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="payer-sync-date-end">Valid to</Label>
                <Input
                  id="payer-sync-date-end"
                  type="date"
                  value={syncDraft.dateEnd}
                  disabled={isStarting}
                  onChange={(event) =>
                    setSyncDraft((current) => ({
                      ...current,
                      dateEnd: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <SecondaryButton
            type="button"
            disabled={isStarting}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </SecondaryButton>
          <PrimaryButton
            type="button"
            disabled={isStarting}
            onClick={() => void handleStartSync()}
          >
            {isStarting ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Starting…
              </>
            ) : (
              "Start sync"
            )}
          </PrimaryButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
