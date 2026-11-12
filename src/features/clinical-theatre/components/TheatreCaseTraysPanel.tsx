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
import { StatusDotBadge } from "@/components/ui/status-dot-badge";
import {
  useAssignTheatreTray,
  useReleaseTheatreCaseTray,
  useReturnTheatreCaseTray,
  useTheatreAvailableTrays,
  useTheatreCaseTrays,
} from "@/features/clinical-theatre/hooks/use-theatre-cssd";
import type { TheatreCase } from "@/features/clinical-theatre/types/clinical-theatre.types";
import type {
  TheatreCaseTray,
  TheatreTrayIssuePayload,
} from "@/features/clinical-theatre/types/theatre-cssd.types";
import {
  TRAY_STATUS_TONE,
  cycleLabel,
} from "@/features/clinical-theatre/utils/theatre-cssd-display";
import { errorMessage } from "@/features/clinical-theatre/utils/theatre-record-display";

const ASSIGNABLE = new Set(["booked", "waiting", "pre_op", "in_theatre", "sign_out"]);
const UNOPENED = new Set(["booked", "waiting", "pre_op"]);

type IssueDraft = { missing: string; damaged: string };

/** Build the return payload from per-instrument missing / damaged numbers. */
export function trayIssuesFromDraft(
  row: TheatreCaseTray,
  drafts: Record<string, IssueDraft>,
): TheatreTrayIssuePayload[] {
  const issues: TheatreTrayIssuePayload[] = [];
  for (const item of row.set_items) {
    const draft = drafts[item.uuid];
    if (!draft) continue;
    for (const kind of ["missing", "damaged"] as const) {
      const quantity = Number(draft[kind] || 0);
      if (quantity > 0) issues.push({ set_item_uuid: item.uuid, kind, quantity });
    }
  }
  return issues;
}

