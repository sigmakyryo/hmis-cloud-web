"use client";

import Link from "next/link";
import { HardHat } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { PrimaryButton, SecondaryButton } from "@/components/ui/app-buttons";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { ListPageHeaderSection, ListPageLayout } from "@/features/app-shell/components/page-layout";
import { OhIodForm } from "@/features/occupational-health/components/OhIodTabPanel";
import type { Customer } from "@/features/customers/types/customer.types";
import { fetchIodCases, fetchOhEmployees } from "@/features/occupational-health/services/oh.service";
import type { IodCase } from "@/features/occupational-health/types";
import { formatOhDate, humanizeOhCode } from "@/features/occupational-health/utils/oh-format";
import { ROUTES } from "@/constants/routes";
import { appFont } from "@/lib/fonts";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | "open" | "closed";

export function OhIodCasesPage() {
  const queryClient = useQueryClient();
  const cases = useQuery({ queryKey: ["oh-iod-cases"], queryFn: fetchIodCases });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<IodCase | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (cases.data ?? []).filter((row) => {
      const status = (row.status || "open").toLowerCase();
      if (statusFilter === "open" && status === "closed") return false;
      if (statusFilter === "closed" && status !== "closed") return false;
      if (!q) return true;
      return [
        row.description,
        row.mechanism,
        row.body_part,
        row.incident_location,
        row.she_reference,
        row.severity,
        row.status,
        row.onset_date,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
  }, [cases.data, search, statusFilter]);

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["oh-iod-cases"] });
  }

  const isEmpty = !cases.isLoading && !cases.isError && (cases.data ?? []).length === 0;
  const noMatches = !cases.isLoading && (cases.data ?? []).length > 0 && filtered.length === 0;

  return (
    <ListPageLayout data-testid="oh-iod-cases-page">
      <ListPageHeaderSection>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-brand-navy">Injuries on duty</h1>
            <p className="text-[13px] text-dash-muted">
              Workplace injuries and incidents. Open a case from a visit or here; statutory packs stay on each record.
            </p>
          </div>
          <PrimaryButton type="button" onClick={() => setCreating(true)}>
            Open case
          </PrimaryButton>
        </div>
      </ListPageHeaderSection>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search cases"
            className="h-8 max-w-xs text-[13px]"
            aria-label="Search cases"
          />
          {(["all", "open", "closed"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setStatusFilter(value)}
              className={cn(
                "rounded-full px-2.5 py-0.5 text-[12px] font-medium capitalize",
                statusFilter === value ? "bg-brand-navy text-white" : "bg-slate-100 text-dash-muted",
              )}
            >
              {value === "all" ? "All statuses" : value === "open" ? "Open" : "Closed"}
            </button>
          ))}
        </div>
        {cases.isError ? <p className="text-[13px] text-red-700">Could not load injury cases.</p> : null}
        {cases.isLoading ? <p className="text-[13px] text-dash-muted">Loading cases…</p> : null}
        {isEmpty ? (
          <EmptyState
            icon={HardHat}
            title="No injuries on duty"
            description="Open a case when a workplace incident is reported, or start one from the visit workspace."
            action={
              <PrimaryButton type="button" onClick={() => setCreating(true)}>
                Open case
              </PrimaryButton>
            }
            data-testid="oh-iod-cases-empty"
          />
        ) : null}
        {noMatches ? (
          <p className="py-8 text-center text-[13px] text-dash-muted">No cases match those filters.</p>
        ) : null}
        {filtered.length > 0 ? (
          <div className="overflow-x-auto" data-testid="oh-iod-cases-list">
            <table className="w-full min-w-[40rem] border-collapse text-left">
              <thead>
                <tr className="border-b border-dash-border text-[11px] font-medium uppercase tracking-wide text-dash-muted">
                  <th className="px-2 py-2 font-medium">Onset</th>
                  <th className="px-2 py-2 font-medium">Incident</th>
                  <th className="px-2 py-2 font-medium">Severity</th>
                  <th className="px-2 py-2 font-medium">Status</th>
                  <th className="px-2 py-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.uuid} className="border-b border-dash-border last:border-0">
                    <td className="px-2 py-2 align-top text-[13px] text-brand-navy">
                      {formatOhDate(row.onset_date)}
                    </td>
                    <td className="px-2 py-2 align-top">
                      <p className="text-[13px] font-medium text-brand-navy">
                        {row.mechanism || row.body_part || "IOD case"}
                      </p>
                      <p className="text-[12px] text-dash-muted">
                        {[row.body_part, row.incident_location, row.she_reference ? `SHE ${row.she_reference}` : null]
                          .filter(Boolean)
                          .join(" · ") || row.description}
                      </p>
                    </td>
                    <td className="px-2 py-2 align-top">
                      <Badge tone={row.severity === "fatal" || row.severity === "major" ? "attention" : "muted"}>
                        {humanizeOhCode(row.severity)}
                      </Badge>
                    </td>
                    <td className="px-2 py-2 align-top">
                      <Badge tone={row.status === "closed" ? "ok" : "attention"}>
                        {humanizeOhCode(row.status || "open")}
                      </Badge>
                    </td>
                    <td className="px-2 py-2 align-top">
                      <div className="flex flex-wrap items-center justify-end gap-x-3">
                        <button
                          type="button"
                          className="text-[13px] font-medium text-brand-primary"
                          onClick={() => setEditing(row)}
                        >
                          Edit
                        </button>
                        <Link
                          className="text-[13px] font-medium text-brand-primary"
                          href={ROUTES.occupationalHealthRecord("iod", row.uuid)}
                        >
                          Open
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
      {creating ? (
        <CaseDialog title="Open case" onClose={() => setCreating(false)}>
          <CreateIodCaseForm
            onClose={() => setCreating(false)}
            onSaved={async () => {
              await refresh();
              setCreating(false);
            }}
          />
        </CaseDialog>
      ) : null}
      {editing ? (
        <CaseDialog title="Edit case" onClose={() => setEditing(null)}>
          <OhIodForm
            key={editing.uuid}
            customerId={editing.customer}
            tenantId={0}
            existing={editing}
            onCreated={async () => {
              await refresh();
              setEditing(null);
            }}
            onSaved={async () => {
              await refresh();
              setEditing(null);
            }}
          />
        </CaseDialog>
      ) : null}
    </ListPageLayout>
  );
}

