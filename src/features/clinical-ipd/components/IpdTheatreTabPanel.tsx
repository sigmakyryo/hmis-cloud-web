"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { DateTimeLocalInput } from "@/components/ui/datetime-local-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchIpdStays } from "@/features/clinical-ipd/services/clinical-ipd.service";
import { TheatreCaseSummary } from "@/features/clinical-theatre/components/TheatreCaseSummary";
import { TheatreRoomSelect } from "@/features/clinical-theatre/components/TheatreRoomSelect";
import {
  useCreateTheatreCase,
  useTheatreCases,
} from "@/features/clinical-theatre/hooks/use-clinical-theatre";
import type {
  TheatreCaseUrgency,
  TheatreRoom,
} from "@/features/clinical-theatre/types/clinical-theatre.types";
import { localInputToIso } from "@/features/clinical-theatre/utils/theatre-case-display";
import type { ClinicalWorkspacePanelProps } from "@/features/clinical-workspace/types/clinical-workspace.types";

const URGENCY_OPTIONS: Array<{ value: TheatreCaseUrgency; label: string }> = [
  { value: "elective", label: "Elective" },
  { value: "urgent", label: "Urgent" },
  { value: "emergency", label: "Emergency" },
];

/** IPD Theatre tab: book the open stay into the theatre module and list its cases. */
export function IpdTheatreTabPanel({ visitUuid }: ClinicalWorkspacePanelProps) {
  const [room, setRoom] = useState<TheatreRoom | null>(null);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [urgency, setUrgency] = useState<TheatreCaseUrgency>("elective");
  const [description, setDescription] = useState("");

  const stayQuery = useQuery({
    queryKey: ["ipd-stay-for-visit", visitUuid],
    queryFn: async () => {
      const stays = await fetchIpdStays({ status: "active", visit: visitUuid });
      return stays.find((stay) => stay.visit_uuid === visitUuid) ?? null;
    },
  });
  const stay = stayQuery.data ?? null;

  const casesQuery = useTheatreCases(
    { stay: stay?.uuid },
    { enabled: Boolean(stay?.uuid) },
  );
  const createCase = useCreateTheatreCase();
  const isEmergency = urgency === "emergency";

  if (stayQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading stay…</p>;
  }
  if (!stay) {
    return (
      <p className="text-sm text-muted-foreground">
        No active stay for theatre booking.
      </p>
    );
  }

  return (
    <div className="space-y-6" data-testid="ipd-theatre-tab">
      <form
        className="grid gap-3 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          createCase.mutate(
            {
              source: "ipd_stay",
              stay: stay.uuid,
              room: room?.uuid ?? null,
              urgency,
              scheduled_start: localInputToIso(start),
              scheduled_end: localInputToIso(end),
              procedure_description: description,
            },
            {
              onSuccess: () => {
                setDescription("");
                setStart("");
                setEnd("");
              },
            },
          );
        }}
      >
        <TheatreRoomSelect
          clinicUuid={stay.clinic_uuid}
          value={room}
          onChange={setRoom}
        />
        <div className="space-y-1.5">
          <Label htmlFor="ipd-theatre-urgency">Urgency</Label>
          <select
            id="ipd-theatre-urgency"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={urgency}
            onChange={(event) =>
              setUrgency(event.target.value as TheatreCaseUrgency)
            }
          >
            {URGENCY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ipd-theatre-start">Start</Label>
          <DateTimeLocalInput
            id="ipd-theatre-start"
            value={start}
            onChange={(event) => setStart(event.target.value)}
            required={!isEmergency}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ipd-theatre-end">End (optional)</Label>
          <DateTimeLocalInput
            id="ipd-theatre-end"
            value={end}
            onChange={(event) => setEnd(event.target.value)}
          />
        </div>
        <Input
          className="sm:col-span-2"
          aria-label="Procedure description"
          placeholder="Procedure description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
        <div className="flex items-center gap-3 sm:col-span-2">
          <Button
            type="submit"
            disabled={createCase.isPending || (!isEmergency && !room)}
          >
            Book theatre
          </Button>
          {createCase.error ? (
            <p className="text-sm text-red-600">
              {createCase.error instanceof Error
                ? createCase.error.message
                : "Could not book theatre."}
            </p>
          ) : null}
        </div>
      </form>
      <ul className="space-y-3">
        {(casesQuery.data ?? []).map((theatreCase) => (
          <li
            key={theatreCase.uuid}
            className="border-b border-border/60 pb-3"
          >
            <TheatreCaseSummary theatreCase={theatreCase} showWorkspaceLink />
          </li>
        ))}
      </ul>
    </div>
  );
}
