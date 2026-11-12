"use client";

import { useDeferredValue, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusDotBadge } from "@/components/ui/status-dot-badge";
import { Textarea } from "@/components/ui/textarea";
import {
  useQuarantineTheatreTray,
  useReleaseTheatreTrayQuarantine,
  useTheatreTray,
  useTheatreTraySets,
  useTheatreTrays,
} from "@/features/clinical-theatre/hooks/use-theatre-cssd";
import type {
  TheatreTray,
  TheatreTrayStatus,
} from "@/features/clinical-theatre/types/theatre-cssd.types";
import {
  TRAY_STATUS_LABELS,
  TRAY_STATUS_TONE,
  cycleLabel,
} from "@/features/clinical-theatre/utils/theatre-cssd-display";
import { formatDateTime } from "@/features/clinical-theatre/utils/theatre-planning-display";
import { errorMessage } from "@/features/clinical-theatre/utils/theatre-record-display";

const ANY = "__any__";

export function ReasonDialog({
  title,
  description,
  action,
  required,
  busy,
  error,
  onSubmit,
  onClose,
}: {
  title: string;
  description: string;
  action: string;
  required: boolean;
  busy: boolean;
  error: unknown;
  onSubmit: (reason: string) => void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  return (
    <Dialog open onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <Textarea aria-label="Reason" value={reason} onChange={(event) => setReason(event.target.value)} />
        {error ? <p className="text-sm text-red-600">{errorMessage(error, "Could not save.")}</p> : null}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={busy || (required && !reason.trim())} onClick={() => onSubmit(reason.trim())}>
            {action}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TrayDetailDialog({ uuid, onClose }: { uuid: string; onClose: () => void }) {
  const { data: tray, isLoading } = useTheatreTray(uuid);
  return (
    <Dialog open onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tray {tray?.barcode ?? ""}</DialogTitle>
          <DialogDescription>
            {tray ? `${tray.tray_set_name} · ${cycleLabel(tray.last_cycle)}` : "Loading…"}
          </DialogDescription>
        </DialogHeader>
        {isLoading || !tray ? null : (
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <StatusDotBadge tone={TRAY_STATUS_TONE[tray.status]}>{TRAY_STATUS_LABELS[tray.status]}</StatusDotBadge>
              {tray.sterile_until ? <span>Sterile until {tray.sterile_until}</span> : null}
              {tray.problem ? <span className="text-amber-700">{tray.problem}</span> : null}
            </div>
            {tray.quarantine_reason ? <p>Quarantine: {tray.quarantine_reason}</p> : null}
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Missing / damaged instruments</p>
              {tray.issues.length === 0 ? (
                <p className="text-muted-foreground">None recorded.</p>
              ) : (
                <ul className="space-y-0.5">
                  {tray.issues.map((issue) => (
                    <li key={issue.uuid}>
                      {issue.quantity} × {issue.name} — {issue.kind_label}
                      {issue.notes ? ` (${issue.notes})` : ""}
                      {issue.returned_at ? (
                        <span className="text-muted-foreground"> · {formatDateTime(issue.returned_at)}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">History</p>
              <ul className="space-y-0.5" data-testid="theatre-tray-events">
                {tray.events.map((event) => (
                  <li key={event.uuid}>
                    <span className="text-muted-foreground">{formatDateTime(event.created_at)}</span> ·{" "}
                    {event.action.replaceAll("_", " ")}
                    {event.to_status ? ` → ${TRAY_STATUS_LABELS[event.to_status as TheatreTrayStatus] ?? event.to_status}` : ""}
                    {event.cycle_number ? ` · cycle ${event.cycle_number}` : ""}
                    {event.note ? ` · ${event.note}` : ""}
                    {event.actor_name ? ` · ${event.actor_name}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** CSSD trays list: status, sterility, quarantine. */
export function TheatreCssdTraysTab({ canQuarantine }: { canQuarantine: boolean }) {
  const [search, setSearch] = useState("");
  const q = useDeferredValue(search.trim());
  const [status, setStatus] = useState<TheatreTrayStatus | "">("");
  const [traySet, setTraySet] = useState("");
  const { data: sets = [] } = useTheatreTraySets();
  const { data: trays = [], isLoading, error } = useTheatreTrays({
    status,
    tray_set: traySet || undefined,
    q: q || undefined,
  });
  const quarantine = useQuarantineTheatreTray();
  const release = useReleaseTheatreTrayQuarantine();
  const [quarantining, setQuarantining] = useState<TheatreTray | null>(null);
  const [releasing, setReleasing] = useState<TheatreTray | null>(null);
  const [detail, setDetail] = useState<string | null>(null);

  return (
    <div className="space-y-3" data-testid="theatre-cssd-trays">
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <Label htmlFor="cssd-tray-search">Barcode / tray</Label>
          <Input
            id="cssd-tray-search"
            className="w-56"
            placeholder="Scan or type"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label>Status</Label>
          <Select value={status || ANY} onValueChange={(value) => setStatus(value === ANY ? "" : (value as TheatreTrayStatus))}>
            <SelectTrigger aria-label="Tray status" className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>All statuses</SelectItem>
              {(Object.keys(TRAY_STATUS_LABELS) as TheatreTrayStatus[]).map((key) => (
                <SelectItem key={key} value={key}>
                  {TRAY_STATUS_LABELS[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Tray set</Label>
          <Select value={traySet || ANY} onValueChange={(value) => setTraySet(value === ANY ? "" : value)}>
            <SelectTrigger aria-label="Tray set" className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>All tray sets</SelectItem>
              {sets.map((set) => (
                <SelectItem key={set.uuid} value={set.uuid}>
                  {set.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading trays…</p>
      ) : error ? (
        <p className="text-sm text-red-600">{errorMessage(error, "Could not load trays.")}</p>
      ) : trays.length === 0 ? (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          No trays match. Register trays under Settings → Theatre → CSSD &amp; counts.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Tray</th>
                <th className="px-3 py-2">Set</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Sterile until</th>
                <th className="px-3 py-2">Last cycle</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {trays.map((tray) => (
                <tr key={tray.uuid} className="border-t" data-testid="theatre-cssd-tray-row">
                  <td className="px-3 py-2">
                    <button type="button" className="font-mono text-brand-primary underline" onClick={() => setDetail(tray.uuid)}>
                      {tray.barcode}
                    </button>
                    {tray.label ? <p className="text-xs text-muted-foreground">{tray.label}</p> : null}
                  </td>
                  <td className="px-3 py-2">{tray.tray_set_name}</td>
                  <td className="px-3 py-2">
                    <StatusDotBadge tone={TRAY_STATUS_TONE[tray.status]}>{TRAY_STATUS_LABELS[tray.status]}</StatusDotBadge>
                    {tray.status === "available" && tray.problem ? (
                      <p className="text-xs text-amber-700">{tray.problem}</p>
                    ) : null}
                    {tray.open_issue_count > 0 ? (
                      <p className="text-xs text-red-600">{tray.open_issue_count} instrument issue(s)</p>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">{tray.sterile_until ?? "—"}</td>
                  <td className="px-3 py-2 text-xs">{cycleLabel(tray.last_cycle)}</td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    {canQuarantine && tray.status === "quarantined" ? (
                      <Button size="sm" variant="outline" onClick={() => setReleasing(tray)}>
                        Release for reprocessing
                      </Button>
                    ) : canQuarantine && tray.status !== "in_use" ? (
                      <Button size="sm" variant="ghost" onClick={() => setQuarantining(tray)}>
                        Quarantine
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {quarantining ? (
        <ReasonDialog
          title={`Quarantine tray ${quarantining.barcode}`}
          description="The tray cannot be used or loaded until it is released for reprocessing."
          action="Quarantine"
          required
          busy={quarantine.isPending}
          error={quarantine.error}
          onClose={() => setQuarantining(null)}
          onSubmit={(reason) =>
            quarantine.mutate({ uuid: quarantining.uuid, reason }, { onSuccess: () => setQuarantining(null) })
          }
        />
      ) : null}
      {releasing ? (
        <ReasonDialog
          title={`Release tray ${releasing.barcode}`}
          description="The tray goes to awaiting reprocessing and must be sterilised again before use."
          action="Release"
          required={false}
          busy={release.isPending}
          error={release.error}
          onClose={() => setReleasing(null)}
          onSubmit={(reason) =>
            release.mutate({ uuid: releasing.uuid, reason }, { onSuccess: () => setReleasing(null) })
          }
        />
      ) : null}
      {detail ? <TrayDetailDialog uuid={detail} onClose={() => setDetail(null)} /> : null}
    </div>
  );
}
