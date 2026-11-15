"use client";

import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";

import { SecondaryButton } from "@/components/ui/app-buttons";
import { Input } from "@/components/ui/input";
import type { Customer } from "@/features/customers/types/customer.types";
import { OhIodForm } from "@/features/occupational-health/components/OhIodTabPanel";
import { fetchOhEmployees } from "@/features/occupational-health/services/oh.service";
import { appFont } from "@/lib/fonts";
import { cn } from "@/lib/utils";

/** Open a case: pick the employee, then fill in the incident. */
export function IodCaseCreateDialog({ onClose, onSaved }: { onClose: () => void; onSaved: () => Promise<void> }) {
  return (
    <div className={cn("fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4", appFont.className)}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-md bg-white p-5 shadow-sm" data-testid="oh-iod-case-dialog">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-brand-navy">Open case</h2>
          <SecondaryButton type="button" onClick={onClose}>
            Close
          </SecondaryButton>
        </div>
        <CreateIodCaseForm onClose={onClose} onSaved={onSaved} />
      </div>
    </div>
  );
}

function CreateIodCaseForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => Promise<void> }): ReactNode {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Customer | null>(null);
  const employees = useQuery({
    queryKey: ["oh-employees", "iod-create", search],
    queryFn: () => fetchOhEmployees({ search, page: 1, pageSize: 8 }),
    enabled: search.trim().length >= 2 && !selected,
  });

  if (!selected) {
    return (
      <div className="space-y-3" data-testid="oh-iod-employee-picker">
        <p className="text-[13px] text-dash-muted">Choose the employee this case belongs to.</p>
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search employees" aria-label="Search employees" autoFocus />
        {employees.isLoading ? <p className="text-[13px] text-dash-muted">Searching…</p> : null}
        <ul className="divide-y divide-dash-border">
          {(employees.data?.results ?? []).map((employee) => (
            <li key={employee.uuid}>
              <button type="button" className="flex w-full flex-col items-start px-1 py-2 text-left text-[13px]" onClick={() => setSelected(employee)}>
                <span className="font-medium text-brand-navy">{employee.full_name}</span>
                <span className="text-[12px] text-dash-muted">{employee.customer_identifier}</span>
              </button>
            </li>
          ))}
        </ul>
        {search.trim().length >= 2 && !employees.isLoading && (employees.data?.results ?? []).length === 0 ? (
          <p className="text-[13px] text-dash-muted">No employees match that search.</p>
        ) : null}
        <div className="flex justify-end">
          <SecondaryButton type="button" onClick={onClose}>
            Cancel
          </SecondaryButton>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[13px] text-dash-muted">
        {selected.full_name}
        <button type="button" className="ml-2 font-medium text-brand-primary" onClick={() => setSelected(null)}>
          Change
        </button>
      </p>
      <OhIodForm
        customerId={selected.id}
        customerUuid={selected.uuid}
        tenantId={selected.tenant}
        onCreated={() => {
          void onSaved();
        }}
      />
    </div>
  );
}
