"use client";

import { ChevronDown, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { SecondaryButton } from "@/components/ui/app-buttons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  DetailPageAsideSummaryAmountRow,
  DetailPageAsideSummarySection,
} from "@/features/app-shell/components/page-layout";
import { EditCustomerOpeningBalanceDialog } from "@/features/customers/components/detail/EditCustomerOpeningBalanceDialog";
import { RecordOpeningBalancePaymentDialog } from "@/features/customers/components/detail/RecordOpeningBalancePaymentDialog";
import {
  fetchCustomerBillingSummary,
  updateCustomerOpeningBalance,
} from "@/features/customers/services/customer-billing.service";
import type { CustomerBillingTotals } from "@/features/customers/types/customer-billing.types";
import type { Customer } from "@/features/customers/types/customer.types";
import { formatAmountNumber } from "@/features/sales-orders/utils/format-sales-order";
import { BffError } from "@/lib/bff-client";
import { formatBffErrorMessage } from "@/lib/bff-field-errors";
import { cn } from "@/lib/utils";
import { useToast } from "@/providers/toast-provider";
import { useUser } from "@/providers/user-provider";

const SIDEBAR_CURRENCY = "MWK";

type CustomerAccountSummaryCardProps = {
  customer: Customer;
  refreshKey?: number;
  onOpeningBalanceUpdated?: (customer: Customer) => void;
  onBillingUpdated?: () => void;
};

function parseBillingAmount(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === "") {
    return 0;
  }
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

function SidebarCurrencyAmount({
  value,
  className,
  amountClassName,
}: {
  value: number | string | null | undefined;
  className?: string;
  amountClassName?: string;
}) {
  const amount = formatAmountNumber(value);
  if (amount === "—") {
    return <span className={amountClassName}>—</span>;
  }

  return (
    <span className={cn("inline-flex items-baseline gap-1", className)}>
      <span className={amountClassName}>{amount}</span>
      <span className="text-[0.7em] font-medium uppercase tracking-[0.06em] text-brand-muted">
        {SIDEBAR_CURRENCY}
      </span>
    </span>
  );
}

export function CustomerAccountSummaryCard({
  customer,
  refreshKey = 0,
  onOpeningBalanceUpdated,
  onBillingUpdated,
}: CustomerAccountSummaryCardProps) {
  const { toast } = useToast();
  const { userData } = useUser();
  const isBillingUser = (userData?.groups ?? []).includes("Billing");

  const [totals, setTotals] = useState<CustomerBillingTotals | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [recordPaymentOpen, setRecordPaymentOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const loadTotals = useCallback(async () => {
    try {
      const billing = await fetchCustomerBillingSummary(customer.uuid);
      setTotals(billing.totals);
      setLoadError(null);
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Failed to load account summary.",
      );
    }
  }, [customer.uuid]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const billing = await fetchCustomerBillingSummary(customer.uuid);
        if (!cancelled) {
          setTotals(billing.totals);
          setLoadError(null);
          setIsLoading(false);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error ? error.message : "Failed to load account summary.",
          );
          setIsLoading(false);
        }
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [customer.uuid, refreshKey]);

  const outstanding = parseBillingAmount(totals?.total_due);
  const hasOutstanding = outstanding > 0;
  const openingBalance =
    totals?.opening_balance ?? customer.opening_balance ?? "0.00";
  const hasOpeningBalance = Math.abs(parseBillingAmount(openingBalance)) > 0;
  const remainingOpeningBalance = parseBillingAmount(
    totals?.opening_balance_remaining,
  );
  const canRecordOpeningBalancePayment = remainingOpeningBalance > 0;

  async function handleSave(nextOpeningBalance: string): Promise<boolean> {
    setIsSaving(true);
    try {
      const updated = await updateCustomerOpeningBalance(
        customer.uuid,
        nextOpeningBalance,
      );
      onOpeningBalanceUpdated?.(updated);
      await loadTotals();
      onBillingUpdated?.();
      toast({
        variant: "success",
        title: "Opening balance updated",
        description: "Outstanding balance was recalculated.",
      });
      return true;
    } catch (error) {
      toast({
        variant: "error",
        title: "Could not update opening balance",
        description:
          error instanceof BffError
            ? formatBffErrorMessage(error.message, error.errors)
            : error instanceof Error
              ? error.message
              : "The opening balance could not be saved.",
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  const manageAction = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SecondaryButton
          type="button"
          size="sm"
          className="h-7 gap-1 px-2.5 text-xs"
          data-testid="customer-account-summary-manage-button"
        >
          Manage
          <ChevronDown className="size-3.5" aria-hidden="true" />
        </SecondaryButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => setEditOpen(true)}
          data-testid="customer-account-summary-opening-balance-menu-item"
        >
          {hasOpeningBalance ? "Edit opening balance" : "Add opening balance"}
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!canRecordOpeningBalancePayment}
          title={
            canRecordOpeningBalancePayment
              ? undefined
              : "Record payment requires an unpaid opening balance."
          }
          onClick={() => setRecordPaymentOpen(true)}
          data-testid="customer-account-summary-record-payment-menu-item"
        >
          Record payment
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <>
      <DetailPageAsideSummarySection
        title="Account"
        action={manageAction}
        className="border-t-0 pt-0"
        data-testid="customer-account-summary"
      >
        {isLoading && !totals ? (
          <div className="flex items-center gap-2 py-2 text-xs text-brand-muted">
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
            Loading financial data...
          </div>
        ) : loadError && !totals ? (
          <p className="py-2 text-xs text-red-600">{loadError}</p>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-dash-muted">
                {hasOutstanding ? "Outstanding" : "Balance"}
              </p>
              <p
                className={cn(
                  "mt-1 text-2xl font-semibold tracking-tight tabular-nums",
                  hasOutstanding ? "text-brand-primary" : "text-brand-navy",
                )}
              >
                <SidebarCurrencyAmount
                  value={hasOutstanding ? totals?.total_due : 0}
                  amountClassName={hasOutstanding ? "text-brand-primary" : "text-brand-navy"}
                />
              </p>
            </div>

            <div className="divide-y divide-dash-border/70 border-t border-dash-border/70 [&>div]:py-2.5">
              <DetailPageAsideSummaryAmountRow
                label="Opening balance"
                value={<SidebarCurrencyAmount value={openingBalance} />}
              />
              <DetailPageAsideSummaryAmountRow
                label="Total invoiced"
                value={
                  <SidebarCurrencyAmount value={totals?.total_invoiced ?? 0} />
                }
              />
              <DetailPageAsideSummaryAmountRow
                label="Total payments"
                value={<SidebarCurrencyAmount value={totals?.total_paid ?? 0} />}
              />
            </div>
          </div>
        )}
      </DetailPageAsideSummarySection>

      <EditCustomerOpeningBalanceDialog
        open={editOpen}
        isSaving={isSaving}
        canEdit={isBillingUser}
        initialOpeningBalance={openingBalance}
        onOpenChange={setEditOpen}
        onSave={handleSave}
      />

      <RecordOpeningBalancePaymentDialog
        customer={customer}
        remainingBalance={remainingOpeningBalance}
        open={recordPaymentOpen}
        canRecord={isBillingUser}
        onOpenChange={setRecordPaymentOpen}
        onRecorded={() => {
          void loadTotals();
          onBillingUpdated?.();
        }}
      />
    </>
  );
}
