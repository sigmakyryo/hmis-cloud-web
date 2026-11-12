"use client";

import Link from "next/link";
import { useDeferredValue, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { StatusDotBadge } from "@/components/ui/status-dot-badge";
import { ROUTES } from "@/constants/routes";
import { useMyClinicalCapabilities } from "@/features/clinical-opd/hooks/use-clinical-opd";
import { TheatreClinicSelect } from "@/features/clinical-theatre/components/TheatreClinicSelect";
import { TheatreReadinessBadge } from "@/features/clinical-theatre/components/TheatreReadinessBadge";
import {
  TheatreWaitingListEntryDialog,
  TheatreWaitingListRemoveDialog,
  TheatreWaitingListScheduleDialog,
} from "@/features/clinical-theatre/components/TheatreWaitingListDialogs";
import {
  useReinstateTheatreWaitingListEntry,
  useTheatreUrgencyCategories,
  useTheatreWaitingList,
  useTheatreWaitingListEntry,
} from "@/features/clinical-theatre/hooks/use-theatre-planning";
import type {
  TheatreReadinessStatus,
  TheatreWaitingListEntry,
  TheatreWaitingListFilters,
  TheatreWaitingListSort,
} from "@/features/clinical-theatre/types/theatre-planning.types";
import {
  READINESS_LABELS,
  formatDateTime,
  waitSummary,
} from "@/features/clinical-theatre/utils/theatre-planning-display";
import { errorMessage } from "@/features/clinical-theatre/utils/theatre-record-display";

const ANY = "__any__";

const STATUS_OPTIONS: { value: NonNullable<TheatreWaitingListFilters["status"]>; label: string }[] = [
  { value: "active", label: "Waiting & scheduled" },
  { value: "waiting", label: "Waiting" },
  { value: "scheduled", label: "Scheduled" },
  { value: "removed", label: "Removed" },
  { value: "all", label: "All" },
];

const SORT_OPTIONS: { value: TheatreWaitingListSort; label: string }[] = [
  { value: "priority", label: "Priority (category, then longest wait)" },
  { value: "target", label: "Closest to target date" },
  { value: "waited", label: "Longest waited" },
  { value: "added", label: "Most recently added" },
  { value: "patient", label: "Patient name" },
];

const STATUS_TONE = { waiting: "neutral", scheduled: "info", removed: "neutral" } as const;

/** Elective surgery waiting list: prioritise, schedule into sessions, remove. */
export function TheatreWaitingListPage() {
  const { data: capabilityData } = useMyClinicalCapabilities();
  const capabilities = capabilityData?.capabilities ?? [];
  const canManage = capabilities.includes("manage_theatre_waiting_list");
  const [search, setSearch] = useState("");
  const q = useDeferredValue(search.trim());
  const [status, setStatus] = useState<NonNullable<TheatreWaitingListFilters["status"]>>("active");
  const [category, setCategory] = useState("");
  const [readiness, setReadiness] = useState<TheatreReadinessStatus | "">("");
  const [breached, setBreached] = useState(false);
  const [sort, setSort] = useState<TheatreWaitingListSort>("priority");
  const [clinic, setClinic] = useState("");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<TheatreWaitingListEntry | null>(null);
  const [scheduling, setScheduling] = useState<TheatreWaitingListEntry | null>(null);
  const [removing, setRemoving] = useState<TheatreWaitingListEntry | null>(null);
  const [detailUuid, setDetailUuid] = useState<string | null>(null);
  const reinstate = useReinstateTheatreWaitingListEntry();
  const { data: categories = [] } = useTheatreUrgencyCategories();
  const filters: TheatreWaitingListFilters = {
    status,
    category: category || undefined,
    readiness,
    breached,
    sort,
    clinic: clinic || undefined,
    q: q.length >= 2 ? q : undefined,
  };
  const { data: entries = [], isLoading, error } = useTheatreWaitingList(filters);
  const breachedCount = entries.filter((row) => row.wait.breached && row.status !== "removed").length;

  return (
    <div className="space-y-4 p-4" data-testid="theatre-waiting-list-page">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-brand-navy">Elective waiting list</h1>
          <p className="text-sm text-muted-foreground">
            {entries.length} patient(s) shown
            {breachedCount > 0 ? ` · ${breachedCount} past their target date` : ""}. Waits
            are measured from the decision to operate.
          </p>
        </div>
        {canManage ? (
          <Button type="button" onClick={() => setAdding(true)} data-testid="theatre-waiting-list-add">
            Add patient
          </Button>
        ) : null}
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <Label htmlFor="theatre-waiting-list-search">Search</Label>
          <Input
            id="theatre-waiting-list-search"
            className="w-56"
            placeholder="Patient, ID or procedure"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <FilterSelect
          label="Status"
          value={status}
          onChange={(value) => setStatus(value as typeof status)}
          options={STATUS_OPTIONS}
        />
        <FilterSelect
          label="Category"
          value={category || ANY}
          onChange={(value) => setCategory(value === ANY ? "" : value)}
          options={[
            { value: ANY, label: "All categories" },
            ...categories.map((row) => ({ value: row.code, label: `${row.code} · ${row.label}` })),
          ]}
        />
        <FilterSelect
          label="Readiness"
          value={readiness || ANY}
          onChange={(value) => setReadiness(value === ANY ? "" : (value as TheatreReadinessStatus))}
          options={[
            { value: ANY, label: "Any readiness" },
            ...(Object.keys(READINESS_LABELS) as TheatreReadinessStatus[]).map((key) => ({
              value: key,
              label: READINESS_LABELS[key],
            })),
          ]}
        />
        <FilterSelect
          label="Sort"
          value={sort}
          onChange={(value) => setSort(value as TheatreWaitingListSort)}
          options={SORT_OPTIONS}
        />
        <TheatreClinicSelect value={clinic} onChange={setClinic} />
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input
            type="checkbox"
            checked={breached}
            onChange={(event) => setBreached(event.target.checked)}
          />
          Breached only
        </label>
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading waiting list…</p>
      ) : error ? (
        <p className="text-sm text-red-600">
          {errorMessage(error, "Could not load the waiting list.")}
        </p>
      ) : entries.length === 0 ? (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          No patients match these filters.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm" data-testid="theatre-waiting-list-table">
            <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Patient</th>
                <th className="px-3 py-2">Procedure</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Surgeon</th>
                <th className="px-3 py-2">Added</th>
                <th className="px-3 py-2">Wait</th>
                <th className="px-3 py-2">Pre-op</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const wait = waitSummary(entry.wait);
                return (
                  <tr key={entry.uuid} className="border-t align-top" data-testid="theatre-waiting-list-row">
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        className="text-left font-medium text-brand-navy hover:underline"
                        onClick={() => setDetailUuid(entry.uuid)}
                      >
                        {entry.patient.name}
                      </button>
                      <p className="text-xs text-muted-foreground">
                        {[entry.patient.identifier, entry.patient.age !== null ? `${entry.patient.age} y` : null, entry.patient.gender]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </td>
                    <td className="px-3 py-2">
                      {entry.procedures.map((row) => row.name).join(", ") || "—"}
                      {entry.clinical_priority_notes ? (
                        <p className="text-xs text-muted-foreground">{entry.clinical_priority_notes}</p>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">
                      <StatusDotBadge tone={entry.category.code === "P1" ? "danger" : "neutral"}>
                        {entry.category.code}
                      </StatusDotBadge>
                    </td>
                    <td className="px-3 py-2">{entry.surgeon_name || "—"}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{entry.added_on}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <StatusDotBadge tone={wait.tone}>{wait.text}</StatusDotBadge>
                      <p className="text-xs text-muted-foreground">Target {entry.wait.target_date}</p>
                    </td>
                    <td className="px-3 py-2">
                      <TheatreReadinessBadge readiness={entry.readiness} />
                    </td>
                    <td className="px-3 py-2">
                      <StatusDotBadge tone={STATUS_TONE[entry.status]}>{entry.status_label}</StatusDotBadge>
                      {entry.case ? (
                        <p className="text-xs text-muted-foreground">
                          {entry.case.status_label} · {formatDateTime(entry.case.scheduled_start)}
                          {entry.case.room_name ? ` · ${entry.case.room_name}` : ""}
                        </p>
                      ) : null}
                      {entry.status === "removed" && entry.removal_reason_label ? (
                        <p className="text-xs text-muted-foreground">{entry.removal_reason_label}</p>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap justify-end gap-1">
                        {entry.status === "waiting" ? (
                          <Button asChild size="sm" variant="ghost">
                            <Link href={`${ROUTES.clinicalTheatrePreOpClinic}?entry=${entry.uuid}`}>
                              Pre-op
                            </Link>
                          </Button>
                        ) : null}
                        {canManage && entry.status === "waiting" ? (
                          <>
                            <Button type="button" size="sm" onClick={() => setScheduling(entry)}>
                              Schedule
                            </Button>
                            <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(entry)}>
                              Edit
                            </Button>
                            <Button type="button" size="sm" variant="ghost" onClick={() => setRemoving(entry)}>
                              Remove
                            </Button>
                          </>
                        ) : null}
                        {entry.case?.visit_uuid && entry.case.encounter_uuid ? (
                          <Button asChild size="sm" variant="ghost">
                            <Link
                              href={`/clinical/theatre/${entry.case.visit_uuid}/${entry.case.encounter_uuid}/case`}
                            >
                              Case
                            </Link>
                          </Button>
                        ) : null}
                        {canManage &&
                        entry.status === "removed" &&
                        entry.removal_reason !== "operated" ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={reinstate.isPending}
                            onClick={() => reinstate.mutate({ uuid: entry.uuid })}
                          >
                            Reinstate
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {reinstate.error ? (
        <p className="text-sm text-red-600">{errorMessage(reinstate.error, "Could not reinstate.")}</p>
      ) : null}
      {adding ? (
        <TheatreWaitingListEntryDialog open={adding} onOpenChange={setAdding} entry={null} />
      ) : null}
      {editing ? (
        <TheatreWaitingListEntryDialog
          key={editing.uuid}
          open
          onOpenChange={(open) => (open ? null : setEditing(null))}
          entry={editing}
        />
      ) : null}
      <TheatreWaitingListScheduleDialog entry={scheduling} onClose={() => setScheduling(null)} />
      <TheatreWaitingListRemoveDialog entry={removing} onClose={() => setRemoving(null)} />
      <WaitingListEntryDetail uuid={detailUuid} onClose={() => setDetailUuid(null)} />
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly { value: string; label: string }[];
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger aria-label={label} className="w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function WaitingListEntryDetail({ uuid, onClose }: { uuid: string | null; onClose: () => void }) {
  const { data: entry, isLoading } = useTheatreWaitingListEntry(uuid);
  return (
    <Dialog open={Boolean(uuid)} onOpenChange={(open) => (open ? null : onClose())}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{entry?.patient.name ?? "Waiting list entry"}</DialogTitle>
          <DialogDescription>
            {entry ? `${entry.category.code} · ${entry.category.label} · added ${entry.added_on}` : ""}
          </DialogDescription>
        </DialogHeader>
        {isLoading || !entry ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="space-y-3 text-sm" data-testid="theatre-waiting-list-detail">
            <TheatreReadinessBadge readiness={entry.readiness} showWarning />
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
              <dt className="text-muted-foreground">Procedures</dt>
              <dd>{entry.procedures.map((row) => row.name).join(", ")}</dd>
              <dt className="text-muted-foreground">Waited</dt>
              <dd>
                {entry.wait.days_waited} of {entry.wait.target_days} days (target {entry.wait.target_date})
              </dd>
              <dt className="text-muted-foreground">Priority notes</dt>
              <dd>{entry.clinical_priority_notes || "—"}</dd>
              <dt className="text-muted-foreground">Notes</dt>
              <dd>{entry.notes || "—"}</dd>
              {entry.status === "removed" ? (
                <>
                  <dt className="text-muted-foreground">Removed</dt>
                  <dd>
                    {entry.removal_reason_label}
                    {entry.removal_note ? ` — ${entry.removal_note}` : ""}
                    {entry.removed_by_name ? ` (${entry.removed_by_name})` : ""}
                  </dd>
                </>
              ) : null}
            </dl>
            <div>
              <p className="font-medium">History</p>
              <ul className="mt-1 space-y-1">
                {(entry.events ?? []).map((event, index) => (
                  <li key={`${event.created_at}-${index}`} className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{event.action_label}</span>
                    {` · ${formatDateTime(event.created_at)}`}
                    {event.actor_name ? ` · ${event.actor_name}` : ""}
                    {event.note ? ` — ${event.note}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
