"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Briefcase } from "lucide-react";

import { TabAddActionButton } from "@/components/ui/app-buttons";
import { Button } from "@/components/ui/button";
import { AddEmploymentEpisodeDialog } from "@/features/occupational-health/components/AddEmploymentEpisodeDialog";
import { CustomerEmploymentEpisodesTable } from "@/features/occupational-health/components/CustomerEmploymentEpisodesTable";
import { UpdateEmploymentEpisodeDialog } from "@/features/occupational-health/components/UpdateEmploymentEpisodeDialog";
import type { EmploymentEpisode } from "@/features/occupational-health/types";
import { fetchEmploymentEpisodes } from "@/features/occupational-health/services/oh.service";
import { CustomerDetailTabEmptyState } from "@/features/customers/components/detail/CustomerDetailTabEmptyState";
import { CustomerTabSkeleton } from "@/features/customers/components/detail/CustomerTabSkeleton";
import { CustomerTabActions } from "@/features/customers/components/detail/customer-tab-chrome";
import type { Customer } from "@/features/customers/types/customer.types";
import { isModuleEnabled } from "@/features/app-shell/utils/module-entitlements";
import { canAccessOccupationalHealth } from "@/features/occupational-health/utils/oh-access";
import { BffError } from "@/lib/bff-client";
import { useUser } from "@/providers/user-provider";
import EmploymentEmptyIllustration from "./illustractions/EmploymentEmptyIllustration";

type CustomerEmploymentEpisodesSectionProps = {
  customer: Customer;
  isActive: boolean;
};

export function CustomerEmploymentEpisodesSection({
  customer,
  isActive,
}: CustomerEmploymentEpisodesSectionProps) {
  const { userData } = useUser();
  const hasOhModule = isModuleEnabled(userData, "OccupationalHealth");
  const hasOhAccess = canAccessOccupationalHealth(userData);
  const [episodes, setEpisodes] = useState<EmploymentEpisode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEpisode, setEditingEpisode] =
    useState<EmploymentEpisode | null>(null);
  const sheet = useSearchParams().get("sheet");
  const openedSheet = useRef(false);

  const loadEpisodes = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const results = await fetchEmploymentEpisodes(customer.uuid);
      setEpisodes(results);
      setHasLoaded(true);
      if (sheet && !openedSheet.current) {
        openedSheet.current = true;
        const active = results.find((episode) => episode.is_active) ?? results[0] ?? null;
        if (sheet === "edit" && active) {
          setEditingEpisode(active);
        } else {
          setDialogOpen(true);
        }
      }
    } catch (error) {
      setEpisodes([]);
      setLoadError(
        error instanceof BffError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Unable to load employment episodes.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [customer.uuid, sheet]);

  useEffect(() => {
    if (!isActive || !hasOhAccess || hasLoaded || loadError) {
      return;
    }

    let cancelled = false;

    async function run() {
      await Promise.resolve();
      if (!cancelled) {
        await loadEpisodes();
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [hasLoaded, hasOhAccess, isActive, loadEpisodes, loadError]);

  if (!hasOhModule) {
    return (
      <CustomerDetailTabEmptyState
        icon={Briefcase}
        title="Occupational health isn’t enabled"
        description="Ask a platform administrator to enable the Occupational Health module for this workspace."
        data-testid="customer-employment-module-disabled"
      />
    );
  }

  if (!hasOhAccess) {
    return (
      <CustomerDetailTabEmptyState
        icon={Briefcase}
        title="Employment unavailable"
        description="Ask an administrator to add you to the OccupationalHealth group to manage employment episodes."
        data-testid="customer-employment-no-access"
      />
    );
  }

  if (isLoading && !hasLoaded) {
    return <CustomerTabSkeleton />;
  }

  if (loadError && episodes.length === 0) {
    return (
      <div className="space-y-4" data-testid="customer-employment-error">
        <p className="text-sm text-red-700">{loadError}</p>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setHasLoaded(false);
            setLoadError(null);
            void loadEpisodes();
          }}
        >
          Retry
        </Button>
      </div>
    );
  }

  const dialogs = (
    <>
      <AddEmploymentEpisodeDialog
        customer={customer}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={() => void loadEpisodes()}
      />
      {editingEpisode ? (
        <UpdateEmploymentEpisodeDialog
          customer={customer}
          episode={editingEpisode}
          open={Boolean(editingEpisode)}
          onOpenChange={(open) => {
            if (!open) {
              setEditingEpisode(null);
            }
          }}
          onUpdated={() => void loadEpisodes()}
        />
      ) : null}
    </>
  );

  if (episodes.length === 0) {
    return (
      <>
        <div
          className="flex min-h-[calc(100dvh-18rem)] flex-col items-center justify-center px-6 text-center"
          data-testid="customer-employment-empty"
        >
          <EmploymentEmptyIllustration />
          <h3 className="mt-6 text-lg font-semibold text-brand-navy">
            No employment episodes yet
          </h3>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-dash-muted">
            Record an employment episode to track occupational health for this
            client.
          </p>
          <div className="mt-6">
            <TabAddActionButton onClick={() => setDialogOpen(true)}>
              Add episode
            </TabAddActionButton>
          </div>
        </div>
        {dialogs}
      </>
    );
  }

  return (
    <section className="space-y-6" data-testid="customer-employment-section">
      <CustomerTabActions>
        <TabAddActionButton onClick={() => setDialogOpen(true)}>
          Add episode
        </TabAddActionButton>
      </CustomerTabActions>

      <CustomerEmploymentEpisodesTable
        episodes={episodes}
        onUpdate={setEditingEpisode}
      />

      {dialogs}
    </section>
  );
}
