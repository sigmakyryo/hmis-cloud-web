"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusDotBadge } from "@/components/ui/status-dot-badge";
import { CareProviderCombobox } from "@/features/appointments/components/CareProviderCombobox";
import type { CareProvider } from "@/features/appointments/types/appointment.types";
import { TheatreRoomSelect } from "@/features/clinical-theatre/components/TheatreRoomSelect";
import {
  useArchiveTheatreSession,
  useArchiveTheatreSessionTemplate,
  useCancelTheatreSessionOccurrence,
  useCreateTheatreSession,
  useCreateTheatreSessionTemplate,
  useTheatreSessionTemplates,
  useTheatreSessions,
  useTheatreSettings,
  useUpdateTheatreSession,
  useUpdateTheatreSettings,
} from "@/features/clinical-theatre/hooks/use-theatre-planning";
import type { TheatreRoom } from "@/features/clinical-theatre/types/clinical-theatre.types";
import type {
  TheatreSessionSlot,
  TheatreSettings,
} from "@/features/clinical-theatre/types/theatre-planning.types";
import { shiftDateInput, toDateInputValue } from "@/features/clinical-theatre/pages/TheatreBoardPage";
import {
  WEEKDAYS,
  shortTime,
} from "@/features/clinical-theatre/utils/theatre-planning-display";
import { errorMessage } from "@/features/clinical-theatre/utils/theatre-record-display";

const SELECT_CLASS =
  "flex h-9 rounded-md border border-input bg-background px-2 text-sm disabled:opacity-60";

/** Weekly theatre sessions per room, one-off overrides, and report settings. */
export function TheatreSessionsSettingsPanel() {
  return (
    <div className="space-y-8" data-testid="theatre-sessions-settings">
      <TheatreSettingsForm />
      <SessionTemplates />
      <UpcomingSessions />
    </div>
  );
}

function TheatreSettingsForm() {
  const { data, isLoading, error } = useTheatreSettings();
  if (isLoading) return <p className="text-sm text-muted-foreground">Loading settings…</p>;
  if (error || !data) {
    return <p className="text-sm text-red-600">{errorMessage(error, "Could not load settings.")}</p>;
  }
  return <SettingsFields key={JSON.stringify(data)} settings={data} />;
}

function SettingsFields({ settings }: { settings: TheatreSettings }) {
  const [values, setValues] = useState({
    first_case_tolerance_minutes: String(settings.first_case_tolerance_minutes),
    turnover_gap_cap_minutes: String(settings.turnover_gap_cap_minutes),
    clearance_validity_days: String(settings.clearance_validity_days),
  });
  const update = useUpdateTheatreSettings();
  const fields: { key: keyof typeof values; label: string; help: string }[] = [
    {
      key: "first_case_tolerance_minutes",
      label: "First-case tolerance (min)",
      help: "A session's first case counts as on time if the patient is in suite within this many minutes of the session start.",
    },
    {
      key: "turnover_gap_cap_minutes",
      label: "Turnover cap (min)",
      help: "Gaps between cases longer than this are idle time, not turnover.",
    },
    {
      key: "clearance_validity_days",
      label: "Fitness clearance valid for (days)",
      help: "Default expiry when a patient is cleared fit in the pre-op clinic.",
    },
  ];
  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold text-brand-navy">Performance & clearance</h2>
      <div className="grid gap-3 md:grid-cols-3">
        {fields.map((field) => (
          <div key={field.key} className="space-y-1">
            <Label htmlFor={`theatre-setting-${field.key}`}>{field.label}</Label>
            <Input
              id={`theatre-setting-${field.key}`}
              type="number"
              min={0}
              value={values[field.key]}
              onChange={(event) => setValues({ ...values, [field.key]: event.target.value })}
            />
            <p className="text-xs text-muted-foreground">{field.help}</p>
          </div>
        ))}
      </div>
      <Button
        type="button"
        size="sm"
        disabled={update.isPending}
        onClick={() =>
          update.mutate({
            first_case_tolerance_minutes: Number(values.first_case_tolerance_minutes),
            turnover_gap_cap_minutes: Number(values.turnover_gap_cap_minutes),
            clearance_validity_days: Number(values.clearance_validity_days),
          })
        }
      >
        Save settings
      </Button>
      {update.error ? (
        <p className="text-sm text-red-600">{errorMessage(update.error, "Could not save settings.")}</p>
      ) : null}
    </section>
  );
}

