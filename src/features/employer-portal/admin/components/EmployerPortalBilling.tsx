"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Drawer, DrawerActions } from "@/app/(app)/immunizations/_components/shared/Drawer";
import { EmptyAction } from "@/app/(app)/immunizations/_components/shared/EmptyAction";
import { ImmPrimaryCell, ImmRecordTable, ImmRowAction } from "@/app/(app)/immunizations/_components/shared/ImmRecordTable";
import { LoadError, QuietLoading } from "@/app/(app)/immunizations/_components/shared/QuietLoading";
import { PageActionButton, SecondaryButton } from "@/components/ui/app-buttons";
import { ProductSearchSelect } from "@/features/inventory/components/ProductSearchSelect";
import { errorText, fmtDate } from "@/app/(app)/drug-alcohol/_components/shared/da-format";
import { DaCell, DaRow } from "@/app/(app)/drug-alcohol/_components/shared/da-ui";
import {
  INVOICE_STATUS_LABEL,
  fetchPortalContacts,
  fetchStaffEmployerInvoices,
  fetchStaffPaymentNotices,
  markPortalPaymentPaid,
  rejectPortalPaymentNotice,
  sendPortalInvoice,
  type PortalContact,
  type PortalPaymentNotice,
} from "@/features/employer-portal/services/employer-portal.service";
import { useToast } from "@/providers/toast-provider";

const field = "h-9 w-full rounded-md border border-dash-border px-2.5 text-[13px]";

type BillingChoice = { employerUuid: string; employerName: string; customers: Array<{ uuid: string; name: string }> };
type DraftLine = { key: string; productUuid: string; name: string; quantity: string; price: string };

export function billingChoices(contacts: PortalContact[]): BillingChoice[] {
  const map = new Map<string, BillingChoice>();
  for (const contact of contacts) {
    if (!contact.is_active || !contact.scopes.includes("invoices")) continue;
    const current = map.get(contact.employer_uuid) ?? { employerUuid: contact.employer_uuid, employerName: contact.employer_name, customers: [] };
    for (const account of contact.billing_customers) {
      if (!current.customers.some((item) => item.uuid === account.uuid)) current.customers.push(account);
    }
    map.set(contact.employer_uuid, current);
  }
  return [...map.values()];
}

export function StaffInvoicesView({ onSend }: { onSend: () => void }) {
  const contacts = useQuery({ queryKey: ["oh-portal-admin", "contacts"], queryFn: fetchPortalContacts, retry: false });
  const choices = billingChoices(contacts.data ?? []);
  const [employerUuid, setEmployerUuid] = useState("");
  const selected = choices.find((choice) => choice.employerUuid === employerUuid) ?? choices[0];
  const invoices = useQuery({
    queryKey: ["oh-portal-admin", "invoices", selected?.employerUuid],
    queryFn: () => fetchStaffEmployerInvoices(selected?.employerUuid ?? ""),
    enabled: Boolean(selected?.employerUuid),
    retry: false,
  });
  const rows = invoices.data ?? [];

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <label className="text-[13px]">
          <span className="mr-2 text-dash-muted">Employer</span>
          <select aria-label="Employer invoices" className={field} value={selected?.employerUuid ?? ""} onChange={(event) => setEmployerUuid(event.target.value)}>
            {choices.length === 0 ? <option value="">No invoice logins yet</option> : null}
            {choices.map((choice) => (
              <option key={choice.employerUuid} value={choice.employerUuid}>
                {choice.employerName}
              </option>
            ))}
          </select>
        </label>
        <PageActionButton type="button" onClick={onSend}>
          Send invoice
        </PageActionButton>
      </div>
      {contacts.isLoading || invoices.isLoading ? <QuietLoading /> : null}
      {contacts.isError || invoices.isError ? <LoadError>{errorText(invoices.error ?? contacts.error, "Could not load invoices.")}</LoadError> : null}
      {selected && selected.customers.length === 0 ? (
        <EmptyAction icon="clipboard" title="No billing account" description="Link a billing account on their login first." />
      ) : null}
      {invoices.isSuccess && rows.length === 0 && selected && selected.customers.length > 0 ? (
        <EmptyAction icon="clipboard" title="No invoices yet" description="Send an invoice for this employer's services." />
      ) : null}
      {rows.length > 0 ? (
        <ImmRecordTable columns={["Invoice", "Date", "Total", "Still due", "Status"]}>
          {rows.map((invoice) => (
            <DaRow key={invoice.uuid} testId="oh-portal-staff-invoice">
              <DaCell first>
                <ImmPrimaryCell title={invoice.number} detail={[invoice.account, ...(invoice.services ?? [])].filter(Boolean).join(" · ")} />
              </DaCell>
              <DaCell>{fmtDate(invoice.date)}</DaCell>
              <DaCell>{invoice.amount_total}</DaCell>
              <DaCell>{invoice.amount_due}</DaCell>
              <DaCell>{INVOICE_STATUS_LABEL[invoice.payment_status]}</DaCell>
            </DaRow>
          ))}
        </ImmRecordTable>
      ) : null}
    </>
  );
}

