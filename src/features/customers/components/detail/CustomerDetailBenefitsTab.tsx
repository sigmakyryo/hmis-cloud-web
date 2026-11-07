"use client";

import { Loader2, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

import { SecondaryButton } from "@/components/ui/app-buttons";
import { StatusBanner } from "@/components/ui/status-banner";
import { CustomerDetailTabEmptyState } from "@/features/customers/components/detail/CustomerDetailTabEmptyState";
import { CustomerTabSkeleton } from "@/features/customers/components/detail/CustomerTabSkeleton";
import {
  CUSTOMER_TAB_BLEED_CLASS,
  CustomerTabError,
  CustomerTabActions,
} from "@/features/customers/components/detail/customer-tab-chrome";
import {
  checkCustomerMemberBenefits,
  fetchCustomerMemberBenefits,
} from "@/features/customers/services/customer-benefits.service";
import type { CustomerMemberBenefitsSnapshot } from "@/features/customers/types/customer-benefits.types";
import type { Customer } from "@/features/customers/types/customer.types";
import { formatDisplayDateTime } from "@/features/customers/utils/format-customer";
import { MemberBenefitsTable } from "@/features/member-benefits/components/MemberBenefitsTable";
import type { LucideIcon } from "lucide-react";

const BENEFITS_POLL_INTERVAL_MS = 8000;

type CustomerDetailBenefitsTabProps = {
  customer: Customer;
  isActive: boolean;
  emptyStateIcon: LucideIcon;
};

export function CustomerDetailBenefitsTab({
  customer,
  isActive,
  emptyStateIcon,
}: CustomerDetailBenefitsTabProps) {
  const [snapshot, setSnapshot] = useState<CustomerMemberBenefitsSnapshot | null>(
    null,
  );
  const [checkInProgress, setCheckInProgress] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);

  useEffect(() => {
    if (!isActive || hasLoaded) {
      return;
    }

    let cancelled = false;

    void (async () => {
      setIsLoading(true);
      setLoadError(null);

      try {
        const status = await fetchCustomerMemberBenefits(customer.uuid);
        if (!cancelled) {
          setSnapshot(status.snapshot);
          setCheckInProgress(status.check_in_progress);
          setHasLoaded(true);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Failed to load member benefits.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [customer.uuid, hasLoaded, isActive]);

  useEffect(() => {
    if (!isActive || !checkInProgress) {
      return;
    }

    let cancelled = false;
    let timer: number | null = null;

    function stopPolling() {
      if (timer) {
        window.clearInterval(timer);
        timer = null;
      }
    }

    async function poll() {
      try {
        const status = await fetchCustomerMemberBenefits(customer.uuid);
        if (cancelled) {
          return;
        }
        setSnapshot(status.snapshot);
        setCheckInProgress(status.check_in_progress);
        setHasLoaded(true);
        if (!status.check_in_progress) {
          stopPolling();
        }
      } catch {
        // Keep polling on transient errors while a check is in progress.
      }
    }

    void poll();
    timer = window.setInterval(() => {
      void poll();
    }, BENEFITS_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      stopPolling();
    };
  }, [checkInProgress, isActive, customer.uuid]);

  async function handleCheck() {
    setIsChecking(true);
    setCheckError(null);

    try {
      await checkCustomerMemberBenefits(customer.uuid);
      setCheckInProgress(true);
    } catch (error) {
      setCheckError(
        error instanceof Error
          ? error.message
          : "Could not check member benefits.",
      );
    } finally {
      setIsChecking(false);
    }
  }

  if (!isActive) {
    return null;
  }

  if (isLoading && !hasLoaded) {
    return <CustomerTabSkeleton rows={4} />;
  }

  if (loadError && !hasLoaded) {
    return <CustomerTabError message={loadError} />;
  }

  if (!snapshot && !checkInProgress) {
    return (
      <CustomerDetailTabEmptyState
        icon={emptyStateIcon}
        title="Benefits not checked"
        description="Check MASM member benefits for this client to see balances and coverage."
        action={
          <SecondaryButton
            type="button"
            disabled={isChecking}
            onClick={() => void handleCheck()}
            data-testid="customer-member-benefits-check"
          >
            {isChecking ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Checking...
              </>
            ) : (
              "Check benefits"
            )}
          </SecondaryButton>
        }
        data-testid="customer-benefits-empty-state"
      />
    );
  }

  if (!snapshot && checkInProgress) {
    return (
      <div className="space-y-6" data-testid="customer-member-benefits-tab">
        <p className="flex items-center gap-2 text-sm text-dash-muted">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Checking member benefits from MASM...
        </p>
      </div>
    );
  }

  if (!snapshot) {
    return null;
  }

  return (
    <div className="space-y-6" data-testid="customer-member-benefits-tab">
      <CustomerTabActions>
        <SecondaryButton
          type="button"
          disabled={isChecking || checkInProgress}
          onClick={() => void handleCheck()}
          data-testid="customer-member-benefits-recheck"
        >
          {isChecking || checkInProgress ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Checking...
            </>
          ) : (
            <>
              <RefreshCw className="size-4" aria-hidden="true" />
              Recheck
            </>
          )}
        </SecondaryButton>
      </CustomerTabActions>
      <p className="text-[13px] text-dash-muted">
        Membership {snapshot.membership_number}
        {snapshot.requested_at
          ? ` · Last checked ${formatDisplayDateTime(snapshot.requested_at)}`
          : null}
      </p>

      {checkInProgress ? (
        <p className="flex items-center gap-2 text-[13px] text-dash-muted">
          <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          Updating benefits from MASM...
        </p>
      ) : null}

      {checkError ? <StatusBanner variant="error" message={checkError} /> : null}

      {snapshot.status === "failed" ? (
        <StatusBanner
          variant="error"
          message={
            snapshot.error_message ||
            "Member benefits could not be loaded from MASM."
          }
        />
      ) : null}

      {snapshot.status === "succeeded" && snapshot.benefits.length === 0 ? (
        <CustomerDetailTabEmptyState
          icon={emptyStateIcon}
          title="No benefits returned"
          description="MASM did not return any active benefits for this membership number."
          action={
            <SecondaryButton
              type="button"
              disabled={isChecking || checkInProgress}
              onClick={() => void handleCheck()}
            >
              Recheck
            </SecondaryButton>
          }
        />
      ) : null}

      {snapshot.status === "succeeded" && snapshot.benefits.length > 0 ? (
        <div className={CUSTOMER_TAB_BLEED_CLASS}>
          <MemberBenefitsTable benefits={snapshot.benefits} />
        </div>
      ) : null}
    </div>
  );
}
