"use client";

import { useQuery } from "@tanstack/react-query";
import { SecurityCheckIcon, UserGroupIcon } from "@hugeicons/core-free-icons";
import { useState } from "react";

import { PortalPagination } from "@/features/employer-portal/components/PortalPagination";
import { usePortalPagination } from "@/features/employer-portal/hooks/usePortalPagination";
import {
  PortalCell,
  PortalFootnote,
  PortalPage,
  PortalPageHeader,
  PortalPerson,
  PortalPill,
  PortalRow,
  PortalSearch,
  PortalStatStrip,
  PortalStatusPill,
  PortalTable,
  PortalToolbar,
  type PillTone,
} from "@/features/employer-portal/components/PortalPrimitives";
import { FIT_STATUS_LABEL, fetchPortalFitness, type PortalFitStatus } from "@/features/employer-portal/services/employer-portal.service";

import { PortalState } from "./PortalShell";
import { fmtDate } from "./portal-ui";

type View = "" | PortalFitStatus | "due_soon";
const TONE: Record<PortalFitStatus, PillTone> = { fit: "good", fit_with_restrictions: "warn", not_fit: "bad", awaiting: "neutral" };

export function PortalFitnessPage() {
  const [view, setView] = useState<View>("");
  const [search, setSearch] = useState("");
  const query = useQuery({ queryKey: ["employer-portal", "fitness", view, search], queryFn: () => fetchPortalFitness(view || undefined, search || undefined), retry: false });
  const counts = query.data?.counts;
  const rows = query.data?.results ?? [];
  const { pageRows, pagination } = usePortalPagination(rows, `${view}|${search}`);
  const total = counts ? counts.fit + counts.fit_with_restrictions + counts.not_fit + counts.awaiting : 0;

  const filters: Array<{ key: View; label: string; count?: number }> = [
    { key: "", label: "Everyone" },
    { key: "fit", label: "Fit", count: counts?.fit },
    { key: "fit_with_restrictions", label: "Fit with limits", count: counts?.fit_with_restrictions },
    { key: "not_fit", label: "Not fit", count: counts?.not_fit },
    { key: "awaiting", label: "Not yet assessed", count: counts?.awaiting },
    { key: "due_soon", label: "Due in 30 days", count: counts?.due_soon },
  ];

  return (
    <PortalPage testId="employer-portal-fitness">
      <PortalPageHeader icon={SecurityCheckIcon} title="Fit for work" subtitle="Where each of your workers stands today" />
      <PortalStatStrip
        loading={query.isLoading}
        stats={[
          { label: "Workers", value: String(total) },
          { label: "Fit", value: String(counts?.fit ?? 0), tone: "good" },
          { label: "Fit with limits", value: String(counts?.fit_with_restrictions ?? 0) },
          { label: "Not fit", value: String(counts?.not_fit ?? 0), note: counts?.not_fit ? "Needs attention" : undefined, tone: "bad" },
          { label: "Due in 30 days", value: String(counts?.due_soon ?? 0), note: counts?.due_soon ? "Book soon" : undefined },
        ]}
      />
      <PortalToolbar>
        <PortalSearch label="Search workers" placeholder="Search name or number" value={search} onChange={setSearch} />
        <div className="flex flex-wrap gap-2" role="group" aria-label="Fit for work views">
          {filters.map((filter) => (
            <PortalPill key={filter.key || "all"} active={view === filter.key} count={filter.count} onClick={() => setView(filter.key)}>
              {filter.label}
            </PortalPill>
          ))}
        </div>
      </PortalToolbar>
      <PortalState loading={query.isLoading} error={query.error} empty={query.isSuccess && rows.length === 0 ? "No workers match this view." : null} emptyIcon={UserGroupIcon} emptyTitle="No workers to show">
        <PortalTable columns={["Worker", "Site", "Department", "Status", "Valid until"]}>
          {pageRows.map((w) => (
            <PortalRow key={w.customer_uuid} testId="employer-portal-worker">
              <PortalCell>
                <PortalPerson title={w.worker} detail={w.employee_number || undefined} />
              </PortalCell>
              <PortalCell>{w.site || "—"}</PortalCell>
              <PortalCell>{w.department || "—"}</PortalCell>
              <PortalCell>
                <PortalStatusPill tone={TONE[w.status]}>{FIT_STATUS_LABEL[w.status]}</PortalStatusPill>
              </PortalCell>
              <PortalCell>
                {w.valid_until ? fmtDate(w.valid_until) : "—"}
                {w.due_soon ? <span className="ml-2 text-[12px] text-amber-700">Due soon</span> : null}
              </PortalCell>
            </PortalRow>
          ))}
        </PortalTable>
      </PortalState>
      <PortalPagination {...pagination} />
      <PortalFootnote>Only fit-for-work status is shown here. Medical details stay with the clinic.</PortalFootnote>
    </PortalPage>
  );
}
