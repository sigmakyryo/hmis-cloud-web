"use client";

import { useQuery } from "@tanstack/react-query";

import { INVOICE_STATUS_LABEL, fetchPortalInvoices, portalInvoicePdfUrl } from "@/features/employer-portal/services/employer-portal.service";

import { PortalState } from "./PortalShell";
import { DaCell, DaRow, fmtDate, ImmPrimaryCell, ImmRecordTable, ImmStatusBadge } from "./portal-ui";

const BADGE = { not_paid: "overdue", partially_paid: "pending", paid: "active" } as const;

export function PortalInvoicesPage() {
  const query = useQuery({ queryKey: ["employer-portal", "invoices"], queryFn: fetchPortalInvoices, retry: false });
  const rows = query.data ?? [];

  return (
    <div data-testid="employer-portal-invoices">
      <h1 className="sr-only">Invoices</h1>
      <PortalState loading={query.isLoading} error={query.error} empty={query.isSuccess && rows.length === 0 ? "No invoices yet." : null}>
        <ImmRecordTable columns={["Invoice", "Date", "Total", "Paid", "Still due", "Status", "Statement"]}>
          {rows.map((i) => (
            <DaRow key={i.uuid} testId="employer-portal-invoice">
              <DaCell first>
                <ImmPrimaryCell title={i.number} detail={i.account} />
              </DaCell>
              <DaCell>{fmtDate(i.date)}</DaCell>
              <DaCell>{i.amount_total}</DaCell>
              <DaCell>{i.amount_paid}</DaCell>
              <DaCell>{i.amount_due}</DaCell>
              <DaCell>
                <ImmStatusBadge status={BADGE[i.payment_status]} label={INVOICE_STATUS_LABEL[i.payment_status]} />
              </DaCell>
              <DaCell>
                <a className="text-primary underline" href={portalInvoicePdfUrl(i.uuid)} target="_blank" rel="noreferrer">
                  PDF
                </a>
              </DaCell>
            </DaRow>
          ))}
        </ImmRecordTable>
      </PortalState>
    </div>
  );
}
