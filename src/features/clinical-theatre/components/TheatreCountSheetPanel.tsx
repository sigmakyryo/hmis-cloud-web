"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
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
  useAddTheatreCountItem,
  useAddToTheatreCountItem,
  useConfirmTheatreCount,
  useRecordTheatreCounts,
  useRemoveTheatreCountItem,
  useResolveTheatreCount,
  useStartTheatreCount,
  useTheatreCountWitnesses,
  useTheatreCounts,
  useUpdateTheatreCountItem,
} from "@/features/clinical-theatre/hooks/use-theatre-cssd";
import type { TheatreCase } from "@/features/clinical-theatre/types/clinical-theatre.types";
import type {
  TheatreCountCategory,
  TheatreCountItem,
  TheatreCountPhase,
  TheatreCountSheet,
  TheatreCountXRay,
} from "@/features/clinical-theatre/types/theatre-cssd.types";
import {
  COUNT_CATEGORIES,
  COUNT_PHASES,
  XRAY_OPTIONS,
  confirmBlocker,
  confirmedPhases,
  countMismatches,
  phaseValue,
} from "@/features/clinical-theatre/utils/theatre-cssd-display";
import { formatDateTime } from "@/features/clinical-theatre/utils/theatre-planning-display";
import { errorMessage } from "@/features/clinical-theatre/utils/theatre-record-display";
import { cn } from "@/lib/utils";

const COUNT_STATUSES = new Set(["pre_op", "in_theatre", "sign_out"]);
const RESOLVE_STATUSES = new Set(["pre_op", "in_theatre", "sign_out", "recovery"]);

const SHEET_TONE = {
  open: "warning",
  reconciled: "success",
  discrepancy: "danger",
  resolved: "info",
} as const;

/** Numbers to send for a phase: drafts override what is already saved. */
export function phaseCounts(
  items: TheatreCountItem[],
  phase: TheatreCountPhase,
  drafts: Record<string, string>,
): Record<string, number | null> {
  const counts: Record<string, number | null> = {};
  for (const item of items) {
    const draft = drafts[item.uuid];
    if (draft !== undefined) {
      counts[item.uuid] = draft.trim() === "" ? null : Number(draft);
    } else {
      counts[item.uuid] = phaseValue(item, phase);
    }
  }
  return counts;
}

