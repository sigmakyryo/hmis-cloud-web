"use client";

import { CalendarDays } from "lucide-react";

import { ROUTES } from "@/constants/routes";
import { shortDate } from "@/features/occupational-health/components/oh-home/views/OhViewCharts";
import { QueryState, ViewSection } from "@/features/occupational-health/components/oh-home/views/OhViewParts";
import type { OhHomeClinic } from "@/features/occupational-health/lib/oh-home.types";
import { cn } from "@/lib/utils";

type SummaryQuery = { data?: OhHomeClinic; isLoading: boolean; isError: boolean; refetch: () => unknown };
type Day = OhHomeClinic["visits_by_day"][number];

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const LONG_DAY = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" });
/** Shade steps from quiet to busy; the busiest days take white text. */
const SHADES = [
  "bg-dash-canvas text-dash-muted",
  "bg-brand-tint text-brand-primary",
  "bg-brand-primary/25 text-brand-navy",
  "bg-brand-primary/55 text-white",
  "bg-brand-primary text-white",
];

const toDate = (iso: string) => new Date(`${iso}T00:00:00`);
const isoOf = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const addDays = (date: Date, n: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + n);
const mondayOf = (date: Date) => addDays(date, -((date.getDay() + 6) % 7));

function shade(visits: number, max: number): string {
  if (visits === 0) return SHADES[0];
  return SHADES[Math.min(4, Math.ceil((visits / Math.max(1, max)) * 4))];
}

/** Monday-first weeks covering the days, with null where a day falls outside the range. */
function toWeeks(days: Day[]): Array<{ start: string; cells: Array<Day | null> }> {
  if (days.length === 0) return [];
  const byDate = new Map(days.map((day) => [day.date, day]));
  const weeks = [];
  for (let start = mondayOf(toDate(days[0].date)); start <= toDate(days[days.length - 1].date); start = addDays(start, 7)) {
    weeks.push({ start: isoOf(start), cells: WEEKDAYS.map((_, i) => byDate.get(isoOf(addDays(start, i))) ?? null) });
  }
  return weeks;
}

function compare(current: number, previous: number): { text: string; tone: string } | null {
  if (previous === 0) return null;
  const change = Math.round(((current - previous) / previous) * 100);
  if (change === 0) return { text: "same as last week", tone: "text-dash-muted" };
  return { text: `${change > 0 ? "+" : ""}${change}% on last week`, tone: change > 0 ? "text-brand-primary" : "text-amber-700" };
}

/** Two weeks of clinic visits as a calendar: each day shaded by how busy it was, today outlined. */
export function OhClinicVisits({ summary }: { summary: SummaryQuery }) {
  const days = summary.data?.visits_by_day ?? [];
  const today = days.at(-1)?.date ?? "";
  const max = Math.max(1, ...days.map((day) => day.visits));
  const thisMonday = today ? isoOf(mondayOf(toDate(today))) : "";
  const lastMonday = today ? isoOf(addDays(mondayOf(toDate(today)), -7)) : "";
  const thisWeek = days.filter((day) => day.date >= thisMonday).reduce((sum, day) => sum + day.visits, 0);
  const lastWeek = days.filter((day) => day.date >= lastMonday && day.date < thisMonday).reduce((sum, day) => sum + day.visits, 0);
  const busiest = days.reduce<Day | null>((best, day) => (day.visits > (best?.visits ?? 0) ? day : best), null);
  const cancelled = days.reduce((sum, day) => sum + day.cancelled, 0);
  const total = days.reduce((sum, day) => sum + day.visits, 0);
  const trend = compare(thisWeek, lastWeek);

  return (
    <ViewSection title="Visits" icon={CalendarDays} countLabel="visits in two weeks" count={summary.data ? total : undefined} href={ROUTES.occupationalHealth} linkLabel="Queue" testId="oh-home-visits">
      <QueryState isLoading={summary.isLoading} isError={summary.isError} onRetry={() => void summary.refetch()} rows={3}>
        <p className="mb-4 flex flex-wrap items-baseline gap-x-5 gap-y-1 text-[13px] text-dash-muted">
          <span>
            <span className="mr-1 text-[15px] font-semibold text-brand-navy tabular-nums">{thisWeek}</span>this week
          </span>
          {trend ? <span className={cn("font-medium", trend.tone)}>{trend.text}</span> : null}
          {busiest ? (
            <span>
              Busiest {LONG_DAY.format(toDate(busiest.date))}, <span className="font-semibold text-brand-navy tabular-nums">{busiest.visits}</span>
            </span>
          ) : null}
          {cancelled > 0 ? <span>{cancelled} cancelled</span> : null}
        </p>
        <table className="w-full max-w-xl table-fixed border-separate border-spacing-1" aria-label="Visits per day over the last two weeks">
          <thead>
            <tr>
              <th scope="col" className="w-14">
                <span className="sr-only">Week of</span>
              </th>
              {WEEKDAYS.map((weekday) => (
                <th key={weekday} scope="col" className="pb-1 text-center text-[11.5px] font-medium text-dash-muted">
                  {weekday}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {toWeeks(days).map((week) => (
              <tr key={week.start}>
                <th scope="row" className="pr-1 text-left text-[11.5px] font-medium whitespace-nowrap text-dash-muted">
                  {week.start === thisMonday ? "This wk" : week.start === lastMonday ? "Last wk" : shortDate(week.start)}
                </th>
                {week.cells.map((day, index) =>
                  day ? (
                    <td
                      key={day.date}
                      data-testid="oh-home-visit-day"
                      title={`${LONG_DAY.format(toDate(day.date))}: ${day.visits} visits${day.cancelled ? `, ${day.cancelled} cancelled` : ""}`}
                      className={cn(
                        "relative h-11 rounded-lg text-center align-middle text-[13.5px] font-semibold tabular-nums",
                        shade(day.visits, max),
                        day.date === today && "ring-2 ring-brand-navy ring-offset-1",
                      )}
                    >
                      {day.visits || ""}
                      <span className="sr-only">{` visits on ${LONG_DAY.format(toDate(day.date))}`}</span>
                      {day.cancelled > 0 ? <span aria-hidden className="absolute top-1 right-1 size-1.5 rounded-full bg-red-500" /> : null}
                    </td>
                  ) : (
                    <td key={`${week.start}-${index}`} className="h-11" />
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
        <p aria-hidden className="mt-2 flex max-w-xl items-center justify-end gap-1.5 text-[11.5px] text-dash-muted">
          Quiet
          {SHADES.map((tone) => (
            <span key={tone} className={cn("size-3 rounded-[3px]", tone.split(" ")[0])} />
          ))}
          Busy
          <span className="ml-3 inline-flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-red-500" /> cancellation
          </span>
        </p>
      </QueryState>
    </ViewSection>
  );
}
