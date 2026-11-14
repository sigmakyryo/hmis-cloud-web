"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { PrimaryButton, SecondaryButton } from "@/components/ui/app-buttons";
import { Textarea } from "@/components/ui/textarea";
import { ROUTES } from "@/constants/routes";
import { Drawer, DrawerActions } from "@/app/(app)/immunizations/_components/shared/Drawer";
import { CheckField, Field, SelectField } from "@/app/(app)/immunizations/_components/shared/Field";
import { LoadError, QuietLoading } from "@/app/(app)/immunizations/_components/shared/QuietLoading";
import { EventStatusBadge, SeverityBadge } from "@/features/exposure-management/components/ExposureBadges";
import type { ControlHierarchy, EventStatus, ExposureEvent } from "@/features/exposure-management/exposure.types";
import { EVENT_STATUS_LABELS, HIERARCHY_LABELS, errorMessage, formatDate } from "@/features/exposure-management/lib/exposure-format";
import {
  addControl,
  draftEventWithAi,
  exposureKeys,
  fetchEvent,
  openIodFromEvent,
  updateControl,
  updateEvent,
} from "@/features/exposure-management/services/exposure.service";

const STATUSES = Object.keys(EVENT_STATUS_LABELS) as EventStatus[];
const HIERARCHY = Object.keys(HIERARCHY_LABELS) as ControlHierarchy[];

export function ExposureEventSheet({ uuid, onClose }: { uuid: string; onClose: () => void }) {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: exposureKeys.event(uuid), queryFn: () => fetchEvent(uuid) });

  return (
    <Drawer title="Overexposure event" description="Investigate, assign controls and decide on removal from exposure." onClose={onClose} wide>
      {query.isPending ? <QuietLoading /> : null}
      {query.isError ? <LoadError>{errorMessage(query.error, "Could not load the event.")}</LoadError> : null}
      {query.data ? (
        <EventBody
          key={`${query.data.uuid}-${query.dataUpdatedAt}`}
          event={query.data}
          onChanged={() => {
            void qc.invalidateQueries({ queryKey: exposureKeys.events });
            void qc.invalidateQueries({ queryKey: exposureKeys.event(uuid) });
            void qc.invalidateQueries({ queryKey: exposureKeys.dashboard });
          }}
          onClose={onClose}
        />
      ) : null}
    </Drawer>
  );
}

