"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { Drawer, DrawerActions } from "@/app/(app)/immunizations/_components/shared/Drawer";
import { EmptyAction } from "@/app/(app)/immunizations/_components/shared/EmptyAction";
import { ImmFilterBar } from "@/app/(app)/immunizations/_components/shared/ImmTabsBar";
import { ImmPrimaryCell, ImmRecordTable, ImmRowAction } from "@/app/(app)/immunizations/_components/shared/ImmRecordTable";
import { LoadError, QuietLoading } from "@/app/(app)/immunizations/_components/shared/QuietLoading";
import { errorText, fmtDate } from "@/app/(app)/drug-alcohol/_components/shared/da-format";
import { DaCell, DaRow } from "@/app/(app)/drug-alcohol/_components/shared/da-ui";
import { PageActionButton, SecondaryButton } from "@/components/ui/app-buttons";
import { ROUTES } from "@/constants/routes";
import { useRequestsQuery } from "@/features/employer-portal/admin/hooks/useEmployersQueries";
import {
  REQUEST_KIND_LABEL,
  REQUEST_STATUS_LABEL,
  handlePortalRequest,
  type PortalRequest,
} from "@/features/employer-portal/services/employer-portal.service";
import { cn } from "@/lib/utils";
import { useToast } from "@/providers/toast-provider";

export const REQUEST_FILTERS = [
  { status: "pending", label: "New" },
  { status: "accepted", label: "Accepted" },
  { status: "done", label: "Done" },
  { status: "declined", label: "Declined" },
] as const;

type RequestFilter = (typeof REQUEST_FILTERS)[number]["status"];

/** Unknown or missing `?status=` falls back to new requests. */
export function parseRequestFilter(value: string | null): RequestFilter {
  return REQUEST_FILTERS.find((filter) => filter.status === value)?.status ?? "pending";
}

const EMPTY_COPY: Record<RequestFilter, string> = {
  pending: "Requests that employers send from their portal show here.",
  accepted: "Requests you have accepted and not finished yet show here.",
  done: "Finished requests show here.",
  declined: "Requests you declined show here.",
};

function FilterChip({ status, label, active, count }: { status: RequestFilter; label: string; active: boolean; count?: number }) {
  return (
    <Link
      href={`${ROUTES.employersRequests}?status=${status}`}
      aria-current={active ? "page" : undefined}
      className={cn(
        "rounded-full border px-3 py-1 text-[13px] transition-colors",
        active ? "border-brand-primary bg-brand-primary/10 text-brand-primary" : "border-dash-border text-brand-muted hover:text-brand-navy",
      )}
    >
      {label}
      {count ? <span className="ml-1.5 tabular-nums">{count}</span> : null}
    </Link>
  );
}

export function EmployersRequestsPage() {
  const status = parseRequestFilter(useSearchParams().get("status"));
  const [selected, setSelected] = useState<PortalRequest | null>(null);
  const query = useRequestsQuery(status);
  const rows = query.data ?? [];

  return (
    <>
      <ImmFilterBar>
        {REQUEST_FILTERS.map((filter) => (
          <FilterChip
            key={filter.status}
            status={filter.status}
            label={filter.label}
            active={filter.status === status}
            count={filter.status === status ? query.data?.length : undefined}
          />
        ))}
      </ImmFilterBar>
      {query.isLoading ? <QuietLoading /> : null}
      {query.isError ? <LoadError>{errorText(query.error, "Could not load requests.")}</LoadError> : null}
      {query.isSuccess && rows.length === 0 ? <EmptyAction icon="clipboard" title="Nothing here" description={EMPTY_COPY[status]} /> : null}
      {query.isSuccess && rows.length > 0 ? (
        <ImmRecordTable columns={["Employer", "Request", "Worker", "Preferred date", "Sent", "Actions"]}>
          {rows.map((r) => (
            <DaRow key={r.uuid} testId="oh-portal-request-row" onClick={() => setSelected(r)}>
              <DaCell first>
                <ImmPrimaryCell title={r.employer_name ?? "—"} detail={r.requested_by_name || undefined} />
              </DaCell>
              <DaCell>{REQUEST_KIND_LABEL[r.kind] ?? r.kind}</DaCell>
              <DaCell>{r.worker_name || "—"}</DaCell>
              <DaCell>{fmtDate(r.preferred_date)}</DaCell>
              <DaCell>{fmtDate(r.created_at)}</DaCell>
              <DaCell actions>
                <ImmRowAction onClick={() => setSelected(r)}>Open</ImmRowAction>
              </DaCell>
            </DaRow>
          ))}
        </ImmRecordTable>
      ) : null}
      {selected ? <RequestDrawer request={selected} onClose={() => setSelected(null)} /> : null}
    </>
  );
}

function RequestDrawer({ request, onClose }: { request: PortalRequest; onClose: () => void }) {
  const { toast } = useToast();
  const client = useQueryClient();
  const [note, setNote] = useState(request.staff_note ?? "");
  const save = useMutation({
    mutationFn: (status: "accepted" | "done" | "declined") => handlePortalRequest(request.uuid, status, note),
    onSuccess: () => {
      toast({ variant: "success", title: "Saved", description: "The employer sees your reply in their portal." });
      void client.invalidateQueries({ queryKey: ["oh-portal-admin", "requests"] });
      onClose();
    },
    onError: (error) => toast({ variant: "error", title: "Not saved", description: errorText(error) }),
  });
  const closed = request.status === "done" || request.status === "declined" || request.status === "cancelled";
  return (
    <Drawer title={`${REQUEST_KIND_LABEL[request.kind] ?? request.kind} · ${request.employer_name ?? ""}`} description={REQUEST_STATUS_LABEL[request.status]} onClose={onClose}>
      <div className="space-y-3 text-[13px]" data-testid="oh-portal-request-sheet">
        <p>
          <span className="text-dash-muted">Worker: </span>
          {request.worker_name || "Not about one worker"}
        </p>
        <p>
          <span className="text-dash-muted">Preferred date: </span>
          {fmtDate(request.preferred_date)}
        </p>
        {request.note ? <p className="whitespace-pre-wrap rounded-md bg-dash-canvas px-3 py-2">{request.note}</p> : null}
        <label className="block space-y-1">
          <span className="text-dash-muted">Reply to the employer</span>
          <textarea aria-label="Reply" className="min-h-20 w-full rounded-md border border-dash-border px-3 py-2" value={note} disabled={closed} onChange={(e) => setNote(e.target.value)} />
        </label>
        {!closed ? (
          <DrawerActions>
            <SecondaryButton disabled={save.isPending} onClick={() => save.mutate("declined")}>
              Decline
            </SecondaryButton>
            {request.status === "pending" ? (
              <SecondaryButton disabled={save.isPending} onClick={() => save.mutate("accepted")}>
                Accept
              </SecondaryButton>
            ) : null}
            <PageActionButton disabled={save.isPending} onClick={() => save.mutate("done")}>
              Mark done
            </PageActionButton>
          </DrawerActions>
        ) : null}
      </div>
    </Drawer>
  );
}
