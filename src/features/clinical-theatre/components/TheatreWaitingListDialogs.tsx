"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

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
import { Textarea } from "@/components/ui/textarea";
import { CareProviderCombobox } from "@/features/appointments/components/CareProviderCombobox";
import type { CareProvider } from "@/features/appointments/types/appointment.types";
import { TheatreProcedureProductPicker } from "@/features/clinical-theatre/components/TheatreProcedureProductPicker";
import { TheatreReadinessBadge } from "@/features/clinical-theatre/components/TheatreReadinessBadge";
import { TheatreRoomSelect } from "@/features/clinical-theatre/components/TheatreRoomSelect";
import { useTheatreRooms } from "@/features/clinical-theatre/hooks/use-clinical-theatre";
import {
  useCheckTheatreWaitingListSchedule,
  useCreateTheatreWaitingListEntry,
  useRemoveTheatreWaitingListEntry,
  useScheduleTheatreWaitingListEntry,
  useTheatreSessions,
  useTheatreUrgencyCategories,
  useUpdateTheatreWaitingListEntry,
} from "@/features/clinical-theatre/hooks/use-theatre-planning";
import type {
  TheatreProcedureLaterality,
  TheatreRoom,
} from "@/features/clinical-theatre/types/clinical-theatre.types";
import type { TheatreProcedureProduct } from "@/features/clinical-theatre/types/theatre-catalog.types";
import type {
  TheatreRemovalReason,
  TheatreScheduleCheck,
  TheatreSessionSlot,
  TheatreWaitingListEntry,
  TheatreWaitingListPayload,
} from "@/features/clinical-theatre/types/theatre-planning.types";
import { LATERALITY_OPTIONS } from "@/features/clinical-theatre/utils/theatre-advanced-display";
import {
  REMOVAL_REASONS,
  combineLocalDateTime,
  formatClock,
} from "@/features/clinical-theatre/utils/theatre-planning-display";
import {
  errorMessage,
  theatreClinicOptions,
} from "@/features/clinical-theatre/utils/theatre-record-display";
import { CustomerAppointmentPicker } from "@/features/customers/components/CustomerAppointmentPicker";
import type { Customer } from "@/features/customers/types/customer.types";

type DraftProcedure = {
  product: { uuid: string; name: string };
  laterality: TheatreProcedureLaterality | "";
};

type EntryDraft = {
  categoryUuid: string;
  surgeon: { id: number; name: string } | null;
  procedures: DraftProcedure[];
  addedOn: string;
  duration: string;
  priorityNotes: string;
  notes: string;
  changeReason: string;
};

function draftFrom(entry: TheatreWaitingListEntry | null): EntryDraft {
  return {
    categoryUuid: entry?.category.uuid ?? "",
    surgeon:
      entry && entry.surgeon_id ? { id: entry.surgeon_id, name: entry.surgeon_name } : null,
    procedures:
      entry?.procedures.map((row) => ({
        product: { uuid: row.product_uuid, name: row.name },
        laterality: (row.laterality || "") as TheatreProcedureLaterality | "",
      })) ?? [],
    addedOn: entry?.added_on ?? "",
    duration: entry?.anticipated_duration_minutes ? String(entry.anticipated_duration_minutes) : "",
    priorityNotes: entry?.clinical_priority_notes ?? "",
    notes: entry?.notes ?? "",
    changeReason: "",
  };
}

/** Build the API payload from the add / edit form (pure; tested). */
export function buildWaitingListPayload(
  draft: EntryDraft,
  extra: { customerUuid?: string; clinicUuid?: string; isEdit: boolean; originalCategory?: string },
): TheatreWaitingListPayload {
  const payload: TheatreWaitingListPayload = {
    urgency_category: draft.categoryUuid,
    surgeon: draft.surgeon?.id ?? null,
    clinical_priority_notes: draft.priorityNotes.trim(),
    notes: draft.notes.trim(),
    anticipated_duration_minutes: draft.duration ? Number(draft.duration) : null,
    procedures: draft.procedures.map((row) => ({
      product: row.product.uuid,
      laterality: row.laterality,
    })),
  };
  if (draft.addedOn) payload.added_on = draft.addedOn;
  if (!extra.isEdit) {
    payload.customer = extra.customerUuid;
    payload.clinic = extra.clinicUuid;
  } else if (extra.originalCategory && extra.originalCategory !== draft.categoryUuid) {
    payload.change_reason = draft.changeReason.trim();
  }
  return payload;
}

