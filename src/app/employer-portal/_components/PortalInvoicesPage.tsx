"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";

import {
  INVOICE_STATUS_LABEL,
  fetchPortalInvoices,
  portalInvoicePdfUrl,
  submitPortalPaymentNotice,
  type PortalInvoice,
} from "@/features/employer-portal/services/employer-portal.service";
import { getErrorMessage } from "@/lib/fetch-error";

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
          {rows.map((invoice) => (
            <DaRow key={invoice.uuid} testId="employer-portal-invoice">
              <DaCell first>
                <ImmPrimaryCell title={invoice.number} detail={[invoice.account, ...(invoice.services ?? [])].filter(Boolean).join(" · ")} />
                <PaymentReference invoice={invoice} />
              </DaCell>
              <DaCell>{fmtDate(invoice.date)}</DaCell>
              <DaCell>{invoice.amount_total}</DaCell>
              <DaCell>{invoice.amount_paid}</DaCell>
              <DaCell>{invoice.amount_due}</DaCell>
              <DaCell>
                <ImmStatusBadge status={BADGE[invoice.payment_status]} label={INVOICE_STATUS_LABEL[invoice.payment_status]} />
              </DaCell>
              <DaCell>
                <a className="text-primary underline" href={portalInvoicePdfUrl(invoice.uuid)} target="_blank" rel="noreferrer">
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

function PaymentReference({ invoice }: { invoice: PortalInvoice }) {
  const client = useQueryClient();
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string | null>(null);
  const notice = invoice.payment_notice;
  const save = useMutation({
    mutationFn: () => submitPortalPaymentNotice(invoice.uuid, reference.trim()),
    onSuccess: async () => {
      setReference("");
      await client.invalidateQueries({ queryKey: ["employer-portal", "invoices"] });
    },
    onError: (caught) => setError(getErrorMessage(caught)),
  });

  if (invoice.payment_status === "paid" || Number(invoice.amount_due) <= 0) {
    return null;
  }
  if (notice?.status === "submitted") {
    return (
      <p className="mt-2 text-[12px] text-dash-muted" data-testid="employer-portal-payment-waiting">
        Waiting for the clinic to confirm. Reference {notice.payment_reference}
      </p>
    );
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    save.mutate();
  }

  return (
    <form className="mt-2 flex flex-wrap items-center gap-2" onSubmit={submit}>
      {notice?.status === "rejected" ? (
        <p className="w-full text-[12px] text-red-700">{notice.staff_note || "The clinic could not match this payment. Send the reference again."}</p>
      ) : null}
      <input
        aria-label={`Payment reference for ${invoice.number}`}
        className="h-8 rounded-md border border-dash-border px-2 text-[12px]"
        value={reference}
        onChange={(event) => setReference(event.target.value)}
        placeholder="Payment reference"
      />
      <button type="submit" className="text-[12px] text-primary underline" disabled={save.isPending || reference.trim() === ""}>
        I&apos;ve paid
      </button>
      {error ? <p className="w-full text-[12px] text-red-700">{error}</p> : null}
    </form>
  );
}
