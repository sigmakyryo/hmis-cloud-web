import type { FitItem } from "@/features/occupational-health/services/fitness.service";
import { cn } from "@/lib/utils";
import { SOURCE_LABEL, fmtDate, label } from "./fit-format";
import { STATUS_TONE, TONE_DOT, daysUntil, relativeDays } from "./fit-visual";

const WINDOW_DAYS = 365;

type Marker = { key: string; name: string; date: string; days: number; tone: keyof typeof TONE_DOT };

/** The next twelve months on one line: each expiry is a marker, overdue items sit before today. */
export function FitExpiryTimeline({ items, now = new Date() }: { items: FitItem[]; now?: Date }) {
  const dated: Marker[] = items
    .filter((item): item is FitItem & { expires_on: string } => Boolean(item.expires_on))
    .map((item, index) => {
      const days = daysUntil(item.expires_on, now);
      return {
        key: `${item.source}-${item.label}-${index}`,
        name: item.label && item.label !== label(SOURCE_LABEL, item.source) ? item.label : label(SOURCE_LABEL, item.source),
        date: item.expires_on,
        days,
        tone: days < 0 ? "bad" : STATUS_TONE[item.status],
      };
    })
    .toSorted((a, b) => a.days - b.days);
  const overdue = dated.filter((marker) => marker.days < 0);
  const upcoming = dated.filter((marker) => marker.days >= 0 && marker.days <= WINDOW_DAYS);
  const later = dated.length - overdue.length - upcoming.length;
  const months = Array.from({ length: 5 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() + index * 3, 1);
    const localIso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
    return {
      key: index,
      text: index === 0 ? "Today" : date.toLocaleDateString(undefined, { month: "short" }),
      left: index === 0 ? 0 : (daysUntil(localIso, now) / WINDOW_DAYS) * 100,
    };
  });

  return (
    <div data-testid="oh-fit-timeline">
      <div className="relative mt-8 mb-10 h-px bg-dash-border">
        {months.map((month) => (
          <span
            key={month.key}
            className="absolute top-0 -translate-x-1/2"
            style={{ left: `${month.left}%` }}
          >
            <span className="block h-2 w-px -translate-y-1/2 bg-dash-border" aria-hidden />
            <span className="mt-1.5 block text-[11px] whitespace-nowrap text-dash-muted">{month.text}</span>
          </span>
        ))}
        {overdue.length > 0 ? (
          <span className="absolute -top-[22px] left-0 -translate-x-1/2 text-[11px] font-medium whitespace-nowrap text-red-700">
            {overdue.length} overdue
          </span>
        ) : null}
        {[...overdue.slice(0, 1), ...upcoming].map((marker, index) => (
          <span
            key={marker.key}
            title={`${marker.name} · ${fmtDate(marker.date)} (${relativeDays(marker.days)})`}
            className={cn(
              "absolute top-0 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-[3px] ring-white",
              TONE_DOT[marker.tone],
            )}
            style={{ left: `${Math.max(0, (marker.days / WINDOW_DAYS) * 100)}%`, zIndex: 10 + index }}
          />
        ))}
      </div>
      <ol className="space-y-1.5 text-[13px]">
        {[...overdue, ...upcoming].map((marker) => (
          <li key={marker.key} className="flex items-baseline gap-2.5">
            <span className={cn("size-1.5 shrink-0 -translate-y-0.5 rounded-full", TONE_DOT[marker.tone])} aria-hidden />
            <span className="min-w-0 flex-1 truncate font-medium text-brand-navy">{marker.name}</span>
            <span className="shrink-0 tabular-nums text-dash-muted">{fmtDate(marker.date)}</span>
            <span className={cn("w-28 shrink-0 text-right text-[12.5px]", marker.days < 0 ? "font-medium text-red-700" : marker.days <= 60 ? "font-medium text-amber-800" : "text-dash-muted")}>
              {relativeDays(marker.days)}
            </span>
          </li>
        ))}
        {overdue.length + upcoming.length === 0 ? (
          <li className="text-dash-muted">Nothing expires in the next twelve months.</li>
        ) : null}
        {later > 0 ? <li className="text-[12.5px] text-dash-muted">{later} more after the next twelve months.</li> : null}
      </ol>
    </div>
  );
}