function ResolutionForm({ caseUuid }: { caseUuid: string }) {
  const resolve = useResolveTheatreCount();
  const [searched, setSearched] = useState(false);
  const [searchNotes, setSearchNotes] = useState("");
  const [xray, setXray] = useState<TheatreCountXRay | "">("");
  const [outcome, setOutcome] = useState("");
  const ready = searched && xray !== "" && outcome.trim() !== "";
  return (
    <div className="space-y-3 rounded-md border border-red-200 bg-red-50/40 p-3">
      <p className="text-sm font-medium text-red-700">Surgeon sign-off for the discrepancy</p>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={searched}
          onChange={(event) => setSearched(event.target.checked)}
        />
        Search of the field, wound, floor and bins performed
      </label>
      <Input
        aria-label="Search notes"
        placeholder="Where was searched (optional)"
        value={searchNotes}
        onChange={(event) => setSearchNotes(event.target.value)}
      />
      <div className="space-y-1">
        <Label>X-ray</Label>
        <Select value={xray} onValueChange={(value) => setXray(value as TheatreCountXRay)}>
          <SelectTrigger aria-label="X-ray" className="w-64">
            <SelectValue placeholder="Choose" />
          </SelectTrigger>
          <SelectContent>
            {XRAY_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="count-outcome">Outcome</Label>
        <Textarea
          id="count-outcome"
          placeholder="Item found / not found, action taken, incident report"
          value={outcome}
          onChange={(event) => setOutcome(event.target.value)}
        />
      </div>
      {resolve.error ? (
        <p className="text-sm text-red-600">
          {errorMessage(resolve.error, "Could not sign the resolution.")}
        </p>
      ) : null}
      <Button
        disabled={!ready || resolve.isPending}
        onClick={() =>
          resolve.mutate({
            caseUuid,
            payload: {
              search_performed: searched,
              search_notes: searchNotes,
              xray: xray as TheatreCountXRay,
              outcome,
            },
          })
        }
      >
        Sign as surgeon
      </Button>
    </div>
  );
}

function SheetSummary({ sheet }: { sheet: TheatreCountSheet }) {
  if (sheet.status !== "resolved") return null;
  return (
    <div className="rounded-lg bg-muted/40 p-3 text-sm">
      <p className="font-medium">Discrepancy resolved</p>
      <p>
        Search: {sheet.search_performed ? "performed" : "not recorded"}
        {sheet.search_notes ? ` (${sheet.search_notes})` : ""} · X-ray: {sheet.xray_label}
      </p>
      <p>Outcome: {sheet.outcome}</p>
      <p className="text-xs text-muted-foreground">
        Signed by {sheet.resolution_signed_by_name} ·{" "}
        {formatDateTime(sheet.resolution_signed_at)}
      </p>
    </div>
  );
}

/** Surgical count sheet: two-person counts that gate WHO sign-out. */
export function TheatreCountSheetPanel({
  theatreCase,
  canRecord,
  canSign,
}: {
  theatreCase: TheatreCase;
  canRecord: boolean;
  canSign: boolean;
}) {
  const caseUuid = theatreCase.uuid;
  const { data, isLoading } = useTheatreCounts(caseUuid);
  const start = useStartTheatreCount();
  const addItem = useAddTheatreCountItem();
  const updateItem = useUpdateTheatreCountItem();
  const removeItem = useRemoveTheatreCountItem();
  const addTo = useAddToTheatreCountItem();
  const record = useRecordTheatreCounts();
  const confirm = useConfirmTheatreCount();
  const [phase, setPhase] = useState<TheatreCountPhase>("initial");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [newLine, setNewLine] = useState<{ category: TheatreCountCategory; name: string; quantity: string }>({
    category: "swab",
    name: "",
    quantity: "",
  });
  const [witness, setWitness] = useState("");
  const [witnessSearch, setWitnessSearch] = useState("");
  const [notes, setNotes] = useState("");
  const sheet = data?.sheet ?? null;
  const witnesses = useTheatreCountWitnesses(caseUuid, witnessSearch.trim(), Boolean(sheet) && canRecord);
  const editable =
    canRecord && COUNT_STATUSES.has(theatreCase.status) && sheet?.status !== "reconciled" && sheet?.status !== "resolved";
  const done = confirmedPhases(sheet);
  const initialDone = done.has("initial");
  const error =
    start.error ?? addItem.error ?? updateItem.error ?? removeItem.error ?? addTo.error ?? record.error ?? confirm.error;

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  if (!sheet) {
    return (
      <section className="space-y-3" data-testid="theatre-count-sheet-panel">
        <h3 className="text-base font-semibold text-brand-navy">Surgical count</h3>
        {data?.blocker ? <p className="text-sm text-amber-700">{data.blocker}</p> : null}
        <p className="text-sm text-muted-foreground">
          Count swabs, sharps and instruments. Instruments from assigned trays are added
          automatically.
        </p>
        {canRecord && COUNT_STATUSES.has(theatreCase.status) ? (
          <Button disabled={start.isPending} onClick={() => start.mutate(caseUuid)}>
            Start count sheet
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground">
            The count is recorded from pre-op until sign-out.
          </p>
        )}
        {error ? <p className="text-sm text-red-600">{errorMessage(error, "Could not start.")}</p> : null}
      </section>
    );
  }

  const items = sheet.items;
  const counts = phaseCounts(items, phase, drafts);
  const mismatches = countMismatches(
    items.map((item) => ({
      ...item,
      ...(phase === "initial"
        ? {}
        : { [`${phase}_count`]: counts[item.uuid] }),
    })) as TheatreCountItem[],
    phase,
  );
  const draftSheet: TheatreCountSheet = {
    ...sheet,
    items: items.map((item) =>
      phase === "initial" ? item : { ...item, [`${phase}_count`]: counts[item.uuid] },
    ),
  };
  const blocker = confirmBlocker(draftSheet, phase);
  const discrepancy = sheet.status === "discrepancy";

  const confirmPhase = async () => {
    const witnessId = Number(witness);
    if (!witnessId) return;
    if (phase !== "initial") {
      await record.mutateAsync({ caseUuid, phase, counts });
    }
    await confirm.mutateAsync({ caseUuid, phase, witnessId, notes });
    setDrafts({});
    setNotes("");
  };

  return (
    <section className="space-y-4" data-testid="theatre-count-sheet-panel">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-brand-navy">Surgical count</h3>
          <p className="text-xs text-muted-foreground">
            Expected = initial + added. Each count is confirmed by two different staff.
          </p>
        </div>
        <StatusDotBadge tone={SHEET_TONE[sheet.status]}>{sheet.status_label}</StatusDotBadge>
      </div>
      {data?.blocker ? (
        <p className="rounded-md bg-amber-50 p-2 text-sm text-amber-800" data-testid="theatre-count-blocker">
          {data.blocker}
        </p>
      ) : null}

      <nav aria-label="Count phases" className="inline-flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
        {COUNT_PHASES.map((option) => {
          const confirmation = [...sheet.confirmations].reverse().find((row) => row.phase === option.value);
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={phase === option.value}
              onClick={() => {
                setPhase(option.value);
                setDrafts({});
              }}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium",
                phase === option.value ? "bg-white text-brand-navy shadow-sm" : "text-brand-muted",
              )}
            >
              {option.label}
              {confirmation ? (confirmation.is_correct ? " ✓" : " ✗") : ""}
            </button>
          );
        })}
      </nav>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground">
            <tr>
              <th className="py-1 pr-3">Item</th>
              <th className="py-1 pr-3">Initial</th>
              <th className="py-1 pr-3">Added</th>
              <th className="py-1 pr-3">Expected</th>
              {phase !== "initial" ? (
                <th className="py-1 pr-3">{COUNT_PHASES.find((row) => row.value === phase)?.label}</th>
              ) : null}
              <th className="py-1" />
            </tr>
          </thead>
          <tbody>
            {COUNT_CATEGORIES.map((category) => {
              const rows = items.filter((item) => item.category === category.value);
              if (!rows.length) return null;
              return [
                <tr key={`${category.value}-head`}>
                  <td colSpan={6} className="pt-3 text-xs font-semibold uppercase text-muted-foreground">
                    {category.label}
                  </td>
                </tr>,
                ...rows.map((item) => {
                  const mismatch = mismatches.some((row) => row.uuid === item.uuid);
                  return (
                    <tr key={item.uuid} className="border-t" data-testid="theatre-count-row">
                      <td className="py-1 pr-3">{item.name}</td>
                      <td className="py-1 pr-3">
                        {editable && !initialDone ? (
                          <Input
                            aria-label={`Initial ${item.name}`}
                            type="number"
                            min={0}
                            className="h-8 w-20"
                            defaultValue={item.initial}
                            onBlur={(event) => {
                              const value = Number(event.target.value);
                              if (Number.isFinite(value) && value !== item.initial) {
                                updateItem.mutate({ caseUuid, itemUuid: item.uuid, initial: value });
                              }
                            }}
                          />
                        ) : (
                          item.initial
                        )}
                      </td>
                      <td className="py-1 pr-3">
                        {item.added}
                        {editable ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="ml-1 h-7 px-2"
                            aria-label={`Add to ${item.name}`}
                            disabled={addTo.isPending}
                            onClick={() => {
                              const answer = window.prompt(`How many ${item.name} were added?`, "1");
                              const quantity = Number(answer);
                              if (answer && Number.isInteger(quantity) && quantity > 0) {
                                addTo.mutate({ caseUuid, itemUuid: item.uuid, quantity });
                              }
                            }}
                          >
                            +
                          </Button>
                        ) : null}
                      </td>
                      <td className="py-1 pr-3 font-medium">{item.expected}</td>
                      {phase !== "initial" ? (
                        <td className="py-1 pr-3">
                          <Input
                            aria-label={`${phase} count ${item.name}`}
                            type="number"
                            min={0}
                            disabled={!editable || !initialDone}
                            className={cn("h-8 w-20", mismatch && "border-red-500 text-red-700")}
                            value={drafts[item.uuid] ?? (phaseValue(item, phase) ?? "").toString()}
                            onChange={(event) =>
                              setDrafts((current) => ({ ...current, [item.uuid]: event.target.value }))
                            }
                          />
                        </td>
                      ) : null}
                      <td className="py-1 text-right">
                        {editable && !initialDone ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={removeItem.isPending}
                            onClick={() => removeItem.mutate({ caseUuid, itemUuid: item.uuid })}
                          >
                            Remove
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  );
                }),
              ];
            })}
          </tbody>
        </table>
      </div>

      {editable ? (
        <div className="flex flex-wrap items-end gap-2 rounded-lg bg-muted/40 p-3">
          <div className="space-y-1">
            <Label>Category</Label>
            <Select
              value={newLine.category}
              onValueChange={(value) => setNewLine((line) => ({ ...line, category: value as TheatreCountCategory }))}
            >
              <SelectTrigger aria-label="Count category" className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COUNT_CATEGORIES.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[180px] flex-1 space-y-1">
            <Label htmlFor="count-new-name">Item</Label>
            <Input
              id="count-new-name"
              placeholder="e.g. Raytec swabs 10x10"
              value={newLine.name}
              onChange={(event) => setNewLine((line) => ({ ...line, name: event.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="count-new-qty">{initialDone ? "Added" : "Initial"}</Label>
            <Input
              id="count-new-qty"
              type="number"
              min={0}
              className="w-24"
              value={newLine.quantity}
              onChange={(event) => setNewLine((line) => ({ ...line, quantity: event.target.value }))}
            />
          </div>
          <Button
            disabled={!newLine.name.trim() || addItem.isPending}
            onClick={() =>
              addItem.mutate(
                {
                  caseUuid,
                  category: newLine.category,
                  name: newLine.name.trim(),
                  quantity: Number(newLine.quantity || 0),
                },
                { onSuccess: () => setNewLine((line) => ({ ...line, name: "", quantity: "" })) },
              )
            }
          >
            Add line
          </Button>
        </div>
      ) : null}

      {editable ? (
        <div className="space-y-2 rounded-lg bg-muted/40 p-3">
          <p className="text-sm font-medium">
            Confirm the {COUNT_PHASES.find((row) => row.value === phase)?.label.toLowerCase()}
          </p>
          {mismatches.length ? (
            <p className="text-sm text-red-600">
              {mismatches.length} line(s) do not match the expected number:{" "}
              {mismatches.map((row) => row.name).join(", ")}.
            </p>
          ) : null}
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <Label htmlFor="count-witness-search">Second checker</Label>
              <Input
                id="count-witness-search"
                placeholder="Search staff"
                className="w-48"
                value={witnessSearch}
                onChange={(event) => setWitnessSearch(event.target.value)}
              />
            </div>
            <Select value={witness} onValueChange={setWitness}>
              <SelectTrigger aria-label="Second checker" className="w-56">
                <SelectValue placeholder="Choose staff" />
              </SelectTrigger>
              <SelectContent>
                {(witnesses.data ?? []).map((person) => (
                  <SelectItem key={person.id} value={String(person.id)}>
                    {person.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              aria-label="Count notes"
              placeholder="Notes (optional)"
              className="w-56"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
            <Button
              disabled={Boolean(blocker) || !witness || record.isPending || confirm.isPending}
              onClick={() => void confirmPhase().catch(() => undefined)}
            >
              Confirm count
            </Button>
          </div>
          {blocker ? <p className="text-xs text-muted-foreground">{blocker}</p> : null}
        </div>
      ) : null}

      {discrepancy && canSign && RESOLVE_STATUSES.has(theatreCase.status) ? (
        <ResolutionForm caseUuid={caseUuid} />
      ) : discrepancy ? (
        <p className="text-sm text-red-600">
          The operating surgeon must document the search, x-ray and outcome and sign.
        </p>
      ) : null}
      <SheetSummary sheet={sheet} />

      {sheet.confirmations.length ? (
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Confirmations</p>
          <ul className="space-y-1 text-sm">
            {sheet.confirmations.map((row) => (
              <li key={row.uuid} data-testid="theatre-count-confirmation">
                <span className={row.is_correct ? "text-emerald-700" : "text-red-600"}>
                  {row.phase_label} {row.is_correct ? "correct" : "discrepancy"}
                </span>{" "}
                · {row.counted_by_name} and {row.witnessed_by_name} ·{" "}
                {formatDateTime(row.confirmed_at)}
                {row.discrepancies.length ? (
                  <span className="block text-xs text-red-600">
                    {row.discrepancies
                      .map((item) => `${item.name}: expected ${item.expected}, counted ${item.counted}`)
                      .join("; ")}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {error ? <p className="text-sm text-red-600">{errorMessage(error, "Could not save the count.")}</p> : null}
    </section>
  );
}
