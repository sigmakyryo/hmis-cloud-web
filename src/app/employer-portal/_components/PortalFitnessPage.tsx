"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { FIT_STATUS_LABEL, fetchPortalFitness, type PortalFitStatus } from "@/features/employer-portal/services/employer-portal.service";

import { PortalState } from "./PortalShell";
import { DaCell, DaRow, fmtDate, ImmPrimaryCell, ImmRecordTable, ImmStatusBadge, ImmTabsBar } from "./portal-ui";

type View = "" | PortalFitStatus | "due_soon";
const BADGE: Record<PortalFitStatus, string> = { fit: "active", fit_with_restrictions: "pending", not_fit: "overdue", awaiting: "closed" };

export function PortalFitnessPage() {
  const [view, setView] = useState<View>("");
  const [search, setSearch] = useState("");
  const query = useQuery({ queryKey: ["employer-portal", "fitness", view, search], queryFn: () => fetchPortalFitness(view || undefined, search || undefined), retry: false });
  const counts = query.data?.counts;
  const rows = query.data?.results ?? [];

  return (
    <div data-testid="employer-portal-fitness">
      <h1 className="sr-only">Fit for work</h1>
      <ImmTabsBar<View>
        label="Fit for work views"
        tabs={[
          { key: "", label: "Everyone" },
          { key: "fit", label: "Fit", count: counts?.fit },
          { key: "fit_with_restrictions", label: "Fit with limits", count: counts?.fit_with_restrictions },
          { key: "not_fit", label: "Not fit", count: counts?.not_fit },
          { key: "awaiting", label: "Not yet assessed", count: counts?.awaiting },
          { key: "due_soon", label: "Due in 30 days", count: counts?.due_soon },
        ]}
        active={view}
        onChange={setView}
        actions={
          <input
            aria-label="Search workers"
            placeholder="Search name or number"
            className="h-8 w-56 rounded-md border border-dash-border px-2.5 text-[13px]"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        }
      />
      <PortalState loading={query.isLoading} error={query.error} empty={query.isSuccess && rows.length === 0 ? "No workers to show." : null}>
        <ImmRecordTable columns={["Worker", "Site", "Department", "Status", "Valid until"]}>
          {rows.map((w) => (
            <DaRow key={w.customer_uuid} testId="employer-portal-worker">
              <DaCell first>
                <ImmPrimaryCell title={w.worker} detail={w.employee_number || undefined} />
              </DaCell>
              <DaCell>{w.site || "—"}</DaCell>
              <DaCell>{w.department || "—"}</DaCell>
              <DaCell>
                <ImmStatusBadge status={BADGE[w.status]} label={FIT_STATUS_LABEL[w.status]} />
              </DaCell>
              <DaCell>
                {w.valid_until ? fmtDate(w.valid_until) : "—"}
                {w.due_soon ? <span className="ml-2 text-[12px] text-amber-700">Due soon</span> : null}
              </DaCell>
            </DaRow>
          ))}
        </ImmRecordTable>
      </PortalState>
      <p className="px-5 py-3 text-[12px] text-dash-muted">Only fit-for-work status is shown here. Medical details stay with the clinic.</p>
    </div>
  );
}
