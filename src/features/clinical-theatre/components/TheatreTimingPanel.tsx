"use client";

import { useState } from "react";
import { Clock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useCaptureTheatreTiming,
  useTheatreTimings,
} from "@/features/clinical-theatre/hooks/use-theatre-planning";
import type { TheatreCase } from "@/features/clinical-theatre/types/clinical-theatre.types";
import type {
  TheatreCaseTimings,
  TheatreMilestone,
  TheatreTimingMilestone,
} from "@/features/clinical-theatre/types/theatre-planning.types";
import {
  canRecordTimings,
  formatClock,
  formatDateTime,
  localInputToIso,
  milestoneOrderProblem,
} from "@/features/clinical-theatre/utils/theatre-planning-display";
import {
  errorMessage,
  formatMinutes,
  isoToLocalInput,
} from "@/features/clinical-theatre/utils/theatre-record-display";

/** One-tap "record the next milestone now" button for the case header. */
export function TheatreTimingQuickCapture({
  theatreCase,
  canRecord,
}: {
  theatreCase: Pick<TheatreCase, "uuid" | "status">;
  canRecord: boolean;
}) {
  const enabled = canRecord && canRecordTimings(theatreCase.status);
  const { data } = useTheatreTimings(enabled ? theatreCase.uuid : undefined);
  const capture = useCaptureTheatreTiming();
  if (!enabled || !data) return null;
  const last = [...data.milestones].reverse().find((row) => row.value);
  return (
    <div
      className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"
      data-testid="theatre-timing-quick"
    >
      <Clock className="size-3.5" aria-hidden />
      {last ? (
        <span>
          {last.label} {formatClock(last.value)}
        </span>
      ) : (
        <span>No theatre times yet</span>
      )}
      {data.next_milestone ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7"
          disabled={capture.isPending}
          onClick={() =>
            capture.mutate({
              caseUuid: theatreCase.uuid,
              payload: { milestone: data.next_milestone as TheatreMilestone },
            })
          }
          data-testid="theatre-timing-quick-capture"
        >
          {data.next_milestone_label} now
        </Button>
      ) : (
        <span>All times recorded</span>
      )}
      {capture.error ? (
        <span className="text-red-600">
          {errorMessage(capture.error, "Could not record the time.")}
        </span>
      ) : null}
    </div>
  );
}

type EditState = { milestone: TheatreMilestone; value: string; reason: string; clear: boolean };

/** Full theatre timing record: capture, correct (with reason), clear, audit trail. */
export function TheatreTimingPanel({
  theatreCase,
  canRecord,
}: {
  theatreCase: Pick<TheatreCase, "uuid" | "status">;
  canRecord: boolean;
}) {
  const { data, isLoading, error } = useTheatreTimings(theatreCase.uuid);
  const capture = useCaptureTheatreTiming();
  const [edit, setEdit] = useState<EditState | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const editable = canRecord && canRecordTimings(theatreCase.status);

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading theatre times…</p>;
  if (error || !data) {
    return (
      <p className="text-sm text-red-600">
        {errorMessage(error, "Could not load theatre times.")}
      </p>
    );
  }

  const captureNow = (milestone: TheatreMilestone) => {
    setLocalError(null);
    capture.mutate({ caseUuid: theatreCase.uuid, payload: { milestone } });
  };

  const submitEdit = () => {
    if (!edit) return;
    setLocalError(null);
    const current = data.milestones.find((row) => row.key === edit.milestone);
    if (edit.clear || current?.value) {
      if (!edit.reason.trim()) {
        setLocalError("Give a reason for changing a recorded time.");
        return;
      }
    }
    let at: string | null = null;
    if (!edit.clear) {
      at = localInputToIso(edit.value);
      if (!at) {
        setLocalError("Enter a valid date and time.");
        return;
      }
      const problem = milestoneOrderProblem(data, edit.milestone, new Date(at));
      if (problem) {
        setLocalError(problem);
        return;
      }
    }
    capture.mutate(
      {
        caseUuid: theatreCase.uuid,
        payload: {
          milestone: edit.milestone,
          at: edit.clear ? null : at,
          reason: edit.reason.trim(),
          clear: edit.clear,
        },
      },
      { onSuccess: () => setEdit(null) },
    );
  };

  return (
    <div className="space-y-4" data-testid="theatre-timing-panel">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-brand-navy">Theatre times</h3>
          <p className="text-xs text-muted-foreground">
            Tap a milestone as it happens. Corrections need a reason and are kept in the
            audit trail.
          </p>
        </div>
        {editable && data.next_milestone ? (
          <Button
            type="button"
            size="sm"
            disabled={capture.isPending}
            onClick={() => captureNow(data.next_milestone as TheatreMilestone)}
            data-testid="theatre-timing-next"
          >
            {data.next_milestone_label} now
          </Button>
        ) : null}
      </div>
      {!canRecordTimings(theatreCase.status) ? (
        <p className="text-sm text-muted-foreground">
          Times can be recorded once the patient has arrived for theatre.
        </p>
      ) : null}
      <ol className="divide-y divide-dash-border/70 border-y border-dash-border/70">
        {data.milestones.map((row) => (
          <MilestoneRow
            key={row.key}
            row={row}
            isNext={row.key === data.next_milestone}
            editable={editable}
            busy={capture.isPending}
            editing={edit?.milestone === row.key ? edit : null}
            onCapture={() => captureNow(row.key)}
            onEdit={(clear) =>
              setEdit({
                milestone: row.key,
                value: isoToLocalInput(row.value) || isoToLocalInput(new Date().toISOString()),
                reason: "",
                clear,
              })
            }
            onChange={(next) => setEdit(next)}
            onCancel={() => {
              setEdit(null);
              setLocalError(null);
            }}
            onSubmit={submitEdit}
          />
        ))}
      </ol>
      {localError || capture.error ? (
        <p className="text-sm text-red-600" role="alert">
          {localError ?? errorMessage(capture.error, "Could not record the time.")}
        </p>
      ) : null}
      <TimingIntervals timings={data} />
      <TimingAudit timings={data} />
    </div>
  );
}