export function SendInvoiceDrawer({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const client = useQueryClient();
  const contacts = useQuery({ queryKey: ["oh-portal-admin", "contacts"], queryFn: fetchPortalContacts, retry: false });
  const choices = billingChoices(contacts.data ?? []);
  const [employerUuid, setEmployerUuid] = useState(choices[0]?.employerUuid ?? "");
  const employer = choices.find((choice) => choice.employerUuid === employerUuid) ?? choices[0];
  const [customerUuid, setCustomerUuid] = useState("");
  const customer = employer?.customers.find((item) => item.uuid === customerUuid) ?? employer?.customers[0];
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [quantity, setQuantity] = useState("1");
  const [price, setPrice] = useState("");
  const save = useMutation({
    mutationFn: () =>
      sendPortalInvoice({
        employer_uuid: employer?.employerUuid ?? "",
        customer_uuid: customer?.uuid ?? "",
        lines: lines.map((line) => ({
          product_uuid: line.productUuid,
          quantity: Number(line.quantity),
          ...(line.price.trim() === "" ? {} : { price_unit: Number(line.price) }),
        })),
      }),
    onSuccess: (invoice) => {
      toast({ variant: "success", title: "Invoice sent", description: `${invoice.number} is on their portal.` });
      void client.invalidateQueries({ queryKey: ["oh-portal-admin", "invoices"] });
      onClose();
    },
    onError: (error) => toast({ variant: "error", title: "Not sent", description: errorText(error) }),
  });
  const ready = Boolean(employer && customer && lines.length > 0);

  return (
    <Drawer title="Send invoice" description="This creates a billing invoice for the account linked on their login." onClose={onClose}>
      <div className="space-y-3 text-[13px]" data-testid="oh-portal-send-invoice">
        {choices.length === 0 || (employer && employer.customers.length === 0) ? (
          <p>Link a billing account on their login first.</p>
        ) : (
          <>
            <label className="block space-y-1">
              <span className="text-dash-muted">Employer</span>
              <select aria-label="Invoice employer" className={field} value={employer?.employerUuid ?? ""} onChange={(event) => setEmployerUuid(event.target.value)}>
                {choices.map((choice) => (
                  <option key={choice.employerUuid} value={choice.employerUuid}>
                    {choice.employerName}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-dash-muted">Billing account</span>
              <select aria-label="Billing account" className={field} value={customer?.uuid ?? ""} onChange={(event) => setCustomerUuid(event.target.value)}>
                {(employer?.customers ?? []).map((account) => (
                  <option key={account.uuid} value={account.uuid}>
                    {account.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="space-y-1">
              <span className="text-dash-muted">Service</span>
              <ProductSearchSelect
                id="portal-invoice-service"
                value={null}
                onSelect={(selection) => {
                  setLines((current) => [
                    ...current,
                    { key: selection.product_uuid, productUuid: selection.product_uuid, name: selection.productName, quantity, price },
                  ]);
                  setQuantity("1");
                  setPrice("");
                }}
              />
              <div className="grid grid-cols-2 gap-2">
                <input aria-label="Quantity" className={field} value={quantity} onChange={(event) => setQuantity(event.target.value)} />
                <input aria-label="Unit price" className={field} value={price} onChange={(event) => setPrice(event.target.value)} placeholder="Catalog price" />
              </div>
            </div>
            {lines.length > 0 ? (
              <ul className="space-y-1">
                {lines.map((line) => (
                  <li key={line.key}>
                    {line.name} × {line.quantity}
                    {line.price ? ` @ ${line.price}` : ""}
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        )}
        <DrawerActions>
          <SecondaryButton type="button" onClick={onClose}>
            Close
          </SecondaryButton>
          <PageActionButton type="button" disabled={!ready || save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? "Sending" : "Send invoice"}
          </PageActionButton>
        </DrawerActions>
      </div>
    </Drawer>
  );
}

export function StaffPaymentsView() {
  const { toast } = useToast();
  const client = useQueryClient();
  const query = useQuery({ queryKey: ["oh-portal-admin", "payments"], queryFn: () => fetchStaffPaymentNotices("submitted"), retry: false });
  const rows = query.data ?? [];
  const decide = useMutation({
    mutationFn: (input: { uuid: string; action: "paid" | "reject"; note?: string }) =>
      input.action === "paid" ? markPortalPaymentPaid(input.uuid) : rejectPortalPaymentNotice(input.uuid, input.note),
    onSuccess: (_data, input) => {
      toast({
        variant: "success",
        title: input.action === "paid" ? "Marked as paid" : "Rejected",
        description: input.action === "paid" ? "The billing invoice is paid." : "The company can send another reference.",
      });
      void client.invalidateQueries({ queryKey: ["oh-portal-admin", "payments"] });
    },
    onError: (error) => toast({ variant: "error", title: "Not saved", description: errorText(error) }),
  });

  return (
    <>
      {query.isLoading ? <QuietLoading /> : null}
      {query.isError ? <LoadError>{errorText(query.error, "Could not load payments.")}</LoadError> : null}
      {query.isSuccess && rows.length === 0 ? (
        <EmptyAction icon="clipboard" title="No payments to check" description="When a company sends a payment reference, it shows here." />
      ) : null}
      {rows.length > 0 ? (
        <ImmRecordTable columns={["Employer", "Invoice", "Reference", "Amount", "Actions"]}>
          {rows.map((notice) => (
            <PaymentRow key={notice.uuid} notice={notice} pending={decide.isPending} onDecide={(action, note) => decide.mutate({ uuid: notice.uuid, action, note })} />
          ))}
        </ImmRecordTable>
      ) : null}
    </>
  );
}

function PaymentRow({
  notice,
  pending,
  onDecide,
}: {
  notice: PortalPaymentNotice;
  pending: boolean;
  onDecide: (action: "paid" | "reject", note?: string) => void;
}) {
  const [note, setNote] = useState("");
  return (
    <DaRow testId="oh-portal-payment-notice">
      <DaCell first>
        <ImmPrimaryCell title={notice.employer_name || "Employer"} detail={notice.submitted_by} />
      </DaCell>
      <DaCell>{notice.invoice_number}</DaCell>
      <DaCell>{notice.payment_reference}</DaCell>
      <DaCell>{notice.amount_due}</DaCell>
      <DaCell actions>
        <ImmRowAction onClick={() => onDecide("paid")} disabled={pending}>
          Mark as paid
        </ImmRowAction>
        <input aria-label={`Reject note for ${notice.invoice_number}`} className="h-8 rounded-md border border-dash-border px-2 text-[12px]" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Why not" />
        <ImmRowAction onClick={() => onDecide("reject", note)} disabled={pending}>
          Reject
        </ImmRowAction>
      </DaCell>
    </DaRow>
  );
}
