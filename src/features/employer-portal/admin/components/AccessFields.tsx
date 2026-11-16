"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { fetchCustomers } from "@/features/customers/services/customers.service";
import {
  PORTAL_SCOPES,
  PORTAL_SCOPE_LABEL,
  type PortalScope,
} from "@/features/employer-portal/services/employer-portal.service";

export const accessFieldClass = "h-9 w-full rounded-md border border-dash-border px-2.5 text-[13px]";

export type BillingAccount = { uuid: string; name: string };

export function ScopeCheckboxes({ chosen, onChange }: { chosen: PortalScope[]; onChange: (next: PortalScope[]) => void }) {
  const toggle = (scope: PortalScope) => onChange(chosen.includes(scope) ? chosen.filter((item) => item !== scope) : [...chosen, scope]);
  return (
    <fieldset className="space-y-1.5">
      <legend className="mb-1 text-dash-muted">Can see</legend>
      {PORTAL_SCOPES.map((scope) => (
        <label key={scope} className="flex items-center gap-2">
          <input type="checkbox" checked={chosen.includes(scope)} onChange={() => toggle(scope)} />
          {PORTAL_SCOPE_LABEL[scope]}
        </label>
      ))}
    </fieldset>
  );
}

/** Billing accounts whose invoices a login can see. Only relevant when "Invoices" is ticked. */
export function BillingAccountPicker({ accounts, onChange }: { accounts: BillingAccount[]; onChange: (next: BillingAccount[]) => void }) {
  const [search, setSearch] = useState("");
  const found = useQuery({
    queryKey: ["customers", "portal-billing", search],
    queryFn: () => fetchCustomers({ search, pageSize: 8 }),
    enabled: search.trim().length >= 2,
    retry: false,
  });
  const matches = (found.data?.results ?? []).filter((customer) => !accounts.some((account) => account.uuid === customer.uuid));

  return (
    <div className="space-y-1.5">
      <p className="text-dash-muted">Billing accounts whose invoices they see</p>
      {accounts.map((account) => (
        <div key={account.uuid} className="flex items-center justify-between">
          <span>{account.name}</span>
          <button type="button" className="text-primary hover:underline" onClick={() => onChange(accounts.filter((item) => item.uuid !== account.uuid))}>
            Remove
          </button>
        </div>
      ))}
      <input aria-label="Find billing account" placeholder="Find a billing account" className={accessFieldClass} value={search} onChange={(event) => setSearch(event.target.value)} />
      {matches.map((customer) => (
        <button
          key={customer.uuid}
          type="button"
          className="block w-full rounded px-2 py-1 text-left hover:bg-dash-canvas"
          onClick={() => {
            onChange([...accounts, { uuid: customer.uuid, name: customer.full_name }]);
            setSearch("");
          }}
        >
          {customer.full_name}
        </button>
      ))}
    </div>
  );
}