function MilestoneRow({
  row,
  isNext,
  editable,
  busy,
  editing,
  onCapture,
  onEdit,
  onChange,
  onCancel,
  onSubmit,
}: {
  row: TheatreTimingMilestone;
  isNext: boolean;
  editable: boolean;
  busy: boolean;
  editing: EditState | null;
  onCapture: () => void;
  onEdit: (clear: boolean) => void;
  onChange: (next: EditState) => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  return (
    <li className="space-y-2 px-3 py-2" data-testid={`theatre-milestone-${row.key}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-5 text-xs text-muted-foreground">{row.sequence}</span>
          <span className={isNext ? "font-semibold text-brand-navy" : "font-medium"}>
            {row.label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm tabular-nums">
            {row.value ? formatDateTime(row.value) : "—"}
          </span>
          {editable && !editing ? (
            <>
              {!row.value ? (
                <Button type="button" size="sm" variant="outline" disabled={busy} onClick={onCapture}>
                  Now
                </Button>
              ) : null}
              <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => onEdit(false)}>
                {row.value ? "Correct" : "Enter time"}
              </Button>
              {row.value ? (
                <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => onEdit(true)}>
                  Clear
                </Button>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
      {editing ? (
        <form
          className="grid gap-2 rounded-md bg-muted/40 p-2 sm:grid-cols-[1fr_2fr_auto] sm:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          {editing.clear ? (
            <p className="text-sm text-muted-foreground">Clear the recorded time.</p>
          ) : (
            <div className="space-y-1">
              <Label htmlFor={`timing-${row.key}-at`}>Time</Label>
              <Input
                id={`timing-${row.key}-at`}
                type="datetime-local"
                value={editing.value}
                onChange={(event) => onChange({ ...editing, value: event.target.value })}
              />
            </div>
          )}
          <div className="space-y-1">
            <Label htmlFor={`timing-${row.key}-reason`}>
              Reason{row.value || editing.clear ? "" : " (optional)"}
            </Label>
            <Input
              id={`timing-${row.key}-reason`}
              value={editing.reason}
              placeholder={editing.clear ? "Why is this time wrong?" : "e.g. tapped late"}
              onChange={(event) => onChange({ ...editing, reason: event.target.value })}
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={busy}>
              {editing.clear ? "Clear time" : "Save"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      ) : null}
    </li>
  );
}

function TimingIntervals({ timings }: { timings: TheatreCaseTimings }) {
  const recorded = timings.intervals.filter((row) => row.minutes !== null);
  if (recorded.length === 0) return null;
  return (
    <dl className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3" data-testid="theatre-timing-intervals">
      {recorded.map((row) => (
        <div key={row.key} className="rounded-lg bg-muted/40 p-2">
          <dt className="text-xs text-muted-foreground">{row.label}</dt>
          <dd className="font-semibold text-brand-navy">{formatMinutes(row.minutes)}</dd>
        </div>
      ))}
    </dl>
  );
}

const ACTION_LABELS = { captured: "Recorded", corrected: "Corrected", cleared: "Cleared" } as const;

function TimingAudit({ timings }: { timings: TheatreCaseTimings }) {
  const events = timings.events ?? [];
  if (events.length === 0) return null;
  return (
    <details className="rounded-lg bg-muted/40 p-2 text-sm" data-testid="theatre-timing-audit">
      <summary className="cursor-pointer font-medium">Audit trail ({events.length})</summary>
      <ul className="mt-2 space-y-1">
        {events.map((event, index) => (
          <li key={`${event.created_at}-${index}`} className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">
              {ACTION_LABELS[event.action]} {event.milestone_label}
            </span>
            {event.action === "corrected"
              ? ` ${formatDateTime(event.previous_value)} → ${formatDateTime(event.new_value)}`
              : event.action === "captured"
                ? ` ${formatDateTime(event.new_value)}`
                : ` (was ${formatDateTime(event.previous_value)})`}
            {event.source === "status" ? " · from status change" : ""}
            {event.actor_name ? ` · ${event.actor_name}` : ""}
            {` · ${formatDateTime(event.created_at)}`}
            {event.reason ? ` — ${event.reason}` : ""}
          </li>
        ))}
      </ul>
    </details>
  );
}
