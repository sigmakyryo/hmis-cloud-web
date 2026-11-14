import type { ReactNode } from "react";

import { PAGE_STAT_LABEL_CLASS, PAGE_STAT_VALUE_CLASS } from "@/features/app-shell/components/page-layout";
import type { IodCaseDetail, IodCaseEntry, IodStatutoryPack } from "@/features/occupational-health/iod-case/iod-case.types";
import {
  caseDuration,
  countActions,
  daysBetween,
  describeDaysAgo,
  isCaseClosed,
  isLostTime,
  pluralDays,
  summariseNotices,
} from "@/features/occupational-health/iod-case/iod-case.utils";
import { formatOhDate } from "@/features/occupational-health/utils/oh-format";
import { cn } from "@/lib/utils";

type IodCaseFactsStripProps = {
  item: IodCaseDetail;
  pack: IodStatutoryPack | undefined;
  entries: readonly IodCaseEntry[];
  today: Date;
};

function Fact({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "danger" }) {
  return (
    <div className="min-w-0 py-1.5 sm:px-4 sm:py-0 sm:first:pl-0 sm:[&:not(:first-child)]:border-l sm:[&:not(:first-child)]:border-dash-border/80">
      <p className={PAGE_STAT_LABEL_CLASS}>{label}</p>
      <p className={cn(PAGE_STAT_VALUE_CLASS, "truncate", tone === "danger" && "text-red-700")}>{value}</p>
      {hint ? <p className="mt-0.5 truncate text-xs text-brand-muted">{hint}</p> : null}
    </div>
  );
}

/** The few numbers a reviewer wants before reading anything else, laid out as one ruled strip. */
export function IodCaseFactsStrip({ item, pack, entries, today }: IodCaseFactsStripProps) {
  const closed = isCaseClosed(item.status);
  const duration = caseDuration(item, today);
  const sinceIncident = daysBetween(item.onset_date, today);
  const notices = summariseNotices(pack?.notifications ?? []);
  const actions = countActions(entries, today);

  return (
    <dl
      className="grid grid-cols-2 gap-x-4 gap-y-2 border-y border-dash-border/80 bg-white px-4 py-3 sm:grid-cols-5 sm:px-6 sm:py-4"
      data-testid="oh-iod-case-facts"
    >
      <Fact
        label="Incident"
        value={formatOhDate(item.onset_date)}
        hint={[item.incident_time, describeDaysAgo(sinceIncident)].filter(Boolean).join(" · ")}
      />
      <Fact
        label={closed ? "Resolved in" : "Open for"}
        value={duration === null ? "—" : pluralDays(duration)}
        hint={closed ? `Closed ${formatOhDate(item.closed_on)}` : "Since the incident"}
      />
      <Fact
        label="Lost time"
        value={pluralDays(item.lost_days)}
        hint={isLostTime(item) ? "At or above the lost-time mark" : "Below the lost-time mark"}
        tone={isLostTime(item) ? "danger" : undefined}
      />
      <Fact
        label="Notices"
        value={pack ? `${notices.ready} of ${notices.total} ready` : "—"}
        hint={notices.needAttention > 0 ? `${notices.needAttention} need details` : undefined}
      />
      <Fact
        label="Follow-ups"
        value={`${actions.open} open`}
        hint={actions.overdue > 0 ? `${actions.overdue} overdue` : `${actions.done} done`}
        tone={actions.overdue > 0 ? "danger" : undefined}
      />
    </dl>
  );
}
