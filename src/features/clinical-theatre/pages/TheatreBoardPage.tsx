"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusDotBadge } from "@/components/ui/status-dot-badge";
import { ROUTES } from "@/constants/routes";
import { TheatreSafetyBadges } from "@/features/clinical-theatre/components/TheatreSafetyBadges";
import { useTheatreBoard } from "@/features/clinical-theatre/hooks/use-clinical-theatre";
import type {
  TheatreBoardLane,
  TheatreCase,
} from "@/features/clinical-theatre/types/clinical-theatre.types";
import {
  THEATRE_STATUS_LABELS,
  theatreStatusTone,
} from "@/features/clinical-theatre/utils/theatre-case-display";

/** `YYYY-MM-DD` for a local date. */
export function toDateInputValue(date: Date): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

export function shiftDateInput(value: string, days: number): string {
  const [year, month, day] = value.split("-").map(Number);
  return toDateInputValue(new Date(year, month - 1, day + days));
}

function timeRange(theatreCase: TheatreCase): string {
  if (!theatreCase.scheduled_start) return "Unscheduled";
  const format = (value: string) =>
    new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const start = format(theatreCase.scheduled_start);
  return theatreCase.scheduled_end
    ? `${start} – ${format(theatreCase.scheduled_end)}`
    : start;
}

function BoardCaseCard({ theatreCase }: { theatreCase: TheatreCase }) {
  const href =
    theatreCase.visit_uuid && theatreCase.encounter_uuid
      ? ROUTES.clinicalTheatreEncounter(
          theatreCase.visit_uuid,
          theatreCase.encounter_uuid,
        )
      : null;
  return (
    <li
      className="space-y-2 rounded-md border bg-background p-3 text-sm"
      data-testid="theatre-board-case"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-brand-navy">{timeRange(theatreCase)}</p>
          <p>{theatreCase.customer_name}</p>
          <p className="text-muted-foreground">
            {theatreCase.procedure_description || "Theatre case"}
            {theatreCase.urgency !== "elective" ? ` · ${theatreCase.urgency}` : ""}
          </p>
          {theatreCase.lead_surgeon_name ? (
            <p className="text-muted-foreground">
              Surgeon: {theatreCase.lead_surgeon_name}
            </p>
          ) : null}
        </div>
        <StatusDotBadge tone={theatreStatusTone(theatreCase.status)}>
          {THEATRE_STATUS_LABELS[theatreCase.status]}
        </StatusDotBadge>
      </div>
      <TheatreSafetyBadges safety={theatreCase.safety} />
      {href ? (
        <Link className="text-brand-primary underline" href={href}>
          Open workspace
        </Link>
      ) : null}
    </li>
  );
}

function BoardLane({ lane }: { lane: TheatreBoardLane }) {
  return (
    <section
      className="min-w-[260px] flex-1 space-y-3 rounded-lg border bg-muted/30 p-3"
      data-testid="theatre-board-lane"
    >
      <header className="flex items-center justify-between">
        <h3 className="font-semibold text-brand-navy">
          {lane.room ? lane.room.name : "Unassigned"}
        </h3>
        <span className="text-xs text-muted-foreground">
          {lane.cases.length} case{lane.cases.length === 1 ? "" : "s"}
        </span>
      </header>
      {lane.cases.length === 0 ? (
        <p className="text-sm text-muted-foreground">Free all day.</p>
      ) : (
        <ul className="space-y-2">
          {lane.cases.map((theatreCase) => (
            <BoardCaseCard key={theatreCase.uuid} theatreCase={theatreCase} />
          ))}
        </ul>
      )}
    </section>
  );
}

/** Operating theatre board: one day's cases by room, with a date picker. */
export function TheatreBoardPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const today = toDateInputValue(new Date());
  const date = searchParams.get("date") || today;
  const { data, isLoading, error } = useTheatreBoard({ date });

  const setDate = (next: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next && next !== today) params.set("date", next);
    else params.delete("date");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  };

  const lanes = (data?.lanes ?? []).filter(
    (lane) => lane.room !== null || lane.cases.length > 0,
  );

  return (
    <div className="space-y-4 p-4" data-testid="theatre-board-page">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-brand-navy">Theatre board</h1>
          <p className="text-sm text-muted-foreground">
            Cases by operating room for the selected day.
          </p>
        </div>
        <div className="flex items-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setDate(shiftDateInput(date, -1))}>
            Previous
          </Button>
          <div className="space-y-1">
            <Label htmlFor="theatre-board-date">Date</Label>
            <Input
              id="theatre-board-date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => setDate(shiftDateInput(date, 1))}>
            Next
          </Button>
          {date !== today ? (
            <Button variant="ghost" size="sm" onClick={() => setDate(today)}>
              Today
            </Button>
          ) : null}
        </div>
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading board…</p>
      ) : error ? (
        <p className="text-sm text-red-600">
          {error instanceof Error ? error.message : "Could not load the theatre board."}
        </p>
      ) : lanes.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No theatre rooms yet. Add rooms in Settings → Modules → Theatre.
        </p>
      ) : (
        <div className="flex flex-wrap gap-3">
          {lanes.map((lane) => (
            <BoardLane key={lane.room?.uuid ?? "unassigned"} lane={lane} />
          ))}
        </div>
      )}
    </div>
  );
}
