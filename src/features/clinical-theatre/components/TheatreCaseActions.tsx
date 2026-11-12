"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { DateTimeLocalInput } from "@/components/ui/datetime-local-input";
import { Label } from "@/components/ui/label";
import { TheatreCancelReasonForm } from "@/features/clinical-theatre/components/TheatreCancelReasonForm";
import { TheatreRoomSelect } from "@/features/clinical-theatre/components/TheatreRoomSelect";
import {
  useAssignTheatreCaseRoom,
  useRescheduleTheatreCase,
  useTransitionTheatreCase,
} from "@/features/clinical-theatre/hooks/use-clinical-theatre";
import type {
  TheatreCase,
  TheatreCaseStatus,
  TheatreRoom,
} from "@/features/clinical-theatre/types/clinical-theatre.types";
import {
  REASON_REQUIRED_STATUSES,
  THEATRE_TRANSITION_ACTION_LABELS,
  localInputToIso,
} from "@/features/clinical-theatre/utils/theatre-case-display";
import { safetyGateBlocker } from "@/features/clinical-theatre/utils/theatre-safety-display";
import { theatreSecondaryTransitions } from "@/features/clinical-theatre/utils/theatre-workflow";

const RESCHEDULABLE: ReadonlySet<TheatreCaseStatus> = new Set([
  "booked",
  "waiting",
  "pre_op",
  "postponed",
]);

function errorMessage(error: unknown): string | null {
  if (!error) return null;
  return error instanceof Error ? error.message : "Something went wrong.";
}

type TheatreCaseActionsProps = {
  theatreCase: TheatreCase;
  /**
   * `all` shows every allowed move; `secondary` only postpone / cancel (the
   * workspace header owns the primary next step).
   */
  transitions?: "all" | "secondary";
};

/** Status, reschedule and room actions for one theatre case. */
export function TheatreCaseActions({
  theatreCase,
  transitions = "all",
}: TheatreCaseActionsProps) {
  const transition = useTransitionTheatreCase();
  const reschedule = useRescheduleTheatreCase();
  const assignRoom = useAssignTheatreCaseRoom();
  const [pendingStatus, setPendingStatus] = useState<TheatreCaseStatus | null>(
    null,
  );
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [room, setRoom] = useState<TheatreRoom | null>(null);

  const canChangeSlot = RESCHEDULABLE.has(theatreCase.status);
  const error =
    errorMessage(transition.error) ??
    errorMessage(reschedule.error) ??
    errorMessage(assignRoom.error);

  const shownTransitions =
    transitions === "all"
      ? theatreCase.allowed_transitions
      : theatreSecondaryTransitions(theatreCase);
  const gateMessages = (transitions === "all" ? shownTransitions : [])
    .map((status) =>
      safetyGateBlocker(
        theatreCase.status,
        status,
        theatreCase.safety,
        theatreCase.urgency,
      ),
    )
    .filter((message): message is string => Boolean(message));

  function move(status: TheatreCaseStatus) {
    if (REASON_REQUIRED_STATUSES.has(status)) {
      setPendingStatus(status);
      return;
    }
    transition.mutate({ uuid: theatreCase.uuid, status });
  }

  return (
    <div className="space-y-4" data-testid="theatre-case-actions">
      {shownTransitions.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {shownTransitions.map((status) => {
            const blocker = safetyGateBlocker(
              theatreCase.status,
              status,
              theatreCase.safety,
              theatreCase.urgency,
            );
            return (
              <Button
                key={status}
                type="button"
                size="sm"
                variant={REASON_REQUIRED_STATUSES.has(status) ? "outline" : "default"}
                disabled={transition.isPending || Boolean(blocker)}
                title={blocker ?? undefined}
                onClick={() => move(status)}
              >
                {THEATRE_TRANSITION_ACTION_LABELS[status]}
              </Button>
            );
          })}
        </div>
      ) : null}
      {gateMessages.length > 0 ? (
        <ul className="space-y-1 text-xs text-amber-700" data-testid="theatre-gate-messages">
          {gateMessages.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      ) : null}

      {pendingStatus ? (
        <TheatreCancelReasonForm
          caseUuid={theatreCase.uuid}
          actionLabel={THEATRE_TRANSITION_ACTION_LABELS[pendingStatus]}
          pending={transition.isPending}
          onBack={() => setPendingStatus(null)}
          onSubmit={(input) =>
            transition.mutate(
              { uuid: theatreCase.uuid, status: pendingStatus, ...input },
              { onSuccess: () => setPendingStatus(null) },
            )
          }
        />
      ) : null}

      {canChangeSlot ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <form
            className="space-y-2"
            onSubmit={(event) => {
              event.preventDefault();
              const startIso = localInputToIso(start);
              if (!startIso) return;
              reschedule.mutate({
                uuid: theatreCase.uuid,
                scheduled_start: startIso,
                scheduled_end: localInputToIso(end),
              });
            }}
          >
            <Label>Reschedule</Label>
            <DateTimeLocalInput
              aria-label="New start"
              value={start}
              onChange={(event) => setStart(event.target.value)}
              required
            />
            <DateTimeLocalInput
              aria-label="New end"
              value={end}
              onChange={(event) => setEnd(event.target.value)}
            />
            <Button type="submit" size="sm" variant="outline" disabled={reschedule.isPending}>
              Save slot
            </Button>
          </form>
          <form
            className="space-y-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (!room) return;
              assignRoom.mutate({ uuid: theatreCase.uuid, room: room.uuid });
            }}
          >
            <TheatreRoomSelect
              clinicUuid={theatreCase.clinic_uuid}
              value={room}
              onChange={setRoom}
              label="Change room"
            />
            <Button
              type="submit"
              size="sm"
              variant="outline"
              disabled={!room || assignRoom.isPending}
            >
              Assign room
            </Button>
          </form>
        </div>
      ) : null}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
