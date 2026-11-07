"use client";

import type { CustomerInvoicesStats } from "@/features/customers/types/customer-billing.types";
import {
  CustomerTabStat,
  CustomerTabStatBand,
} from "@/features/customers/components/detail/customer-tab-chrome";
import { formatSalesOrderAmount } from "@/features/sales-orders/utils/format-sales-order";
import {
  formatCompactAmount,
  formatCompactNumber,
} from "@/utils/format-compact-number";

type CustomerInvoicePaymentStatsCardsProps = {
  stats: CustomerInvoicesStats | null;
  className?: string;
};

export function CustomerInvoicePaymentStatsCards({
  stats,
}: CustomerInvoicePaymentStatsCardsProps) {
  const buckets = stats ?? {
    all: { count: 0, total: 0 },
    paid: { count: 0, total: 0 },
    not_paid: { count: 0, total: 0 },
    partially_paid: { count: 0, total: 0 },
  };

  return (
    <CustomerTabStatBand data-testid="customer-invoice-payment-stats">
      <CustomerTabStat
        label="All invoices"
        value={formatCompactNumber(buckets.all.count)}
        hint={`${formatCompactAmount(buckets.all.total)} MWK billed`}
      />
      <CustomerTabStat
        label="Paid"
        value={formatCompactNumber(buckets.paid.count)}
        hint={`${formatCompactAmount(buckets.paid.total)} MWK settled`}
        accent={buckets.paid.count > 0}
      />
      <CustomerTabStat
        label="Unpaid"
        value={formatCompactNumber(buckets.not_paid.count)}
        hint={
          <span title={formatSalesOrderAmount(buckets.not_paid.total, "MWK")}>
            {formatCompactAmount(buckets.not_paid.total)} MWK open
          </span>
        }
      />
      <CustomerTabStat
        label="Partially paid"
        value={formatCompactNumber(buckets.partially_paid.count)}
        hint={`${formatCompactAmount(buckets.partially_paid.total)} MWK partial`}
      />
    </CustomerTabStatBand>
  );
}