function ReturnTrayDialog({
  caseUuid,
  row,
  onClose,
}: {
  caseUuid: string;
  row: TheatreCaseTray;
  onClose: () => void;
}) {
  const returnTray = useReturnTheatreCaseTray();
  const [drafts, setDrafts] = useState<Record<string, IssueDraft>>({});
  const [notes, setNotes] = useState("");
  const issues = trayIssuesFromDraft(row, drafts);
  const tooMany = row.set_items.find((item) => {
    const draft = drafts[item.uuid];
    return draft && Number(draft.missing || 0) + Number(draft.damaged || 0) > item.quantity;
  });
  const set = (uuid: string, kind: keyof IssueDraft, value: string) =>
    setDrafts((current) => ({
      ...current,
      [uuid]: { ...(current[uuid] ?? { missing: "", damaged: "" }), [kind]: value },
    }));
  return (
    <Dialog open onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Return tray {row.tray.barcode} to CSSD</DialogTitle>
          <DialogDescription>
            The tray goes for reprocessing. Record any instrument that is missing or
            damaged.
          </DialogDescription>
        </DialogHeader>
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground">
            <tr>
              <th className="py-1">Instrument</th>
              <th className="py-1">In set</th>
              <th className="py-1">Missing</th>
              <th className="py-1">Damaged</th>
            </tr>
          </thead>
          <tbody>
            {row.set_items.map((item) => (
              <tr key={item.uuid} className="border-t">
                <td className="py-1 pr-2">{item.name}</td>
                <td className="py-1 pr-2">{item.quantity}</td>
                <td className="py-1 pr-2">
                  <Input
                    aria-label={`Missing ${item.name}`}
                    type="number"
                    min={0}
                    max={item.quantity}
                    className="h-8 w-20"
                    value={drafts[item.uuid]?.missing ?? ""}
                    onChange={(event) => set(item.uuid, "missing", event.target.value)}
                  />
                </td>
                <td className="py-1">
                  <Input
                    aria-label={`Damaged ${item.name}`}
                    type="number"
                    min={0}
                    max={item.quantity}
                    className="h-8 w-20"
                    value={drafts[item.uuid]?.damaged ?? ""}
                    onChange={(event) => set(item.uuid, "damaged", event.target.value)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="space-y-1">
          <Label htmlFor="tray-return-notes">Notes</Label>
          <Input
            id="tray-return-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </div>
        {tooMany ? (
          <p className="text-sm text-red-600">
            More {tooMany.name} reported than the set holds.
          </p>
        ) : null}
        {returnTray.error ? (
          <p className="text-sm text-red-600">
            {errorMessage(returnTray.error, "Could not return the tray.")}
          </p>
        ) : null}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={returnTray.isPending || Boolean(tooMany)}
            onClick={() =>
              returnTray.mutate(
                { caseUuid, itemUuid: row.uuid, issues, notes },
                { onSuccess: onClose },
              )
            }
          >
            {issues.length ? `Return with ${issues.length} issue(s)` : "Return - all present"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Sterile trays on the case: assign (scan), release unused, return to CSSD. */
export function TheatreCaseTraysPanel({
  theatreCase,
  canAssign,
}: {
  theatreCase: TheatreCase;
  canAssign: boolean;
}) {
  const { data: rows = [], isLoading } = useTheatreCaseTrays(theatreCase.uuid);
  const assign = useAssignTheatreTray();
  const release = useReleaseTheatreCaseTray();
  const [barcode, setBarcode] = useState("");
  const [picking, setPicking] = useState(false);
  const [search, setSearch] = useState("");
  const [returning, setReturning] = useState<TheatreCaseTray | null>(null);
  const deferred = useDeferredValue(search.trim());
  const assignable = canAssign && ASSIGNABLE.has(theatreCase.status);
  const available = useTheatreAvailableTrays(theatreCase.uuid, deferred, assignable && picking);
  const open = rows.filter((row) => row.status === "assigned");
  const history = rows.filter((row) => row.status !== "assigned");
  const error = assign.error ?? release.error;

  const scan = () => {
    const code = barcode.trim();
    if (!code) return;
    assign.mutate(
      { caseUuid: theatreCase.uuid, barcode: code },
      { onSuccess: () => setBarcode("") },
    );
  };

  return (
    <section className="space-y-4" data-testid="theatre-case-trays-panel">
      <div>
        <h3 className="text-base font-semibold text-brand-navy">Instrument trays</h3>
        <p className="text-xs text-muted-foreground">
          Only released, in-date trays from a load that passed its indicators can be
          assigned. Instruments are added to the count sheet.
        </p>
      </div>
      {assignable ? (
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Label htmlFor="theatre-tray-barcode">Scan tray barcode</Label>
            <Input
              id="theatre-tray-barcode"
              className="w-56"
              value={barcode}
              placeholder="TRAY-001"
              onChange={(event) => setBarcode(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  scan();
                }
              }}
            />
          </div>
          <Button disabled={!barcode.trim() || assign.isPending} onClick={scan}>
            Assign
          </Button>
          <Button variant="outline" onClick={() => setPicking((value) => !value)}>
            {picking ? "Hide trays" : "Choose from list"}
          </Button>
        </div>
      ) : null}
      {assignable && picking ? (
        <div className="space-y-2 rounded-lg bg-muted/40 p-3">
          <Input
            aria-label="Search trays"
            placeholder="Search by barcode or set"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <ul className="max-h-56 space-y-1 overflow-y-auto text-sm">
            {available.isLoading ? (
              <li className="text-muted-foreground">Loading…</li>
            ) : (available.data ?? []).length === 0 ? (
              <li className="text-muted-foreground">No trays found.</li>
            ) : (
              (available.data ?? []).map((tray) => (
                <li
                  key={tray.uuid}
                  className="flex items-center justify-between gap-2 rounded px-2 py-1 hover:bg-muted"
                >
                  <span>
                    <span className="font-medium">{tray.barcode}</span> · {tray.tray_set_name}
                    {tray.problem ? (
                      <span className="block text-xs text-red-600">{tray.problem}</span>
                    ) : (
                      <span className="block text-xs text-muted-foreground">
                        Sterile until {tray.sterile_until} · {cycleLabel(tray.last_cycle)}
                      </span>
                    )}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={Boolean(tray.problem) || assign.isPending}
                    onClick={() =>
                      assign.mutate({ caseUuid: theatreCase.uuid, trayUuid: tray.uuid })
                    }
                  >
                    Assign
                  </Button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No trays assigned.</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground">
            <tr>
              <th className="py-1 pr-3">Tray</th>
              <th className="py-1 pr-3">Sterilised in</th>
              <th className="py-1 pr-3">Status</th>
              <th className="py-1" />
            </tr>
          </thead>
          <tbody>
            {[...open, ...history].map((row) => (
              <tr key={row.uuid} className="border-t" data-testid="theatre-case-tray-row">
                <td className="py-1 pr-3">
                  <span className="font-medium">{row.tray.barcode}</span> ·{" "}
                  {row.tray.tray_set_name}
                  {row.issues.length ? (
                    <span className="block text-xs text-amber-700">
                      {row.issues
                        .map((issue) => `${issue.quantity} ${issue.kind_label.toLowerCase()}: ${issue.name}`)
                        .join("; ")}
                    </span>
                  ) : null}
                </td>
                <td className="py-1 pr-3 text-xs">
                  {cycleLabel(row.cycle)}
                  {row.cycle?.failed ? (
                    <span className="block font-medium text-red-600">
                      Load failed / recalled - inform the surgeon
                    </span>
                  ) : null}
                </td>
                <td className="py-1 pr-3">
                  <StatusDotBadge tone={row.status === "assigned" ? TRAY_STATUS_TONE.in_use : "neutral"}>
                    {row.status_label}
                  </StatusDotBadge>
                </td>
                <td className="py-1 text-right">
                  {canAssign && row.status === "assigned" ? (
                    <div className="flex justify-end gap-1">
                      {UNOPENED.has(theatreCase.status) ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={release.isPending}
                          onClick={() =>
                            release.mutate({ caseUuid: theatreCase.uuid, itemUuid: row.uuid })
                          }
                        >
                          Release unused
                        </Button>
                      ) : null}
                      <Button size="sm" variant="outline" onClick={() => setReturning(row)}>
                        Return to CSSD
                      </Button>
                    </div>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {error ? (
        <p className="text-sm text-red-600">{errorMessage(error, "Could not update trays.")}</p>
      ) : null}
      {returning ? (
        <ReturnTrayDialog
          caseUuid={theatreCase.uuid}
          row={returning}
          onClose={() => setReturning(null)}
        />
      ) : null}
    </section>
  );
}
