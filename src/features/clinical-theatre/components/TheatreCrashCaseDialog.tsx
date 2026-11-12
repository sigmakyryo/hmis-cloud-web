"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Siren } from "lucide-react";

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
import { CustomerAppointmentPicker } from "@/features/customers/components/CustomerAppointmentPicker";
import type { Customer } from "@/features/customers/types/customer.types";
import { TheatreRoomSelect } from "@/features/clinical-theatre/components/TheatreRoomSelect";
import {
  useStartTheatreCrashCase,
  useTheatreRooms,
} from "@/features/clinical-theatre/hooks/use-clinical-theatre";
import type {
  TheatreCase,
  TheatreNcepodCategory,
  TheatreRoom,
} from "@/features/clinical-theatre/types/clinical-theatre.types";
import {
  NCEPOD_OPTIONS,
  buildCrashCasePayload,
} from "@/features/clinical-theatre/utils/theatre-advanced-display";
import { theatreClinicOptions } from "@/features/clinical-theatre/utils/theatre-record-display";

type TheatreCrashCaseDialogProps = {
  /** Fixed episode when started from a visit or stay; otherwise the patient is picked. */
  visitUuid?: string;
  stayUuid?: string;
  triggerLabel?: string;
};

export function crashCaseWorkspaceHref(theatreCase: TheatreCase): string | null {
  if (!theatreCase.visit_uuid || !theatreCase.encounter_uuid) return null;
  return `/clinical/theatre/${theatreCase.visit_uuid}/${theatreCase.encounter_uuid}/case`;
}

/** One-tap emergency start: patient, procedure, optional room → straight into theatre. */
export function TheatreCrashCaseDialog({
  visitUuid,
  stayUuid,
  triggerLabel = "Crash case",
}: TheatreCrashCaseDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [procedure, setProcedure] = useState("");
  const [room, setRoom] = useState<TheatreRoom | null>(null);
  const [clinic, setClinic] = useState("");
  const [ncepod, setNcepod] = useState<TheatreNcepodCategory>("immediate");
  const start = useStartTheatreCrashCase();
  const { data: rooms = [] } = useTheatreRooms({}, { enabled: open });
  const clinics = theatreClinicOptions(rooms);
  const fixedEpisode = Boolean(visitUuid || stayUuid);
  const clinicUuid = room?.clinic_uuid || clinic || (clinics.length === 1 ? clinics[0].uuid : "");
  const needsClinic = !fixedEpisode && !clinicUuid;
  const canStart =
    procedure.trim().length > 0 && (fixedEpisode || Boolean(customer)) && !needsClinic;

  const reset = () => {
    setCustomer(null);
    setProcedure("");
    setRoom(null);
    setClinic("");
    setNcepod("immediate");
    start.reset();
  };

  return (
    <>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        onClick={() => setOpen(true)}
        data-testid="theatre-crash-trigger"
      >
        <Siren className="mr-1.5 size-4" aria-hidden />
        {triggerLabel}
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) reset();
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Start emergency crash case</DialogTitle>
            <DialogDescription>
              The patient goes straight into theatre. Pre-op, consent and the WHO checklist
              are flagged as outstanding paperwork to complete afterwards.
            </DialogDescription>
          </DialogHeader>
          <form
            id="theatre-crash-form"
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (!canStart) return;
              start.mutate(
                buildCrashCasePayload({
                  customerUuid: customer?.uuid ?? null,
                  visitUuid,
                  stayUuid,
                  clinicUuid: fixedEpisode ? null : clinicUuid,
                  roomUuid: room?.uuid ?? null,
                  procedure,
                  ncepod,
                }),
                {
                  onSuccess: (theatreCase) => {
                    setOpen(false);
                    reset();
                    const href = crashCaseWorkspaceHref(theatreCase);
                    if (href) router.push(href);
                  },
                },
              );
            }}
          >
            {!fixedEpisode ? (
              <CustomerAppointmentPicker customer={customer} onCustomerChange={setCustomer} />
            ) : null}
            <div className="space-y-1.5">
              <Label htmlFor="theatre-crash-procedure">Procedure</Label>
              <Input
                id="theatre-crash-procedure"
                value={procedure}
                autoFocus={fixedEpisode}
                placeholder="e.g. Emergency laparotomy"
                onChange={(event) => setProcedure(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>NCEPOD category</Label>
              <div className="grid grid-cols-2 gap-1.5">
                {NCEPOD_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className={`flex cursor-pointer flex-col rounded-md border px-2 py-1.5 text-xs ${
                      ncepod === option.value ? "border-red-500 bg-red-50" : ""
                    }`}
                  >
                    <span className="flex items-center gap-1.5 font-medium">
                      <input
                        type="radio"
                        name="theatre-crash-ncepod"
                        checked={ncepod === option.value}
                        onChange={() => setNcepod(option.value)}
                      />
                      {option.label}
                    </span>
                    <span className="text-muted-foreground">{option.hint}</span>
                  </label>
                ))}
              </div>
            </div>
            <TheatreRoomSelect value={room} onChange={setRoom} label="Theatre room (optional)" />
            {!fixedEpisode && !room && clinics.length > 1 ? (
              <div className="space-y-1.5">
                <Label htmlFor="theatre-crash-clinic">Clinic</Label>
                <select
                  id="theatre-crash-clinic"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  value={clinic}
                  onChange={(event) => setClinic(event.target.value)}
                >
                  <option value="">Choose a clinic</option>
                  {clinics.map((item) => (
                    <option key={item.uuid} value={item.uuid}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            {start.error ? (
              <p className="text-sm text-red-600">
                {start.error instanceof Error
                  ? start.error.message
                  : "Could not start the crash case."}
              </p>
            ) : null}
          </form>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="theatre-crash-form"
              variant="destructive"
              disabled={!canStart || start.isPending}
            >
              {start.isPending ? "Starting…" : "Start — into theatre now"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