function EventBody({ event, onChanged, onClose }: { event: ExposureEvent; onChanged: () => void; onClose: () => void }) {
  const [status, setStatus] = useState<EventStatus>(event.status);
  const [investigation, setInvestigation] = useState(event.investigation);
  const [removal, setRemoval] = useState(event.removal_from_exposure);
  const [dueOn, setDueOn] = useState(event.due_on ?? "");
  const [control, setControl] = useState({ hierarchy: "engineering" as ControlHierarchy, description: "", owner_name: "", due_on: "" });
  const [message, setMessage] = useState("");

  const closed = event.status === "closed";
  const needsEvidence = status === "closed" && (event.controls ?? []).length === 0;

  const save = useMutation({
    mutationFn: () => updateEvent(event.uuid, { status, investigation, removal_from_exposure: removal, due_on: dueOn || null }),
    onSuccess: () => {
      setMessage("Saved.");
      onChanged();
    },
    onError: (error) => setMessage(errorMessage(error, "Could not save the event.")),
  });
  const draft = useMutation({
    mutationFn: () => draftEventWithAi(event.uuid),
    onSuccess: () => {
      setMessage("Draft requested. Review it before accepting.");
      onChanged();
    },
    onError: (error) => setMessage(errorMessage(error, "Could not draft with AI.")),
  });
  const add = useMutation({
    mutationFn: () =>
      addControl(event.uuid, {
        hierarchy: control.hierarchy,
        description: control.description.trim(),
        owner_name: control.owner_name.trim(),
        due_on: control.due_on || null,
      }),
    onSuccess: () => {
      setControl({ hierarchy: "engineering", description: "", owner_name: "", due_on: "" });
      onChanged();
    },
    onError: (error) => setMessage(errorMessage(error, "Could not add the control.")),
  });
  const advance = useMutation({
    mutationFn: ({ uuid, next }: { uuid: string; next: string }) => updateControl(uuid, { status: next }),
    onSuccess: onChanged,
    onError: (error) => setMessage(errorMessage(error, "Could not update the control.")),
  });
  const openIod = useMutation({
    mutationFn: () => openIodFromEvent(event.uuid),
    onSuccess: () => {
      setMessage("Injury on duty case opened.");
      onChanged();
    },
    onError: (error) => setMessage(errorMessage(error, "Could not open an injury on duty case.")),
  });

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 text-[13px] text-brand-slate">
        <SeverityBadge severity={event.severity} />
        <EventStatusBadge status={event.status} />
        <span>{event.agent_name}</span>
        <span className="text-dash-muted">· {event.group_name ?? "No group"} · {event.worker_label}</span>
      </div>
      <p className="text-[13px] text-brand-slate">{event.summary}</p>
      <p className="text-[12px] text-dash-muted">Detected {formatDate(event.detected_at)} · due {formatDate(event.due_on)}</p>

      <SelectField label="Status" value={status} onChange={(value) => setStatus(value as EventStatus)}>
        {STATUSES.map((value) => (
          <option key={value} value={value}>{EVENT_STATUS_LABELS[value]}</option>
        ))}
      </SelectField>
      <Field label="Due date" type="date" value={dueOn} onChange={setDueOn} />
      <div className="space-y-1.5">
        <label htmlFor="exposure-investigation" className="text-sm font-medium">Investigation</label>
        <Textarea id="exposure-investigation" rows={5} value={investigation} onChange={(e) => setInvestigation(e.target.value)} />
        {event.ai_draft ? (
          <div className="rounded-md border border-dash-border bg-dash-canvas/50 p-3 text-[13px]">
            <p className="mb-1 font-medium text-brand-navy">AI draft (not reviewed)</p>
            <p className="whitespace-pre-wrap text-brand-slate">{event.ai_draft}</p>
            <button type="button" className="mt-2 text-[13px] font-medium text-brand-primary hover:underline" onClick={() => setInvestigation(event.ai_draft ?? "")}>
              Use as investigation text
            </button>
          </div>
        ) : null}
        <SecondaryButton type="button" disabled={draft.isPending || closed} onClick={() => draft.mutate()}>
          {draft.isPending ? "Drafting…" : "Draft with AI"}
        </SecondaryButton>
      </div>
      <CheckField label="Remove worker from this exposure until controls are verified (clinician decision)" checked={removal} onChange={setRemoval} />

      <div className="space-y-2">
        <p className="text-sm font-medium text-brand-navy">Controls</p>
        {(event.controls ?? []).length === 0 ? <p className="text-[13px] text-dash-muted">No controls assigned yet.</p> : null}
        <ul className="space-y-1.5">
          {(event.controls ?? []).map((item) => (
            <li key={item.uuid} className="flex items-start justify-between gap-3 rounded-md border border-dash-border px-3 py-2 text-[13px]">
              <span>
                <span className="font-medium">{HIERARCHY_LABELS[item.hierarchy]}</span> · {item.description}
                <span className={item.overdue ? "block text-red-700" : "block text-dash-muted"}>
                  {item.owner_name || "Unassigned"} · due {formatDate(item.due_on)} · {item.status.replace("_", " ")}
                </span>
              </span>
              {item.status !== "verified" ? (
                <button
                  type="button"
                  className="shrink-0 text-[13px] font-medium text-brand-primary hover:underline"
                  onClick={() => advance.mutate({ uuid: item.uuid, next: item.status === "planned" ? "in_progress" : item.status === "in_progress" ? "done" : "verified" })}
                >
                  {item.status === "planned" ? "Start" : item.status === "in_progress" ? "Mark done" : "Verify"}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
        <SelectField label="Add control" value={control.hierarchy} onChange={(value) => setControl((c) => ({ ...c, hierarchy: value as ControlHierarchy }))}>
          {HIERARCHY.map((value) => (
            <option key={value} value={value}>{HIERARCHY_LABELS[value]}</option>
          ))}
        </SelectField>
        <Field label="What will be done" value={control.description} onChange={(value) => setControl((c) => ({ ...c, description: value }))} />
        <Field label="Owner" value={control.owner_name} onChange={(value) => setControl((c) => ({ ...c, owner_name: value }))} />
        <Field label="Due" type="date" value={control.due_on} onChange={(value) => setControl((c) => ({ ...c, due_on: value }))} />
        <SecondaryButton type="button" disabled={!control.description.trim() || add.isPending} onClick={() => add.mutate()}>
          Add control
        </SecondaryButton>
      </div>

      <div className="text-[13px]">
        {event.iod_case_uuid ? (
          <Link href={ROUTES.occupationalHealthRecord("iod", event.iod_case_uuid)} className="font-medium text-brand-primary hover:underline">
            Open linked injury on duty case
          </Link>
        ) : (
          <button type="button" disabled={openIod.isPending || !event.customer_uuid} className="font-medium text-brand-primary hover:underline disabled:opacity-50" onClick={() => openIod.mutate()}>
            Open an injury on duty case
          </button>
        )}
      </div>

      {needsEvidence ? <p role="alert" className="text-[13px] text-amber-800">Add at least one control before closing, or the close will be refused.</p> : null}
      {message ? <p role="status" className="text-[13px] text-brand-slate">{message}</p> : null}
      <DrawerActions>
        <SecondaryButton type="button" onClick={onClose}>Close</SecondaryButton>
        <PrimaryButton type="button" disabled={save.isPending} onClick={() => save.mutate()}>
          {save.isPending ? "Saving…" : "Save"}
        </PrimaryButton>
      </DrawerActions>
    </>
  );
}
