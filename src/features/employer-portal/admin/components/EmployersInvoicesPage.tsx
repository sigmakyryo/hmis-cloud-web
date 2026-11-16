"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { ImmFilterBar } from "@/app/(app)/immunizations/_components/shared/ImmTabsBar";
import { ROUTES } from "@/constants/routes";
import { SendInvoiceDrawer, StaffInvoicesView, StaffPaymentsView } from "@/features/employer-portal/admin/components/EmployerPortalBilling";
import { usePaymentNoticesQuery } from "@/features/employer-portal/admin/hooks/useEmployersQueries";
import { cn } from "@/lib/utils";

const VIEWS = [
  { view: "invoices", label: "Invoices" },
  { view: "payments", label: "Payments to check" },
] as const;

type InvoicesView = (typeof VIEWS)[number]["view"];

export function parseInvoicesView(value: string | null): InvoicesView {
  return VIEWS.find((item) => item.view === value)?.view ?? "invoices";
}

export function EmployersInvoicesPage() {
  const view = parseInvoicesView(useSearchParams().get("view"));
  const [sending, setSending] = useState(false);
  const payments = usePaymentNoticesQuery();

  return (
    <>
      <ImmFilterBar>
        {VIEWS.map((item) => (
          <Link
            key={item.view}
            href={`${ROUTES.employersInvoices}?view=${item.view}`}
            aria-current={item.view === view ? "page" : undefined}
            className={cn(
              "rounded-full border px-3 py-1 text-[13px] transition-colors",
              item.view === view ? "border-brand-primary bg-brand-primary/10 text-brand-primary" : "border-dash-border text-brand-muted hover:text-brand-navy",
            )}
          >
            {item.label}
            {item.view === "payments" && payments.data?.length ? <span className="ml-1.5 tabular-nums">{payments.data.length}</span> : null}
          </Link>
        ))}
      </ImmFilterBar>
      <div className="px-4 py-4 md:px-6">
        {view === "invoices" ? <StaffInvoicesView onSend={() => setSending(true)} /> : <StaffPaymentsView />}
      </div>
      {sending ? <SendInvoiceDrawer onClose={() => setSending(false)} /> : null}
    </>
  );
}
