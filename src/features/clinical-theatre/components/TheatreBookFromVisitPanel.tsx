"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { DateTimeLocalInput } from "@/components/ui/datetime-local-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CareProviderCombobox } from "@/features/appointments/components/CareProviderCombobox";
import type { CareProvider } from "@/features/appointments/types/appointment.types";
import { useMyClinicalCapabilities } from "@/features/clinical-opd/hooks/use-clinical-opd";
import { TheatreCaseSummary } from "@/features/clinical-theatre/components/TheatreCaseSummary";
import { TheatreCrashCaseDialog } from "@/features/clinical-theatre/components/TheatreCrashCaseDialog";
import { TheatreProcedureProductPicker } from "@/features/clinical-theatre/components/TheatreProcedureProductPicker";
import { TheatreRoomSelect } from "@/features/clinical-theatre/components/TheatreRoomSelect";
import {
  useCreateTheatreCase,
  useTheatreCases,
} from "@/features/clinical-theatre/hooks/use-clinical-theatre";
import type {
  CreateTheatreCasePayload,
  TheatreCaseUrgency,
  TheatreRoom,
} from "@/features/clinical-theatre/types/clinical-theatre.types";
import type { TheatreProcedureProduct } from "@/features/clinical-theatre/types/theatre-catalog.types";
import { localInputToIso } from "@/features/clinical-theatre/utils/theatre-case-display";
import type { ClinicalWorkspacePanelProps } from "@/features/clinical-workspace/types/clinical-workspace.types";

const URGENCY_OPTIONS: Array<{ value: TheatreCaseUrgency; label: string }> = [
  { value: "elective", label: "Elective" },
  { value: "urgent", label: "Urgent" },
  { value: "emergency", label: "Emergency" },
];

/** Build the create payload for a theatre case booked from an open visit. */
export function buildVisitTheatreBooking(input: {
  visitUuid: string;
  room: TheatreRoom | null;
  urgency: TheatreCaseUrgency;
  start: string;
  end: string;
  description: string;
  surgeonId: number | null;
  createAppointment: boolean;
  /** Catalogue procedure product; the case procedure and billing come from it. */
  procedureProductUuid?: string | null;
}): CreateTheatreCasePayload {
  const procedures = input.procedureProductUuid
    ? { procedures: [{ product: input.procedureProductUuid }] }
    : {};
  return {
    source: "existing_visit",
    visit: input.visitUuid,
    room: input.room?.uuid ?? null,
    urgency: input.urgency,
    scheduled_start: localInputToIso(input.start),
    scheduled_end: localInputToIso(input.end),
    procedure_description: input.description.trim(),
    lead_surgeon: input.surgeonId,
    create_appointment: input.createAppointment,
    ...procedures,
  };
}

/**
 * OPD "Book theatre" tab: put this visit's patient on the theatre list.
 * Elective slots with a room are added to the scheduling calendar too.
 */
export function TheatreBookFromVisitPanel({ visitUuid }: ClinicalWorkspacePanelProps) {
  const [room, setRoom] = useState<TheatreRoom | null>(null);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [urgency, setUrgency] = useState<TheatreCaseUrgency>("elective");
  const [description, setDescription] = useState("");
  const [procedureProduct, setProcedureProduct] = useState<TheatreProcedureProduct | null>(
    null,
  );
  const [surgeon, setSurgeon] = useState<CareProvider | null>(null);
  const [createAppointment, setCreateAppointment] = useState(true);
  const casesQuery = useTheatreCases({ visit: visitUuid });
  const createCase = useCreateTheatreCase();
  const isEmergency = urgency === "emergency";
  const { data: capabilityData } = useMyClinicalCapabilities();
  const canCrash = (capabilityData?.capabilities ?? []).includes("start_theatre_crash_case");

  return (
    <div className="space-y-6" data-testid="opd-theatre-booking">
      {canCrash ? (
        <div className="flex items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 px-3 py-2">
          <p className="text-sm text-red-900">
            Life- or limb-threatening? Take the patient straight to theatre and do the
            paperwork afterwards.
          </p>
          <TheatreCrashCaseDialog visitUuid={visitUuid} triggerLabel="Crash to theatre" />
        </div>
      ) : null}
      <form
        className="grid gap-3 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          createCase.mutate(
            buildVisitTheatreBooking({
              visitUuid,
              room,
              urgency,
              start,
              end,
              description,
              surgeonId: surgeon?.id ?? null,
              createAppointment,
              procedureProductUuid: procedureProduct?.uuid ?? null,
            }),
            {
              onSuccess: () => {
                setDescription("");
                setProcedureProduct(null);
                setStart("");
                setEnd("");
              },
            },
          );
        }}
      >
        <TheatreRoomSelect value={room} onChange={setRoom} />
        <div className="space-y-1.5">
          <Label htmlFor="opd-theatre-urgency">Urgency</Label>
          <select
            id="opd-theatre-urgency"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={urgency}
            onChange={(event) => setUrgency(event.target.value as TheatreCaseUrgency)}
          >
            {URGENCY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="opd-theatre-start">Start</Label>
          <DateTimeLocalInput
            id="opd-theatre-start"
            value={start}
            onChange={(event) => setStart(event.target.value)}
            required={!isEmergency}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="opd-theatre-end">End (optional)</Label>
          <DateTimeLocalInput
            id="opd-theatre-end"
            value={end}
            onChange={(event) => setEnd(event.target.value)}
          />
        </div>
        <CareProviderCombobox
          id="opd-theatre-surgeon"
          label="Lead surgeon (optional)"
          value={surgeon?.id ?? null}
          displayName={surgeon?.name ?? null}
          onSelect={setSurgeon}
        />
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="opd-theatre-procedure">Procedure (from the catalogue)</Label>
          <TheatreProcedureProductPicker
            id="opd-theatre-procedure"
            value={procedureProduct}
            onChange={setProcedureProduct}
          />
        </div>
        {procedureProduct ? null : (
          <Input
            className="sm:col-span-2"
            aria-label="Procedure description"
            placeholder="Procedure description (free text if not in the catalogue)"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        )}
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input
            type="checkbox"
            checked={createAppointment}
            onChange={(event) => setCreateAppointment(event.target.checked)}
          />
          Add the slot to the appointments calendar
        </label>
        <div className="flex items-center gap-3 sm:col-span-2">
          <Button type="submit" disabled={createCase.isPending || (!isEmergency && !room)}>
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
          <li key={theatreCase.uuid} className="border-b border-border/60 pb-3">
            <TheatreCaseSummary theatreCase={theatreCase} showWorkspaceLink showImplants />
          </li>
        ))}
      </ul>
    </div>
  );
}
