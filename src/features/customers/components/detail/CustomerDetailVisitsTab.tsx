"use client";

import { useCallback, useEffect, useState } from "react";
import { Stethoscope } from "lucide-react";

import {
  CustomerTabError,
  CustomerTabStat,
  CustomerTabStatBand,
  CUSTOMER_TAB_BLEED_CLASS,
} from "@/features/customers/components/detail/customer-tab-chrome";
import { CustomerDetailTabEmptyState } from "@/features/customers/components/detail/CustomerDetailTabEmptyState";
import { CustomerTabSkeleton } from "@/features/customers/components/detail/CustomerTabSkeleton";
import { CustomerVisitsTable } from "@/features/customers/components/detail/CustomerVisitsTable";
import {
  countActiveCustomerVisits,
  countCancelledCustomerVisits,
  countCompletedCustomerVisits,
  countCustomerVisits,
  fetchCustomerVisits,
} from "@/features/customers/services/customer-visits.service";
import type { CustomerVisit } from "@/features/customers/types/customer-visit.types";
import type { Customer } from "@/features/customers/types/customer.types";
import { EditVisitPaymentDialog } from "@/features/visits/components/EditVisitPaymentDialog";
import { VisitDetailDialog } from "@/features/visits/components/VisitDetailDialog";
import { formatCompactNumber } from "@/utils/format-compact-number";

type CustomerDetailVisitsTabProps = {
  customer: Customer;
  isActive: boolean;
  refreshKey?: number;
};

export function CustomerDetailVisitsTab({
  customer,
  isActive,
  refreshKey = 0,
}: CustomerDetailVisitsTabProps) {
  const [visits, setVisits] = useState<CustomerVisit[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [selectedVisitUuid, setSelectedVisitUuid] = useState<string | null>(null);
  const [editingVisit, setEditingVisit] = useState<CustomerVisit | null>(null);

  const loadVisits = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const records = await fetchCustomerVisits(customer.uuid, { limit: 100 });
      setVisits(records);
      setHasLoaded(true);
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Failed to load visits.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [customer.uuid]);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    let cancelled = false;

    async function run() {
      try {
        const records = await fetchCustomerVisits(customer.uuid, { limit: 100 });
        if (!cancelled) {
          setVisits(records);
          setHasLoaded(true);
          setLoadError(null);
          setIsLoading(false);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error ? error.message : "Failed to load visits.",
          );
          setIsLoading(false);
        }
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [customer.uuid, isActive, refreshKey]);

  if (!isActive) {
    return null;
  }

  if (isLoading && !hasLoaded) {
    return <CustomerTabSkeleton statCards={4} rows={5} />;
  }

  if (loadError && !hasLoaded) {
    return <CustomerTabError message={loadError} onRetry={() => void loadVisits()} />;
  }

  const totalVisits = countCustomerVisits(visits);
  const activeVisits = countActiveCustomerVisits(visits);
  const completedVisits = countCompletedCustomerVisits(visits);
  const cancelledVisits = countCancelledCustomerVisits(visits);

  const dialogs = (
    <>
      <VisitDetailDialog
        visitUuid={selectedVisitUuid}
        open={Boolean(selectedVisitUuid)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedVisitUuid(null);
          }
        }}
        onVisitUpdated={() => void loadVisits()}
      />
      {editingVisit ? (
        <EditVisitPaymentDialog
          visit={editingVisit}
          open={Boolean(editingVisit)}
          onOpenChange={(open) => {
            if (!open) {
              setEditingVisit(null);
            }
          }}
          onUpdated={(updatedVisit) => {
            setVisits((current) =>
              current.map((visit) =>
                visit.uuid === updatedVisit.uuid ? updatedVisit : visit,
              ),
            );
            setEditingVisit(null);
          }}
        />
      ) : null}
    </>
  );

  return (
    <div className="space-y-6" data-testid="customer-detail-visits-tab">
      <CustomerTabStatBand>
        <CustomerTabStat
          label="Total visits"
          value={formatCompactNumber(totalVisits)}
          hint="Recorded client visits"
        />
        <CustomerTabStat
          label="Active"
          value={formatCompactNumber(activeVisits)}
          hint={activeVisits > 0 ? "Currently in clinic" : "None in progress"}
          accent={activeVisits > 0}
        />
        <CustomerTabStat
          label="Completed"
          value={formatCompactNumber(completedVisits)}
          hint="Discharged encounters"
        />
        <CustomerTabStat
          label="Cancelled"
          value={formatCompactNumber(cancelledVisits)}
          hint="Voided encounters"
        />
      </CustomerTabStatBand>

      {visits.length === 0 ? (
        <CustomerDetailTabEmptyState
          icon={Stethoscope}
          title="No visits yet"
          description="Start a visit from the header when this client arrives for care."
          data-testid="customer-visits-empty-state"
        />
      ) : (
        <div className={CUSTOMER_TAB_BLEED_CLASS}>
          <CustomerVisitsTable
            visits={visits}
            onEdit={setEditingVisit}
            onView={(visit) => setSelectedVisitUuid(visit.uuid)}
          />
        </div>
      )}

      {loadError && hasLoaded ? (
        <p className="text-xs text-red-600">{loadError}</p>
      ) : null}
      {dialogs}
    </div>
  );
}
