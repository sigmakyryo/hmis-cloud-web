"use client";

import { useState } from "react";

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
import { ReasonDialog } from "@/features/clinical-theatre/components/TheatreCssdTraysTab";
import {
  useRecallTheatreCycle,
  useRecordTheatreCycleResult,
  useStartTheatreCycle,
  useTheatreCycle,
  useTheatreCycles,
  useTheatreSterilisers,
  useTheatreTrays,
} from "@/features/clinical-theatre/hooks/use-theatre-cssd";
import type {
  TheatreCycleStatus,
  TheatreIndicatorResult,
  TheatreTray,
} from "@/features/clinical-theatre/types/theatre-cssd.types";
import {
  INDICATOR_LABELS,
  INDICATOR_TONE,
  TRAY_STATUS_LABELS,
} from "@/features/clinical-theatre/utils/theatre-cssd-display";
import { formatDateTime } from "@/features/clinical-theatre/utils/theatre-planning-display";
import { errorMessage } from "@/features/clinical-theatre/utils/theatre-record-display";

const ANY = "__any__";
const CYCLE_STATUS_LABELS: Record<TheatreCycleStatus, string> = {
  running: "Running / awaiting result",
  released: "Released",
  failed: "Failed",
  recalled: "Recalled",
};
const CYCLE_STATUS_TONE = {
  running: "warning",
  released: "success",
  failed: "danger",
  recalled: "danger",
} as const;
const INDICATOR_CHOICES: TheatreIndicatorResult[] = ["pending", "pass", "fail", "not_used"];

/** Trays that may go into a new load, matching the steriliser's method. */
export function loadableTrays(trays: TheatreTray[], method: string | null): TheatreTray[] {
  return trays.filter(
    (tray) =>
      (tray.status === "awaiting_reprocessing" || tray.status === "available") &&
      (!method || tray.method === method),
  );
}