function SessionTemplates() {
  const { data: templates = [], isLoading } = useTheatreSessionTemplates();
  const create = useCreateTheatreSessionTemplate();
  const archive = useArchiveTheatreSessionTemplate();
  const [room, setRoom] = useState<TheatreRoom | null>(null);
  const [weekday, setWeekday] = useState("0");
  const [start, setStart] = useState("08:00");
  const [end, setEnd] = useState("13:00");
  const [surgeon, setSurgeon] = useState<CareProvider | null>(null);
  const [specialty, setSpecialty] = useState("");
  const [label, setLabel] = useState("");
  const canAdd = Boolean(room && start && end && end > start);

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-base font-semibold text-brand-navy">Weekly sessions</h2>
        <p className="text-sm text-muted-foreground">
          The planned operating time for each room. Utilisation and on-time starts are measured
          against these sessions.
        </p>
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading sessions…</p>
      ) : templates.length === 0 ? (
        <p className="text-sm text-muted-foreground">No weekly sessions yet.</p>
      ) : (
        <table className="w-full text-sm" data-testid="theatre-session-templates">
          <thead className="text-left text-xs text-muted-foreground">
            <tr>
              <th className="py-1 pr-3">Day</th>
              <th className="py-1 pr-3">Room</th>
              <th className="py-1 pr-3">Time</th>
              <th className="py-1 pr-3">Surgeon</th>
              <th className="py-1 pr-3">Specialty / label</th>
              <th className="py-1" />
            </tr>
          </thead>
          <tbody>
            {templates.map((template) => (
              <tr key={template.uuid} className="border-t">
                <td className="py-1.5 pr-3">{template.weekday_label}</td>
                <td className="py-1.5 pr-3">{template.room?.name ?? "—"}</td>
                <td className="py-1.5 pr-3">
                  {shortTime(template.start_time)}–{shortTime(template.end_time)}
                </td>
                <td className="py-1.5 pr-3">{template.surgeon_name || "—"}</td>
                <td className="py-1.5 pr-3">
                  {[template.specialty, template.label].filter(Boolean).join(" · ") || "—"}
                </td>
                <td className="py-1.5 text-right">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={archive.isPending}
                    onClick={() => archive.mutate(template.uuid)}
                  >
                    Remove
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="grid gap-3 rounded-md border p-3 md:grid-cols-4 md:items-end">
        <TheatreRoomSelect value={room} onChange={setRoom} label="Room" />
        <div className="space-y-1">
          <Label htmlFor="theatre-template-day">Day</Label>
          <select
            id="theatre-template-day"
            className={SELECT_CLASS}
            value={weekday}
            onChange={(event) => setWeekday(event.target.value)}
          >
            {WEEKDAYS.map((day) => (
              <option key={day.value} value={day.value}>
                {day.label}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="theatre-template-start">Start</Label>
            <Input id="theatre-template-start" type="time" value={start} onChange={(event) => setStart(event.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="theatre-template-end">End</Label>
            <Input id="theatre-template-end" type="time" value={end} onChange={(event) => setEnd(event.target.value)} />
          </div>
        </div>
        <CareProviderCombobox
          id="theatre-template-surgeon"
          label="Surgeon (optional)"
          value={surgeon?.id ?? null}
          displayName={surgeon?.name ?? null}
          onSelect={setSurgeon}
        />
        <div className="space-y-1">
          <Label htmlFor="theatre-template-specialty">Specialty</Label>
          <Input id="theatre-template-specialty" value={specialty} onChange={(event) => setSpecialty(event.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="theatre-template-label">Label</Label>
          <Input
            id="theatre-template-label"
            placeholder="e.g. General list"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
          />
        </div>
        <Button
          type="button"
          disabled={!canAdd || create.isPending}
          onClick={() =>
            room &&
            create.mutate(
              {
                room: room.uuid,
                weekday: Number(weekday),
                start_time: start,
                end_time: end,
                surgeon: surgeon?.id ?? null,
                specialty: specialty.trim(),
                label: label.trim(),
              },
              {
                onSuccess: () => {
                  setSpecialty("");
                  setLabel("");
                },
              },
            )
          }
        >
          Add weekly session
        </Button>
      </div>
      {create.error || archive.error ? (
        <p className="text-sm text-red-600">
          {errorMessage(create.error ?? archive.error, "Could not save the session.")}
        </p>
      ) : null}
    </section>
  );
}

function UpcomingSessions() {
  const today = toDateInputValue(new Date());
  const [from, setFrom] = useState(today);
  const to = shiftDateInput(from, 13);
  const { data, isLoading, error } = useTheatreSessions({
    date_from: from,
    date_to: to,
    include_cancelled: true,
  });
  const cancel = useCancelTheatreSessionOccurrence();
  const archive = useArchiveTheatreSession();
  const createSession = useCreateTheatreSession();
  const updateSession = useUpdateTheatreSession();
  const [room, setRoom] = useState<TheatreRoom | null>(null);
  const [day, setDay] = useState("");
  const [start, setStart] = useState("08:00");
  const [end, setEnd] = useState("13:00");

  const cancelSlot = (slot: TheatreSessionSlot) => {
    if (slot.source === "template" && slot.template_uuid) {
      cancel.mutate({ template: slot.template_uuid, date: slot.date, reason: "Cancelled" });
    } else if (slot.source === "override" && slot.session_uuid) {
      // Keep the override row so the weekly occurrence stays cancelled.
      updateSession.mutate({ uuid: slot.session_uuid, payload: { status: "cancelled" } });
    } else if (slot.session_uuid) {
      archive.mutate(slot.session_uuid);
    }
  };

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-brand-navy">Next two weeks</h2>
          <p className="text-sm text-muted-foreground">
            Cancel a single occurrence (e.g. public holiday) or add a one-off session.
          </p>
        </div>
        <div className="space-y-1">
          <Label htmlFor="theatre-sessions-from">From</Label>
          <Input id="theatre-sessions-from" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
        </div>
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : error ? (
        <p className="text-sm text-red-600">{errorMessage(error, "Could not load sessions.")}</p>
      ) : (data?.sessions ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">No sessions in this period.</p>
      ) : (
        <ul className="divide-y rounded-md border text-sm" data-testid="theatre-upcoming-sessions">
          {(data?.sessions ?? []).map((slot) => (
            <li key={slot.key} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
              <span>
                <span className="font-medium">{slot.date}</span> · {slot.room.name}{" "}
                {slot.start_time}–{slot.end_time}
                {slot.surgeon_name ? ` · ${slot.surgeon_name}` : ""}
                {slot.label ? ` · ${slot.label}` : ""}
                {` · ${slot.case_count} case(s)`}
              </span>
              <span className="flex items-center gap-2">
                {slot.source !== "template" ? (
                  <StatusDotBadge tone="info">{slot.source === "override" ? "Changed" : "One-off"}</StatusDotBadge>
                ) : null}
                {slot.status === "cancelled" ? (
                  <StatusDotBadge tone="danger">Cancelled</StatusDotBadge>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={cancel.isPending || archive.isPending || updateSession.isPending}
                    onClick={() => cancelSlot(slot)}
                  >
                    Cancel this day
                  </Button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="grid gap-3 rounded-md border p-3 md:grid-cols-5 md:items-end">
        <TheatreRoomSelect value={room} onChange={setRoom} label="Room" />
        <div className="space-y-1">
          <Label htmlFor="theatre-adhoc-date">Date</Label>
          <Input id="theatre-adhoc-date" type="date" value={day} onChange={(event) => setDay(event.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="theatre-adhoc-start">Start</Label>
          <Input id="theatre-adhoc-start" type="time" value={start} onChange={(event) => setStart(event.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="theatre-adhoc-end">End</Label>
          <Input id="theatre-adhoc-end" type="time" value={end} onChange={(event) => setEnd(event.target.value)} />
        </div>
        <Button
          type="button"
          disabled={!room || !day || !(end > start) || createSession.isPending}
          onClick={() =>
            room &&
            createSession.mutate({
              room: room.uuid,
              session_date: day,
              start_time: start,
              end_time: end,
            })
          }
        >
          Add one-off session
        </Button>
      </div>
      {cancel.error || archive.error || createSession.error || updateSession.error ? (
        <p className="text-sm text-red-600">
          {errorMessage(
            cancel.error ?? archive.error ?? createSession.error ?? updateSession.error,
            "Could not update the session.",
          )}
        </p>
      ) : null}
    </section>
  );
}
