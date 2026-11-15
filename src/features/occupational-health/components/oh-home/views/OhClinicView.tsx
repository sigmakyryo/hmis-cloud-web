"use client";

import { Stethoscope } from "lucide-react";
import Link from "next/link";

import { UserIdenticon } from "@/components/UserIdenticon";
import { ROUTES } from "@/constants/routes";
import { formatWaitingMinutes } from "@/features/clinical-opd/utils/opd-queue-stage";
import { OhClinicCompliance } from "@/features/occupational-health/components/oh-home/views/OhClinicCompliance";
import { OhClinicVisits } from "@/features/occupational-health/components/oh-home/views/OhClinicVisits";
import { QueryState, ViewSection } from "@/features/occupational-health/components/oh-home/views/OhViewParts";
import { useOhHomeSummary } from "@/features/occupational-health/components/oh-home/views/useOhHomeSummary";
import { queueWaitingMinutes, waitTone } from "@/features/occupational-health/components/OhQueueTable";
import { OhStartVisitEntry } from "@/features/occupational-health/components/OhStartVisitEntry";
import { useOhComplianceDashboard, useOhEncounters } from "@/features/occupational-health/hooks/use-occupational-health";
import { isIodVisit, ohQueueEntryHref } from "@/features/occupational-health/lib/oh-queue-route";
import type { OhVisitEncounter } from "@/features/occupational-health/types";
import { cn } from "@/lib/utils";

const QUEUE_PREVIEW = 3;
const ACTIVE = new Set(["waiting", "in_progress"]);

function QueueRow({ encounter }: { encounter: OhVisitEncounter }) {
  const name = encounter.customer_name?.trim() || encounter.customer_identifier?.trim() || "Unknown client";
  const context = [encounter.employer_name, encounter.department_name].flatMap((value) => (value?.trim() ? [value.trim()] : [])).join(" · ");
  const minutes = queueWaitingMinutes(encounter);
  const inProgress = encounter.status === "in_progress";

  return (
    <li className="border-b border-dash-border/70 last:border-b-0">
      <Link href={ohQueueEntryHref(encounter)} data-testid="oh-home-queue-row" className="group flex items-center gap-3 py-2.5 focus-visible:outline-none">
        <UserIdenticon seed={encounter.customer_uuid || name} name={name} className="size-8 shrink-0 rounded-lg" />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate text-[14px] font-medium text-brand-navy group-hover:text-brand-primary group-focus-visible:underline">{name}</span>
            {isIodVisit(encounter) ? <span className="shrink-0 rounded bg-amber-100 px-1.5 text-[11px] font-semibold text-amber-900">IOD</span> : null}
          </span>
          {context ? <span className="block truncate text-[12.5px] text-dash-muted">{context}</span> : null}
        </span>
        {inProgress ? (
          <span className="shrink-0 text-[12.5px] font-medium text-brand-primary">With {encounter.clinician_name?.trim() || "a clinician"}</span>
        ) : (
          <span className={cn("shrink-0 text-[13px] font-semibold tabular-nums", ACTIVE.has(encounter.status) ? waitTone(minutes).text : "text-dash-muted")}>
            {formatWaitingMinutes(minutes)}
          </span>
        )}
      </Link>
    </li>
  );
}

/** The clinic: who is waiting right now, then which checks have fallen behind. */
export function OhClinicView() {
  const queue = useOhEncounters();
  const compliance = useOhComplianceDashboard();
  const active = (queue.data ?? []).filter((row) => ACTIVE.has(row.status));
  // Why: the longest wait matters most, so the queue preview reads oldest first.
  const ordered = [...active].sort((a, b) => (queueWaitingMinutes(b) ?? 0) - (queueWaitingMinutes(a) ?? 0));
  const shown = ordered.slice(0, QUEUE_PREVIEW);
  const counts = compliance.data;
  const summary = useOhHomeSummary("clinic");

  return (
    <>
      <ViewSection
        title="In the clinic" icon={Stethoscope} countLabel="here now"
        count={queue.isSuccess ? active.length : undefined}
        testId="oh-home-queue"
        action={
          <div className="flex items-center gap-4">
            <Link href={`${ROUTES.occupationalHealthHome}?module=queue`} className="text-[13px] font-medium text-brand-primary hover:underline">
              Open queue
            </Link>
            <OhStartVisitEntry />
          </div>
        }
      >
        <QueryState isLoading={queue.isLoading} isError={queue.isError} onRetry={() => void queue.refetch()} rows={4}>
          {shown.length === 0 ? (
            <p className="border-y border-dash-border/70 py-5 text-[13.5px] text-dash-muted">No visits in the queue.</p>
          ) : (
            <>
              <ul>
                {shown.map((encounter) => (
                  <QueueRow key={encounter.uuid} encounter={encounter} />
                ))}
              </ul>
              {active.length > shown.length ? (
                <p className="pt-2 text-[13px] text-dash-muted">and {active.length - shown.length} more in the queue</p>
              ) : null}
            </>
          )}
        </QueryState>
      </ViewSection>
      <OhClinicCompliance
        counts={counts}
        certificates={summary.data?.certificates}
        isLoading={compliance.isLoading}
        isError={compliance.isError}
        onRetry={() => void compliance.refetch()}
      />
      <OhClinicVisits summary={summary} />
    </>
  );
}
