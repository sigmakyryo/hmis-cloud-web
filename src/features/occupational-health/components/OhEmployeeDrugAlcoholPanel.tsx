"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { ImmStatusBadge } from "@/app/(app)/immunizations/_components/shared/ImmRecordTable";
import { LoadError, QuietLoading } from "@/app/(app)/immunizations/_components/shared/QuietLoading";
import {
  FITNESS_LABEL,
  REASON_LABEL,
  TEST_STATUS_LABEL,
  errorText,
  fmtDate,
  fmtDateTime,
  label,
} from "@/app/(app)/drug-alcohol/_components/shared/da-format";
import { DaTestSheet } from "@/app/(app)/drug-alcohol/_components/shared/DaTestSheet";
import { fetchDaPatient } from "@/features/occupational-health/services/drug-alcohol.service";

/** Employee record tab: fitness status, tests and return-to-duty cases. */
export function OhEmployeeDrugAlcoholPanel({ customerUuid }: { customerUuid: string }) {
  const [open, setOpen] = useState<string | null>(null);
  const query = useQuery({ queryKey: ["oh-da", "patient", customerUuid], queryFn: () => fetchDaPatient(customerUuid) });
  if (query.isLoading) return <QuietLoading />;
  if (query.isError || !query.data) return <LoadError>{errorText(query.error, "Could not load drug & alcohol records.")}</LoadError>;
  const { status, tests, rtd_cases: cases } = query.data;

  return (
    <div className="space-y-4 px-4 py-4 text-[13px] md:px-6" data-testid="oh-employee-drug-alcohol">
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-semibold text-brand-navy">Drug & alcohol status</span>
        {status ? (
          <ImmStatusBadge
            status={status.fit_for_safety_critical ? "cleared" : "not_cleared"}
            label={status.fit_for_safety_critical ? "Fit for duty" : label(FITNESS_LABEL, status.status)}
          />
        ) : (
          <span className="text-dash-muted">No tests yet</span>
        )}
        {status?.restricted_until ? <span className="text-dash-muted">until {fmtDateTime(status.restricted_until)}</span> : null}
      </div>
      {cases.length > 0 ? (
        <div>
          <p className="mb-1 font-medium text-brand-navy">Return to duty</p>
          {cases.map((c) => (
            <p key={c.uuid} className="text-brand-slate">
              Opened {fmtDate(c.referred_at)} · {c.status.replace(/_/g, " ")} · follow-ups {c.followups.filter((f) => f.status === "done").length} of{" "}
              {c.followup_tests_required}
            </p>
          ))}
        </div>
      ) : null}
      {tests.length === 0 ? (
        <p className="text-dash-muted">No drug or alcohol tests recorded. Start one from a visit.</p>
      ) : (
        <table className="w-full text-left">
          <thead className="text-[12px] text-dash-muted">
            <tr className="border-b border-dash-border">
              <th className="py-1.5 font-medium">Reference</th>
              <th className="py-1.5 font-medium">Why</th>
              <th className="py-1.5 font-medium">Date</th>
              <th className="py-1.5 font-medium">Stage</th>
              <th className="py-1.5 font-medium">Fitness</th>
            </tr>
          </thead>
          <tbody>
            {tests.map((t) => (
              <tr
                key={t.uuid}
                className="cursor-pointer border-b border-dash-border/60 hover:bg-brand-tint/50"
                onClick={() => setOpen(t.uuid)}
              >
                <td className="py-1.5 font-medium text-brand-primary">{t.reference}</td>
                <td className="py-1.5">{label(REASON_LABEL, t.reason)}</td>
                <td className="py-1.5">{fmtDate(t.created_at)}</td>
                <td className="py-1.5">
                  <ImmStatusBadge status={t.status} label={label(TEST_STATUS_LABEL, t.status)} />
                </td>
                <td className="py-1.5">{label(FITNESS_LABEL, t.fitness_outcome)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {open ? <DaTestSheet uuid={open} onClose={() => setOpen(null)} /> : null}
    </div>
  );
}