function Badge({ tone, children }: { tone: "ok" | "attention" | "muted"; children: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[12px] font-medium",
        tone === "ok" && "bg-emerald-50 text-emerald-800",
        tone === "attention" && "bg-amber-50 text-amber-900",
        tone === "muted" && "bg-slate-100 text-dash-muted",
      )}
    >
      {children}
    </span>
  );
}

function CaseDialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className={cn("fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4", appFont.className)}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-md bg-white p-5 shadow-sm" data-testid="oh-iod-case-dialog">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-brand-navy">{title}</h2>
          <SecondaryButton type="button" onClick={onClose}>
            Close
          </SecondaryButton>
        </div>
        {children}
      </div>
    </div>
  );
}

function CreateIodCaseForm({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
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
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search employees"
          aria-label="Search employees"
          autoFocus
        />
        {employees.isLoading ? <p className="text-[13px] text-dash-muted">Searching…</p> : null}
        <ul className="divide-y divide-dash-border">
          {(employees.data?.results ?? []).map((employee) => (
            <li key={employee.uuid}>
              <button
                type="button"
                className="flex w-full flex-col items-start px-1 py-2 text-left text-[13px]"
                onClick={() => setSelected(employee)}
              >
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
        <button
          type="button"
          className="ml-2 font-medium text-brand-primary"
          onClick={() => setSelected(null)}
        >
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