/** Add a patient to the waiting list, or edit an entry. */
export function TheatreWaitingListEntryDialog({
  open,
  onOpenChange,
  entry,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: TheatreWaitingListEntry | null;
}) {
  const isEdit = Boolean(entry);
  const [draft, setDraft] = useState<EntryDraft>(() => draftFrom(entry));
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [clinic, setClinic] = useState("");
  const [picked, setPicked] = useState<TheatreProcedureProduct | null>(null);
  const { data: categories = [] } = useTheatreUrgencyCategories();
  const { data: rooms = [] } = useTheatreRooms({}, { enabled: open });
  const clinics = theatreClinicOptions(rooms);
  const clinicUuid = clinic || (clinics.length === 1 ? clinics[0].uuid : "");
  const create = useCreateTheatreWaitingListEntry();
  const update = useUpdateTheatreWaitingListEntry();
  const mutation = isEdit ? update : create;
  const categoryChanged = isEdit && entry?.category.uuid !== draft.categoryUuid;
  const problems = [
    !isEdit && !customer ? "Choose the patient." : null,
    !isEdit && !clinicUuid ? "Choose the clinic." : null,
    !draft.categoryUuid ? "Choose an urgency category." : null,
    draft.procedures.length === 0 ? "Add at least one procedure from the catalogue." : null,
    categoryChanged && !draft.changeReason.trim() ? "Give a reason for the category change." : null,
  ].filter(Boolean) as string[];

  const close = () => {
    onOpenChange(false);
    setDraft(draftFrom(entry));
    setCustomer(null);
    setPicked(null);
    mutation.reset();
  };

  const submit = () => {
    if (problems.length > 0) return;
    const payload = buildWaitingListPayload(draft, {
      customerUuid: customer?.uuid,
      clinicUuid,
      isEdit,
      originalCategory: entry?.category.uuid,
    });
    if (entry) {
      update.mutate({ uuid: entry.uuid, payload }, { onSuccess: close });
    } else {
      create.mutate(payload, { onSuccess: close });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit waiting list entry" : "Add to waiting list"}</DialogTitle>
          <DialogDescription>
            Procedures come from the products catalogue so the booking and bill use the right
            item and price.
          </DialogDescription>
        </DialogHeader>
        <form
          id="theatre-waiting-list-form"
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          {isEdit && entry ? (
            <p className="text-sm">
              <span className="font-medium">{entry.patient.name}</span>{" "}
              <span className="text-muted-foreground">{entry.patient.identifier}</span>
            </p>
          ) : (
            <>
              <CustomerAppointmentPicker customer={customer} onCustomerChange={setCustomer} />
              {clinics.length > 1 ? (
                <div className="space-y-1.5">
                  <Label>Clinic</Label>
                  <Select value={clinic} onValueChange={setClinic}>
                    <SelectTrigger aria-label="Clinic">
                      <SelectValue placeholder="Select clinic" />
                    </SelectTrigger>
                    <SelectContent>
                      {clinics.map((row) => (
                        <SelectItem key={row.uuid} value={row.uuid}>
                          {row.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
            </>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Urgency category</Label>
              <Select
                value={draft.categoryUuid}
                onValueChange={(value) => setDraft({ ...draft, categoryUuid: value })}
              >
                <SelectTrigger aria-label="Urgency category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((row) => (
                    <SelectItem key={row.uuid} value={row.uuid}>
                      {row.code} · {row.label} ({row.target_days} d)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <CareProviderCombobox
              id="theatre-waiting-list-surgeon"
              label="Surgeon"
              clinicUuid={clinicUuid || undefined}
              value={draft.surgeon?.id ?? null}
              displayName={draft.surgeon?.name ?? null}
              onSelect={(provider: CareProvider | null) =>
                setDraft({
                  ...draft,
                  surgeon: provider ? { id: provider.id, name: provider.name } : null,
                })
              }
            />
          </div>
          {categoryChanged ? (
            <div className="space-y-1.5">
              <Label htmlFor="theatre-waiting-list-change-reason">Reason for category change</Label>
              <Input
                id="theatre-waiting-list-change-reason"
                value={draft.changeReason}
                onChange={(event) => setDraft({ ...draft, changeReason: event.target.value })}
              />
            </div>
          ) : null}
          <div className="space-y-2">
            <Label>Procedures</Label>
            {draft.procedures.length > 0 ? (
              <ul className="space-y-1">
                {draft.procedures.map((row, index) => (
                  <li
                    key={row.product.uuid}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-2 py-1 text-sm"
                  >
                    <span className="font-medium">{row.product.name}</span>
                    <div className="flex items-center gap-2">
                      <Select
                        value={row.laterality || "not_applicable"}
                        onValueChange={(value) => {
                          const next = [...draft.procedures];
                          next[index] = {
                            ...row,
                            laterality: value as TheatreProcedureLaterality,
                          };
                          setDraft({ ...draft, procedures: next });
                        }}
                      >
                        <SelectTrigger aria-label="Laterality" className="h-8 w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LATERALITY_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setDraft({
                            ...draft,
                            procedures: draft.procedures.filter((_, i) => i !== index),
                          })
                        }
                      >
                        Remove
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}
            <TheatreProcedureProductPicker
              id="theatre-waiting-list-procedure"
              value={picked}
              onChange={(product) => {
                if (!product) {
                  setPicked(null);
                  return;
                }
                if (!draft.procedures.some((row) => row.product.uuid === product.uuid)) {
                  setDraft({
                    ...draft,
                    procedures: [
                      ...draft.procedures,
                      {
                        product: { uuid: product.uuid, name: product.display_name || product.name },
                        laterality: "",
                      },
                    ],
                  });
                }
                setPicked(null);
              }}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="theatre-waiting-list-added">Date added (decision to operate)</Label>
              <Input
                id="theatre-waiting-list-added"
                type="date"
                value={draft.addedOn}
                onChange={(event) => setDraft({ ...draft, addedOn: event.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="theatre-waiting-list-duration">Expected duration (min)</Label>
              <Input
                id="theatre-waiting-list-duration"
                type="number"
                min={5}
                max={1440}
                value={draft.duration}
                onChange={(event) => setDraft({ ...draft, duration: event.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="theatre-waiting-list-priority">Clinical priority notes</Label>
            <Textarea
              id="theatre-waiting-list-priority"
              rows={2}
              value={draft.priorityNotes}
              onChange={(event) => setDraft({ ...draft, priorityNotes: event.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="theatre-waiting-list-notes">Other notes</Label>
            <Textarea
              id="theatre-waiting-list-notes"
              rows={2}
              value={draft.notes}
              onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
            />
          </div>
          {problems.length > 0 ? (
            <ul className="list-disc pl-5 text-xs text-muted-foreground">
              {problems.map((problem) => (
                <li key={problem}>{problem}</li>
              ))}
            </ul>
          ) : null}
          {mutation.error ? (
            <p className="text-sm text-red-600" role="alert">
              {errorMessage(mutation.error, "Could not save the entry.")}
            </p>
          ) : null}
        </form>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="theatre-waiting-list-form"
            disabled={problems.length > 0 || mutation.isPending}
          >
            {isEdit ? "Save changes" : "Add to list"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Remove an entry from the waiting list with a standard reason. */
export function TheatreWaitingListRemoveDialog({
  entry,
  onClose,
}: {
  entry: TheatreWaitingListEntry | null;
  onClose: () => void;
}) {
  const [reason, setReason] = useState<TheatreRemovalReason | "">("");
  const [note, setNote] = useState("");
  const remove = useRemoveTheatreWaitingListEntry();
  const needsNote = reason === "other";
  const canSubmit = Boolean(reason) && (!needsNote || note.trim().length > 0);
  const close = () => {
    setReason("");
    setNote("");
    remove.reset();
    onClose();
  };
  return (
    <Dialog open={Boolean(entry)} onOpenChange={(next) => (next ? null : close())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Remove from waiting list</DialogTitle>
          <DialogDescription>
            {entry ? `${entry.patient.name} — ${entry.procedures.map((row) => row.name).join(", ")}` : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Reason</Label>
            <Select value={reason} onValueChange={(value) => setReason(value as TheatreRemovalReason)}>
              <SelectTrigger aria-label="Removal reason">
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                {REMOVAL_REASONS.map((row) => (
                  <SelectItem key={row.value} value={row.value}>
                    {row.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="theatre-remove-note">Note{needsNote ? "" : " (optional)"}</Label>
            <Textarea
              id="theatre-remove-note"
              rows={2}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </div>
          {remove.error ? (
            <p className="text-sm text-red-600" role="alert">
              {errorMessage(remove.error, "Could not remove the entry.")}
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={!canSubmit || remove.isPending}
            onClick={() =>
              entry &&
              remove.mutate(
                { uuid: entry.uuid, reason, note: note.trim() },
                { onSuccess: close },
              )
            }
          >
            Remove
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Pick a session slot and book the theatre case for a waiting-list entry. */
export function TheatreWaitingListScheduleDialog({
  entry,
  onClose,
}: {
  entry: TheatreWaitingListEntry | null;
  onClose: () => void;
}) {
  const [room, setRoom] = useState<TheatreRoom | null>(null);
  const [day, setDay] = useState("");
  const [clock, setClock] = useState("");
  const [duration, setDuration] = useState("");
  const [check, setCheck] = useState<TheatreScheduleCheck | null>(null);
  const [ackReadiness, setAckReadiness] = useState(false);
  const [ackSession, setAckSession] = useState(false);
  const [booked, setBooked] = useState<{ href: string | null } | null>(null);
  const checker = useCheckTheatreWaitingListSchedule();
  const schedule = useScheduleTheatreWaitingListEntry();
  const { data: allRooms = [] } = useTheatreRooms({}, { enabled: Boolean(entry) });
  const sessions = useTheatreSessions(
    { date_from: day, date_to: day, room: room?.uuid },
    { enabled: Boolean(entry && day) },
  );
  const minutes = Number(duration || entry?.anticipated_duration_minutes || 60);
  const start = combineLocalDateTime(day, clock);
  const end = useMemo(() => {
    if (!start || !Number.isFinite(minutes) || minutes <= 0) return null;
    return new Date(new Date(start).getTime() + minutes * 60_000).toISOString();
  }, [start, minutes]);
  const codes = new Set(check?.warnings.map((warning) => warning.code) ?? []);
  const blocked =
    !room ||
    !start ||
    !check ||
    (codes.has("readiness") && !ackReadiness) ||
    (codes.has("session") && !ackSession);

  const resetCheck = () => {
    setCheck(null);
    setAckReadiness(false);
    setAckSession(false);
  };

  const close = () => {
    setRoom(null);
    setDay("");
    setClock("");
    setDuration("");
    setBooked(null);
    resetCheck();
    checker.reset();
    schedule.reset();
    onClose();
  };

  const runCheck = () => {
    if (!entry || !room || !start) return;
    checker.mutate(
      { uuid: entry.uuid, payload: { room: room.uuid, scheduled_start: start, scheduled_end: end } },
      { onSuccess: (result) => setCheck(result) },
    );
  };

  const pickSlot = (slot: TheatreSessionSlot) => {
    const free = slot.next_free_start ?? slot.start;
    const date = new Date(free);
    const pad = (value: number) => String(value).padStart(2, "0");
    setClock(`${pad(date.getHours())}:${pad(date.getMinutes())}`);
    setRoom(allRooms.find((item) => item.uuid === slot.room.uuid) ?? room);
    resetCheck();
  };

  return (
    <Dialog open={Boolean(entry)} onOpenChange={(next) => (next ? null : close())}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Schedule into theatre</DialogTitle>
          <DialogDescription>
            {entry
              ? `${entry.patient.name} — ${entry.procedures.map((row) => row.name).join(", ")} (${entry.category.code})`
              : ""}
          </DialogDescription>
        </DialogHeader>
        {booked ? (
          <div className="space-y-2 text-sm" data-testid="theatre-schedule-done">
            <p>The theatre case is booked and the entry is marked scheduled.</p>
            {booked.href ? (
              <Button asChild size="sm">
                <Link href={booked.href}>Open the case</Link>
              </Button>
            ) : null}
          </div>
        ) : entry ? (
          <div className="space-y-3">
            <TheatreReadinessBadge readiness={entry.readiness} showWarning />
            <div className="grid gap-3 sm:grid-cols-2">
              <TheatreRoomSelect
                clinicUuid={entry.clinic.uuid}
                value={room}
                onChange={(next) => {
                  setRoom(next);
                  resetCheck();
                }}
              />
              <div className="space-y-1.5">
                <Label htmlFor="theatre-schedule-date">Date</Label>
                <Input
                  id="theatre-schedule-date"
                  type="date"
                  value={day}
                  onChange={(event) => {
                    setDay(event.target.value);
                    resetCheck();
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="theatre-schedule-time">Start time</Label>
                <Input
                  id="theatre-schedule-time"
                  type="time"
                  value={clock}
                  onChange={(event) => {
                    setClock(event.target.value);
                    resetCheck();
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="theatre-schedule-duration">Duration (min)</Label>
                <Input
                  id="theatre-schedule-duration"
                  type="number"
                  min={5}
                  placeholder={String(entry.anticipated_duration_minutes ?? 60)}
                  value={duration}
                  onChange={(event) => {
                    setDuration(event.target.value);
                    resetCheck();
                  }}
                />
              </div>
            </div>
            {day ? (
              <div className="space-y-1" data-testid="theatre-schedule-sessions">
                <p className="text-xs font-medium text-muted-foreground">
                  Sessions{room ? ` in ${room.name}` : ""} on {day}
                </p>
                {sessions.isLoading ? (
                  <p className="text-xs text-muted-foreground">Loading sessions…</p>
                ) : (sessions.data?.sessions ?? []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">No planned sessions.</p>
                ) : (
                  <ul className="space-y-1">
                    {(sessions.data?.sessions ?? []).map((slot) => (
                      <li key={slot.key}>
                        <button
                          type="button"
                          className="w-full rounded-md border px-2 py-1 text-left text-xs hover:bg-muted"
                          onClick={() => pickSlot(slot)}
                        >
                          <span className="font-medium">
                            {slot.room.name} {slot.start_time}–{slot.end_time}
                          </span>
                          {slot.surgeon_name ? ` · ${slot.surgeon_name}` : ""}
                          {slot.specialty ? ` · ${slot.specialty}` : ""}
                          {` · ${slot.case_count} booked, ${Math.round(slot.free_minutes)} min free`}
                          {slot.next_free_start ? ` · next free ${formatClock(slot.next_free_start)}` : " · full"}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}
            {check ? (
              <div className="space-y-2 rounded-md border p-2 text-sm" data-testid="theatre-schedule-check">
                {check.warnings.length === 0 ? (
                  <p className="text-emerald-700">Ready: within a planned session and cleared.</p>
                ) : (
                  check.warnings.map((warning) => (
                    <label key={warning.code} className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={warning.code === "readiness" ? ackReadiness : ackSession}
                        onChange={(event) =>
                          warning.code === "readiness"
                            ? setAckReadiness(event.target.checked)
                            : setAckSession(event.target.checked)
                        }
                      />
                      <span>
                        <span className="text-amber-700">{warning.message}</span>{" "}
                        {warning.code === "readiness"
                          ? "Book anyway (clearance to follow)."
                          : "Book outside the planned session."}
                      </span>
                    </label>
                  ))
                )}
              </div>
            ) : null}
            {checker.error || schedule.error ? (
              <p className="text-sm text-red-600" role="alert">
                {errorMessage(checker.error ?? schedule.error, "Could not schedule the case.")}
              </p>
            ) : null}
          </div>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={close}>
            {booked ? "Close" : "Cancel"}
          </Button>
          {!booked ? (
            <>
              <Button
                type="button"
                variant="outline"
                disabled={!room || !start || checker.isPending}
                onClick={runCheck}
              >
                Check slot
              </Button>
              <Button
                type="button"
                disabled={blocked || schedule.isPending}
                onClick={() =>
                  entry &&
                  room &&
                  start &&
                  schedule.mutate(
                    {
                      uuid: entry.uuid,
                      payload: {
                        room: room.uuid,
                        scheduled_start: start,
                        scheduled_end: end,
                        lead_surgeon: entry.surgeon_id,
                        acknowledge_readiness: ackReadiness,
                        allow_outside_session: ackSession,
                      },
                    },
                    {
                      onSuccess: (result) =>
                        setBooked({
                          href:
                            result.case.visit_uuid && result.case.encounter_uuid
                              ? `/clinical/theatre/${result.case.visit_uuid}/${result.case.encounter_uuid}/case`
                              : null,
                        }),
                    },
                  )
                }
              >
                Book case
              </Button>
            </>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
