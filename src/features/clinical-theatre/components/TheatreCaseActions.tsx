"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { DateTimeLocalInput } from "@/components/ui/datetime-local-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
};

/** Status, reschedule and room actions for one theatre case. */
export function TheatreCaseActions({ theatreCase }: TheatreCaseActionsProps) {
  const transition = useTransitionTheatreCase();
  const reschedule = useRescheduleTheatreCase();
  const assignRoom = useAssignTheatreCaseRoom();
  const [pendingStatus, setPendingStatus] = useState<TheatreCaseStatus | null>(
    null,
  );
  const [reason, setReason] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [room, setRoom] = useState<TheatreRoom | null>(null);

  const canChangeSlot = RESCHEDULABLE.has(theatreCase.status);
  const error =
    errorMessage(transition.error) ??
    errorMessage(reschedule.error) ??
    errorMessage(assignRoom.error);

  function move(status: TheatreCaseStatus) {
    if (REASON_REQUIRED_STATUSES.has(status)) {
      setPendingStatus(status);
      return;
    }
    transition.mutate({ uuid: theatreCase.uuid, status });
  }

  return (
    <div className="space-y-4" data-testid="theatre-case-actions">
      {theatreCase.allowed_transitions.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {theatreCase.allowed_transitions.map((status) => (
            <Button
              key={status}
              type="button"
              size="sm"
              variant={REASON_REQUIRED_STATUSES.has(status) ? "outline" : "default"}
              disabled={transition.isPending}
              onClick={() => move(status)}
            >
              {THEATRE_TRANSITION_ACTION_LABELS[status]}
            </Button>
          ))}
        </div>
      ) : null}

      {pendingStatus ? (
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            transition.mutate(
              { uuid: theatreCase.uuid, status: pendingStatus, reason },
              {
                onSuccess: () => {
                  setPendingStatus(null);
                  setReason("");
                },
              },
            );
          }}
        >
          <div className="min-w-[240px] flex-1 space-y-1.5">
            <Label htmlFor={`reason-${theatreCase.uuid}`}>
              Reason ({THEATRE_TRANSITION_ACTION_LABELS[pendingStatus]})
            </Label>
            <Input
              id={`reason-${theatreCase.uuid}`}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              required
            />
          </div>
          <Button type="submit" size="sm" disabled={transition.isPending}>
            Confirm
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setPendingStatus(null)}
          >
            Back
          </Button>
        </form>
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