function StartLoadDialog({ onClose }: { onClose: () => void }) {
  const { data: sterilisers = [] } = useTheatreSterilisers();
  const { data: trays = [] } = useTheatreTrays({});
  const start = useStartTheatreCycle();
  const [steriliserUuid, setSteriliserUuid] = useState("");
  const [cycleNumber, setCycleNumber] = useState("");
  const [loadNumber, setLoadNumber] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const steriliser = sterilisers.find((row) => row.uuid === steriliserUuid) ?? null;
  const candidates = loadableTrays(trays, steriliser?.method ?? null);
  const toggle = (uuid: string) =>
    setPicked((current) => {
      const next = new Set(current);
      if (next.has(uuid)) next.delete(uuid);
      else next.add(uuid);
      return next;
    });
  return (
    <Dialog open onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Start a sterilisation load</DialogTitle>
          <DialogDescription>
            Trays in the load are released only when the chemical indicator passes.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <Label>Steriliser</Label>
            <Select
              value={steriliserUuid}
              onValueChange={(value) => {
                setSteriliserUuid(value);
                setPicked(new Set());
              }}
            >
              <SelectTrigger aria-label="Steriliser">
                <SelectValue placeholder="Choose" />
              </SelectTrigger>
              <SelectContent>
                {sterilisers.map((row) => (
                  <SelectItem key={row.uuid} value={row.uuid}>
                    {row.name} · {row.method_label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="cycle-number">Cycle number</Label>
            <Input id="cycle-number" value={cycleNumber} onChange={(event) => setCycleNumber(event.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="load-number">Load number</Label>
            <Input id="load-number" value={loadNumber} onChange={(event) => setLoadNumber(event.target.value)} />
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium">Trays ({picked.size} selected)</p>
          {!steriliser ? (
            <p className="text-xs text-muted-foreground">Choose a steriliser to see trays that can go in.</p>
          ) : candidates.length === 0 ? (
            <p className="text-xs text-muted-foreground">No trays awaiting reprocessing for this method.</p>
          ) : (
            <ul className="max-h-64 space-y-1 overflow-y-auto text-sm">
              {candidates.map((tray) => (
                <li key={tray.uuid}>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={picked.has(tray.uuid)} onChange={() => toggle(tray.uuid)} />
                    <span className="font-mono">{tray.barcode}</span> {tray.tray_set_name}
                    <span className="text-xs text-muted-foreground">({TRAY_STATUS_LABELS[tray.status]})</span>
                    {tray.open_issue_count > 0 ? (
                      <span className="text-xs text-red-600">{tray.open_issue_count} instrument issue(s)</span>
                    ) : null}
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>
        {start.error ? <p className="text-sm text-red-600">{errorMessage(start.error, "Could not start the load.")}</p> : null}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!steriliser || !cycleNumber.trim() || picked.size === 0 || start.isPending}
            onClick={() =>
              start.mutate(
                {
                  steriliser_uuid: steriliserUuid,
                  cycle_number: cycleNumber.trim(),
                  load_number: loadNumber.trim(),
                  tray_uuids: [...picked],
                },
                { onSuccess: onClose },
              )
            }
          >
            Start load
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function IndicatorSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: TheatreIndicatorResult;
  onChange: (value: TheatreIndicatorResult) => void;
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Select value={value} onValueChange={(next) => onChange(next as TheatreIndicatorResult)}>
        <SelectTrigger aria-label={label} className="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {INDICATOR_CHOICES.map((key) => (
            <SelectItem key={key} value={key}>
              {INDICATOR_LABELS[key]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function CycleDetailDialog({
  uuid,
  canRecord,
  onClose,
}: {
  uuid: string;
  canRecord: boolean;
  onClose: () => void;
}) {
  const { data: cycle, isLoading } = useTheatreCycle(uuid);
  const result = useRecordTheatreCycleResult();
  const recall = useRecallTheatreCycle();
  const [ci, setCi] = useState<TheatreIndicatorResult | null>(null);
  const [bi, setBi] = useState<TheatreIndicatorResult | null>(null);
  const [recalling, setRecalling] = useState(false);
  const canResult = canRecord && cycle && cycle.status !== "recalled" && cycle.status !== "failed";
  return (
    <Dialog open onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {cycle ? `${cycle.steriliser_name} · cycle ${cycle.cycle_number}` : "Sterilisation cycle"}
          </DialogTitle>
          <DialogDescription>
            {cycle
              ? `${cycle.method_label}${cycle.load_number ? ` · load ${cycle.load_number}` : ""} · started ${formatDateTime(cycle.started_at)}${cycle.operator_name ? ` by ${cycle.operator_name}` : ""}`
              : "Loading…"}
          </DialogDescription>
        </DialogHeader>
        {isLoading || !cycle ? null : (
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <StatusDotBadge tone={CYCLE_STATUS_TONE[cycle.status]}>{CYCLE_STATUS_LABELS[cycle.status]}</StatusDotBadge>
              <span>
                CI <StatusDotBadge tone={INDICATOR_TONE[cycle.chemical_indicator]}>{INDICATOR_LABELS[cycle.chemical_indicator]}</StatusDotBadge>
              </span>
              <span>
                BI <StatusDotBadge tone={INDICATOR_TONE[cycle.biological_indicator]}>{INDICATOR_LABELS[cycle.biological_indicator]}</StatusDotBadge>
              </span>
              {cycle.sterilised_at ? <span>Sterilised {formatDateTime(cycle.sterilised_at)}</span> : null}
              {cycle.expires_on ? <span>Expires {cycle.expires_on}</span> : null}
            </div>
            {cycle.recall_reason ? (
              <p className="text-red-700">
                Recalled {formatDateTime(cycle.recalled_at)}: {cycle.recall_reason}
              </p>
            ) : null}
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Trays in the load</p>
              <ul className="space-y-0.5">
                {cycle.trays.map((tray) => (
                  <li key={tray.uuid}>
                    <span className="font-mono">{tray.barcode}</span> {tray.tray_set_name} · {tray.status_label}
                    {tray.expires_on ? ` · sterile until ${tray.expires_on}` : ""}
                  </li>
                ))}
              </ul>
            </div>
            {cycle.affected_cases?.length ? (
              <div className="rounded-md border border-red-200 bg-red-50/50 p-3" data-testid="theatre-cycle-affected-cases">
                <p className="font-medium text-red-700">
                  Cases that used trays from this load ({cycle.affected_cases.length})
                </p>
                <table className="mt-2 w-full text-xs">
                  <thead className="text-left text-muted-foreground">
                    <tr>
                      <th className="pr-2">Patient</th>
                      <th className="pr-2">Case</th>
                      <th className="pr-2">Surgeon</th>
                      <th className="pr-2">Tray</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cycle.affected_cases.map((row) => (
                      <tr key={`${row.case_uuid}-${row.tray_barcode}`} className="border-t">
                        <td className="pr-2">
                          {row.patient_name}
                          {row.patient_identifier ? ` (${row.patient_identifier})` : ""}
                        </td>
                        <td className="pr-2">
                          {formatDateTime(row.scheduled_start)} · {row.case_status_label}
                          {row.room_name ? ` · ${row.room_name}` : ""}
                        </td>
                        <td className="pr-2">{row.surgeon_name || "—"}</td>
                        <td className="pr-2 font-mono">{row.tray_barcode}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : cycle.status === "recalled" || cycle.status === "failed" ? (
              <p className="text-muted-foreground">No case used a tray from this load.</p>
            ) : null}
            {canResult ? (
              <div className="flex flex-wrap items-end gap-2 rounded-md border p-3">
                <IndicatorSelect label="Chemical indicator" value={ci ?? cycle.chemical_indicator} onChange={setCi} />
                <IndicatorSelect label="Biological indicator" value={bi ?? cycle.biological_indicator} onChange={setBi} />
                <Button
                  disabled={result.isPending || (ci === null && bi === null)}
                  onClick={() =>
                    result.mutate(
                      {
                        uuid,
                        payload: {
                          ...(ci !== null ? { chemical_indicator: ci } : {}),
                          ...(bi !== null ? { biological_indicator: bi } : {}),
                        },
                      },
                      {
                        onSuccess: () => {
                          setCi(null);
                          setBi(null);
                        },
                      },
                    )
                  }
                >
                  Record result
                </Button>
                <p className="w-full text-xs text-muted-foreground">
                  A failed indicator quarantines the load; a failed biological indicator on a released
                  load recalls it and lists the affected cases.
                </p>
              </div>
            ) : null}
            {result.error ? <p className="text-sm text-red-600">{errorMessage(result.error, "Could not save.")}</p> : null}
          </div>
        )}
        <DialogFooter>
          {canRecord && cycle?.status === "released" ? (
            <Button variant="outline" className="text-red-700" onClick={() => setRecalling(true)}>
              Recall load
            </Button>
          ) : null}
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
        {recalling ? (
          <ReasonDialog
            title="Recall this load"
            description="Idle trays from the load are quarantined and cases that used them are listed."
            action="Recall"
            required
            busy={recall.isPending}
            error={recall.error}
            onClose={() => setRecalling(false)}
            onSubmit={(reason) => recall.mutate({ uuid, reason }, { onSuccess: () => setRecalling(false) })}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

/** Sterilisation cycle log with results and recalls. */
export function TheatreCssdCyclesTab({ canRecord }: { canRecord: boolean }) {
  const [status, setStatus] = useState<TheatreCycleStatus | "">("");
  const [search, setSearch] = useState("");
  const { data: cycles = [], isLoading, error } = useTheatreCycles({
    status,
    q: search.trim() || undefined,
  });
  const [starting, setStarting] = useState(false);
  const [detail, setDetail] = useState<string | null>(null);
  return (
    <div className="space-y-3" data-testid="theatre-cssd-cycles">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Label htmlFor="cssd-cycle-search">Cycle / load</Label>
            <Input id="cssd-cycle-search" className="w-48" value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Status</Label>
            <Select value={status || ANY} onValueChange={(value) => setStatus(value === ANY ? "" : (value as TheatreCycleStatus))}>
              <SelectTrigger aria-label="Cycle status" className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>All</SelectItem>
                {(Object.keys(CYCLE_STATUS_LABELS) as TheatreCycleStatus[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {CYCLE_STATUS_LABELS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {canRecord ? <Button onClick={() => setStarting(true)}>Start load</Button> : null}
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading cycles…</p>
      ) : error ? (
        <p className="text-sm text-red-600">{errorMessage(error, "Could not load cycles.")}</p>
      ) : cycles.length === 0 ? (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">No cycles recorded.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Cycle</th>
                <th className="px-3 py-2">Steriliser</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">CI / BI</th>
                <th className="px-3 py-2">Sterilised</th>
                <th className="px-3 py-2">Expires</th>
                <th className="px-3 py-2">Trays</th>
              </tr>
            </thead>
            <tbody>
              {cycles.map((cycle) => (
                <tr key={cycle.uuid} className="border-t" data-testid="theatre-cssd-cycle-row">
                  <td className="px-3 py-2">
                    <button type="button" className="text-brand-primary underline" onClick={() => setDetail(cycle.uuid)}>
                      {cycle.cycle_number}
                    </button>
                    {cycle.load_number ? <p className="text-xs text-muted-foreground">Load {cycle.load_number}</p> : null}
                  </td>
                  <td className="px-3 py-2">{cycle.steriliser_name}</td>
                  <td className="px-3 py-2">
                    <StatusDotBadge tone={CYCLE_STATUS_TONE[cycle.status]}>{CYCLE_STATUS_LABELS[cycle.status]}</StatusDotBadge>
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {INDICATOR_LABELS[cycle.chemical_indicator]} / {INDICATOR_LABELS[cycle.biological_indicator]}
                  </td>
                  <td className="px-3 py-2">{cycle.sterilised_at ? formatDateTime(cycle.sterilised_at) : "—"}</td>
                  <td className="px-3 py-2">{cycle.expires_on ?? "—"}</td>
                  <td className="px-3 py-2">{cycle.trays.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {starting ? <StartLoadDialog onClose={() => setStarting(false)} /> : null}
      {detail ? <CycleDetailDialog uuid={detail} canRecord={canRecord} onClose={() => setDetail(null)} /> : null}
    </div>
  );
}
