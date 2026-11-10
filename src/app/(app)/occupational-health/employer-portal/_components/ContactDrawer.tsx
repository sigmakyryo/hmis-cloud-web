"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { PageActionButton, SecondaryButton } from "@/components/ui/app-buttons";
import { Drawer, DrawerActions } from "@/app/(app)/immunizations/_components/shared/Drawer";
import { errorText } from "@/app/(app)/drug-alcohol/_components/shared/da-format";
import { fetchCustomers } from "@/features/customers/services/customers.service";
import {
  PORTAL_SCOPE_LABEL,
  linkPortalContact,
  updatePortalContact,
  type PortalContact,
  type PortalScope,
} from "@/features/employer-portal/services/employer-portal.service";
import { fetchOhEmployers } from "@/features/occupational-health/services/oh.service";
import { useToast } from "@/providers/toast-provider";

export function ContactDrawer({ contact, scopes, onClose }: { contact: PortalContact | null; scopes: PortalScope[]; onClose: () => void }) {
  const { toast } = useToast();
  const client = useQueryClient();
  const [email, setEmail] = useState(contact?.email ?? "");
  const [employer, setEmployer] = useState(contact?.employer_uuid ?? "");
  const [chosen, setChosen] = useState<PortalScope[]>(contact?.scopes ?? ["fitness", "random_compliance"]);
  const [accounts, setAccounts] = useState<Array<{ uuid: string; name: string }>>(contact?.billing_customers ?? []);
  const [active, setActive] = useState(contact?.is_active ?? true);
  const [search, setSearch] = useState("");
  const employers = useQuery({ queryKey: ["oh", "employers", "all"], queryFn: fetchOhEmployers, enabled: !contact, retry: false });
  const found = useQuery({
    queryKey: ["customers", "portal-billing", search],
    queryFn: () => fetchCustomers({ search, pageSize: 8 }),
    enabled: search.trim().length >= 2,
    retry: false,
  });
  const save = useMutation({
    mutationFn: () => {
      const billing = accounts.map((a) => a.uuid);
      if (contact) return updatePortalContact(contact.uuid, { scopes: chosen, billing_customer_uuids: billing, is_active: active });
      if (!email.trim() || !employer) throw new Error("Enter the login email and choose the employer.");
      return linkPortalContact({ email: email.trim(), employer_uuid: employer, scopes: chosen, billing_customer_uuids: billing });
    },
    onSuccess: () => {
      toast({ variant: "success", title: "Saved" });
      void client.invalidateQueries({ queryKey: ["oh-portal-admin", "contacts"] });
      onClose();
    },
    onError: (error) => toast({ variant: "error", title: "Not saved", description: errorText(error) }),
  });
  const field = "h-9 w-full rounded-md border border-dash-border px-2.5 text-[13px]";
  const toggle = (s: PortalScope) => setChosen((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));

  return (
    <Drawer title={contact ? (contact.name || contact.email) : "Give a login access"} description={contact ? contact.employer_name : "The person must already have a user account"} onClose={onClose}>
      <div className="space-y-4 text-[13px]" data-testid="oh-portal-contact-sheet">
        {!contact ? (
          <>
            <label className="block space-y-1">
              <span className="text-dash-muted">Login email</span>
              <input aria-label="Login email" className={field} value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label className="block space-y-1">
              <span className="text-dash-muted">Employer</span>
              <select aria-label="Employer" className={field} value={employer} onChange={(e) => setEmployer(e.target.value)}>
                <option value="">Choose…</option>
                {(employers.data ?? []).map((e) => (
                  <option key={e.uuid} value={e.uuid}>
                    {e.name}
                  </option>
                ))}
              </select>
            </label>
          </>
        ) : null}
        <fieldset className="space-y-1.5">
          <legend className="mb-1 text-dash-muted">Can see</legend>
          {scopes.map((s) => (
            <label key={s} className="flex items-center gap-2">
              <input type="checkbox" checked={chosen.includes(s)} onChange={() => toggle(s)} />
              {PORTAL_SCOPE_LABEL[s]}
            </label>
          ))}
        </fieldset>
        {chosen.includes("invoices") ? (
          <div className="space-y-1.5">
            <p className="text-dash-muted">Billing accounts whose invoices they see</p>
            {accounts.map((a) => (
              <div key={a.uuid} className="flex items-center justify-between">
                <span>{a.name}</span>
                <button type="button" className="text-primary hover:underline" onClick={() => setAccounts((cur) => cur.filter((x) => x.uuid !== a.uuid))}>
                  Remove
                </button>
              </div>
            ))}
            <input aria-label="Find billing account" placeholder="Find a billing account" className={field} value={search} onChange={(e) => setSearch(e.target.value)} />
            {(found.data?.results ?? [])
              .filter((c) => !accounts.some((a) => a.uuid === c.uuid))
              .map((c) => (
                <button
                  key={c.uuid}
                  type="button"
                  className="block w-full rounded px-2 py-1 text-left hover:bg-dash-canvas"
                  onClick={() => {
                    setAccounts((cur) => [...cur, { uuid: c.uuid, name: c.full_name }]);
                    setSearch("");
                  }}
                >
                  {c.full_name}
                </button>
              ))}
          </div>
        ) : null}
        {contact ? (
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            Portal access on
          </label>
        ) : null}
        <DrawerActions>
          <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
          <PageActionButton disabled={save.isPending} onClick={() => save.mutate()}>
            Save
          </PageActionButton>
        </DrawerActions>
      </div>
    </Drawer>
  );
}
