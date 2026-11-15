"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  ListPageBlankState,
  ListPageLayout,
  ListPageTableSection,
} from "@/features/app-shell/components/page-layout";
import type { ClinicalReferral } from "@/features/clinical-opd/types/clinical-opd.types";
import { fetchIncomingReferralsAwaitingStart } from "@/features/clinical-opd/services/clinical-opd.service";
import { InventoryListAccessDenied } from "@/features/inventory/components/list/InventoryListAccessDenied";
import { IncomingReferralsEmptyState } from "@/features/referrals/components/IncomingReferralsEmptyState";
import { IncomingReferralsPageHeader } from "@/features/referrals/components/IncomingReferralsPageHeader";
import { IncomingReferralsTableSkeleton } from "@/features/referrals/components/IncomingReferralsTableSkeleton";
import { StartIncomingReferralDialog } from "@/features/referrals/components/StartIncomingReferralDialog";
import { IncomingReferralsTable } from "@/features/referrals/components/tables/incoming-referrals-table";
import { BffError } from "@/lib/bff-client";

function matchesSearch(referral: ClinicalReferral, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) {
    return true;
  }
  const haystack = [
    referral.customer_name,
    referral.customer_identifier,
    referral.referring_clinic_name,
    referral.referred_by_name,
    referral.service_type,
    ...(referral.item_summaries ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

export function IncomingReferralsListPage() {
  const [items, setItems] = useState<ClinicalReferral[]>([]);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const [selectedReferral, setSelectedReferral] =
    useState<ClinicalReferral | null>(null);

  const load = useCallback(async (opts?: { soft?: boolean }) => {
    if (opts?.soft) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const results = await fetchIncomingReferralsAwaitingStart();
      setItems(results);
      setIsUnauthorized(false);
    } catch (err) {
      if (err instanceof BffError && err.status === 403) {
        setIsUnauthorized(true);
        setItems([]);
      } else {
        setError(
          err instanceof Error ? err.message : "Could not load referrals.",
        );
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      await Promise.resolve();
      if (!cancelled) {
        await load();
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [load]);

  const filtered = useMemo(
    () => items.filter((referral) => matchesSearch(referral, appliedSearch)),
    [appliedSearch, items],
  );

  const hasNoRecords = !isLoading && items.length === 0 && !error;
  const isFilteredEmpty =
    !isLoading && items.length > 0 && filtered.length === 0;

  const handleSearchSubmit = useCallback(() => {
    setAppliedSearch(search);
  }, [search]);

  const handleClearSearch = useCallback(() => {
    setSearch("");
    setAppliedSearch("");
  }, []);

  if (isUnauthorized) {
    return <InventoryListAccessDenied />;
  }

  return (
    <>
      <ListPageLayout fill data-testid="incoming-referrals-page">
        {hasNoRecords ? null : (
          <IncomingReferralsPageHeader
            search={search}
            isLoading={isRefreshing}
            onSearchChange={setSearch}
            onSearchSubmit={handleSearchSubmit}
            onClearSearch={handleClearSearch}
          />
        )}

        <ListPageTableSection>
          {isLoading ? (
            <IncomingReferralsTableSkeleton rows={8} />
          ) : error ? (
            <ListPageBlankState
  compact
  tone="error"
  icon="file"
  title="Could not load referrals"
  description={error}
  action={
    <Button
      type="button"
      variant="outline"
      className="h-8 rounded-lg text-[13px]"
      onClick={() => void load()}
    >
      Try again
    </Button>
  }
/>
          ) : hasNoRecords ? (
            <IncomingReferralsEmptyState />
          ) : isFilteredEmpty ? (
            <ListPageBlankState
  compact
  icon="search"
  title="No matching referrals"
  description="Adjust your search and try again."
  action={
    <Button
      type="button"
      variant="outline"
      className="h-8 rounded-lg text-[13px]"
      onClick={handleClearSearch}
    >
      Clear search
    </Button>
  }
/>
          ) : (
            <IncomingReferralsTable
              referrals={filtered}
              onStart={setSelectedReferral}
            />
          )}
        </ListPageTableSection>
      </ListPageLayout>

      <StartIncomingReferralDialog
        referral={selectedReferral}
        open={Boolean(selectedReferral)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setSelectedReferral(null);
          }
        }}
        onStarted={() => {
          setSelectedReferral(null);
          void load({ soft: true });
        }}
      />
    </>
  );
}
