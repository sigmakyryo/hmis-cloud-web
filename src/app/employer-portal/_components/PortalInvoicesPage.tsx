"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Invoice03Icon } from "@hugeicons/core-free-icons";
import { useState, type FormEvent } from "react";

import {
  INVOICE_STATUS_LABEL,
  fetchPortalInvoices,
  portalInvoicePdfUrl,
  submitPortalPaymentNotice,
  type PortalInvoice,
} from "@/features/employer-portal/services/employer-portal.service";
import { PortalPagination } from "@/features/employer-portal/components/PortalPagination";
import { usePortalPagination } from "@/features/employer-portal/hooks/usePortalPagination";
import {
  PortalCell,
  PortalPage,
  PortalPageHeader,
  PortalRow,
  PortalStatStrip,
  PortalStatusPill,
  PortalTable,
} from "@/features/employer-portal/components/PortalPrimitives";
import { formatCents, toCents } from "@/features/employer-portal/admin/utils/employers-overview";
import { getErrorMessage } from "@/lib/fetch-error";

import { PortalState } from "./PortalShell";
import { fmtDate } from "./portal-ui";

const TONE = { not_paid: "bad", partially_paid: "warn", paid: "good" } as const;

export function PortalInvoicesPage() {
  const query = useQuery({ queryKey: ["employer-portal", "invoices"], queryFn: fetchPortalInvoices, retry: false });
  const rows = query.data ?? [];
  const { pageRows, pagination } = usePortalPagination(rows);
  const totalCents = rows.reduce((sum, invoice) => sum + toCents(invoice.amount_total), 0);
  const paidCents = rows.reduce((sum, invoice) => sum + toCents(invoice.amount_paid), 0);
  const dueCents = rows.reduce((sum, invoice) => sum + toCents(invoice.amount_due), 0);
  const openCount = rows.filter((invoice) => invoice.payment_status !== "paid").length;

  return (
    <PortalPage testId="employer-portal-invoices">
      <PortalPageHeader icon={Invoice03Icon} title="Invoices" subtitle="What the clinic has billed you and what is still due" />
      <PortalStatStrip
        loading={query.isLoading}
        stats={[
          { label: "Invoices", value: String(rows.length) },
          { label: "Total billed", value: formatCents(totalCents) },
          { label: "Paid", value: formatCents(paidCents), tone: "good" },
          { label: "Still due", value: formatCents(dueCents), note: openCount ? `${openCount} open` : undefined, tone: openCount ? "bad" : "muted" },
        ]}
      />
      <div className="pt-5">
        <PortalState loading={query.isLoading} error={query.error} empty={query.isSuccess && rows.length === 0 ? "No invoices yet." : null} emptyIcon={Invoice03Icon} emptyTitle="No invoices yet">
          <PortalTable columns={["Invoice", "Date", "Total", "Paid", "Still due", "Status", "Statement"]}>
            {pageRows.map((invoice) => (
              <PortalRow key={invoice.uuid} testId="employer-portal-invoice">
                <PortalCell>
                  <p className="text-neutral-900">{invoice.number}</p>
                  <p className="text-[12px] text-neutral-500">{[invoice.account, ...(invoice.services ?? [])].filter(Boolean).join(" · ")}</p>
                  <PaymentReference invoice={invoice} />
                </PortalCell>
                <PortalCell className="whitespace-nowrap">{fmtDate(invoice.date)}</PortalCell>
                <PortalCell>{invoice.amount_total}</PortalCell>
                <PortalCell>{invoice.amount_paid}</PortalCell>
                <PortalCell>{invoice.amount_due}</PortalCell>
                <PortalCell>
                  <PortalStatusPill tone={TONE[invoice.payment_status]}>{INVOICE_STATUS_LABEL[invoice.payment_status]}</PortalStatusPill>
                </PortalCell>
                <PortalCell>
                  <a className="font-medium underline" style={{ color: "var(--portal-accent)" }} href={portalInvoicePdfUrl(invoice.uuid)} target="_blank" rel="noreferrer">
                    PDF
                  </a>
                </PortalCell>
              </PortalRow>
            ))}
          </PortalTable>
        </PortalState>
        <PortalPagination {...pagination} />
      </div>
    </PortalPage>
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
        className="h-8 rounded-md border border-neutral-200 px-2 text-[12px]"
        value={reference}
        onChange={(event) => setReference(event.target.value)}
        placeholder="Payment reference"
      />
      <button type="submit" className="text-[12px] font-medium underline disabled:opacity-50" style={{ color: "var(--portal-accent)" }} disabled={save.isPending || reference.trim() === ""}>
        I&apos;ve paid
      </button>
      {error ? <p className="w-full text-[12px] text-red-700">{error}</p> : null}
    </form>
  );
}
