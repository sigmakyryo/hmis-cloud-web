"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { PageActionButton, SecondaryButton } from "@/components/ui/app-buttons";
import { Drawer, DrawerActions } from "@/app/(app)/immunizations/_components/shared/Drawer";
import {
  REQUEST_KIND_LABEL,
  REQUEST_STATUS_LABEL,
  createPortalRequest,
  fetchPortalFitness,
  fetchPortalRequests,
  type PortalRequestKind,
} from "@/features/employer-portal/services/employer-portal.service";
import { useToast } from "@/providers/toast-provider";

import { PortalState } from "./PortalShell";
import { DaCell, DaRow, errorText, fmtDate, ImmPrimaryCell, ImmRecordTable, ImmStatusBadge, ImmTabsBar } from "./portal-ui";

const BADGE = { pending: "pending", accepted: "active", done: "completed", declined: "overdue", cancelled: "closed" } as const;

export function PortalRequestsPage() {
  const [open, setOpen] = useState(false);
  const query = useQuery({ queryKey: ["employer-portal", "requests"], queryFn: fetchPortalRequests, retry: false });
  const rows = query.data ?? [];

  return (
    <div data-testid="employer-portal-requests">
      <h1 className="sr-only">Requests</h1>
      <ImmTabsBar<"all">
        label="Requests"
        tabs={[{ key: "all", label: "Your requests", count: rows.length || undefined }]}
        active="all"
        onChange={() => undefined}
        actions={<PageActionButton onClick={() => setOpen(true)}>New request</PageActionButton>}
      />
      <PortalState loading={query.isLoading} error={query.error} empty={query.isSuccess && rows.length === 0 ? "No requests yet." : null}>
        <ImmRecordTable columns={["Request", "Worker", "Preferred date", "Status", "Clinic reply"]}>
          {rows.map((r) => (
            <DaRow key={r.uuid} testId="employer-portal-request">
              <DaCell first>
                <ImmPrimaryCell title={REQUEST_KIND_LABEL[r.kind] ?? r.kind} detail={`${r.requested_by_name || "—"} · ${fmtDate(r.created_at)}`} />
              </DaCell>
              <DaCell>{r.worker_name || "—"}</DaCell>
              <DaCell>{fmtDate(r.preferred_date)}</DaCell>
              <DaCell>
                <ImmStatusBadge status={BADGE[r.status]} label={REQUEST_STATUS_LABEL[r.status]} />
              </DaCell>
              <DaCell>{r.staff_note || "—"}</DaCell>
            </DaRow>
          ))}
        </ImmRecordTable>
      </PortalState>
      {open ? <NewRequestDrawer onClose={() => setOpen(false)} /> : null}
    </div>
  );
}

function NewRequestDrawer({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const client = useQueryClient();
  const [kind, setKind] = useState<PortalRequestKind>("medical");
  const [worker, setWorker] = useState("");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const staff = useQuery({ queryKey: ["employer-portal", "fitness", "", ""], queryFn: () => fetchPortalFitness(), retry: false });
  const workers = staff.data?.results ?? [];
  const save = useMutation({
    mutationFn: () => {
      const known = workers.find((w) => w.customer_uuid === worker);
      return createPortalRequest({
        kind,
        customer_uuid: known?.customer_uuid,
        worker_name: known ? known.worker : undefined,
        preferred_date: date || undefined,
        note: note || undefined,
      });
    },
    onSuccess: () => {
      toast({ variant: "success", title: "Request sent" });
      void client.invalidateQueries({ queryKey: ["employer-portal", "requests"] });
      onClose();
    },
    onError: (error) => toast({ variant: "error", title: "Not sent", description: errorText(error) }),
  });
  const field = "h-9 w-full rounded-md border border-dash-border px-2.5 text-[13px]";

  return (
    <Drawer title="New request" description="The clinic will reply here" onClose={onClose}>
      <div className="space-y-3 text-[13px]" data-testid="employer-portal-new-request">
        <label className="block space-y-1">
          <span className="text-dash-muted">What do you need?</span>
          <select aria-label="Request type" className={field} value={kind} onChange={(e) => setKind(e.target.value as PortalRequestKind)}>
            {Object.entries(REQUEST_KIND_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-dash-muted">Worker (optional)</span>
          <select aria-label="Worker" className={field} value={worker} onChange={(e) => setWorker(e.target.value)}>
            <option value="">Not about one worker</option>
            {workers.map((w) => (
              <option key={w.customer_uuid} value={w.customer_uuid}>
                {w.employee_number ? `${w.worker} (${w.employee_number})` : w.worker}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-dash-muted">Preferred date</span>
          <input aria-label="Preferred date" type="date" className={field} value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="block space-y-1">
          <span className="text-dash-muted">Anything else</span>
          <textarea aria-label="Note" className="min-h-20 w-full rounded-md border border-dash-border px-2.5 py-2 text-[13px]" value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <p className="text-[12px] text-dash-muted">Please do not include medical details.</p>
        <DrawerActions>
          <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
          <PageActionButton disabled={save.isPending} onClick={() => save.mutate()}>
            Send request
          </PageActionButton>
        </DrawerActions>
      </div>
    </Drawer>
  );
}
