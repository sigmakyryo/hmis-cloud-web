"use client";

import { CheckCircle2, CircleAlert, FileDown } from "lucide-react";
import { useState } from "react";

import { PrimaryButton, SecondaryButton } from "@/components/ui/app-buttons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IodEmpty, IodSection } from "@/features/occupational-health/iod-case/components/IodCaseFields";
import type { IodCaseDetail, IodNotice, IodStatutoryPack } from "@/features/occupational-health/iod-case/iod-case.types";
import { missingFieldLabel } from "@/features/occupational-health/iod-case/iod-case.utils";
import { useUpdateIodCase } from "@/features/occupational-health/iod-case/use-iod-case";
import { iodPackPdfUrl } from "@/features/occupational-health/services/oh-ext.service";
import { formatOhDate, todayIsoDate } from "@/features/occupational-health/utils/oh-format";

type TrackedColumn = "employer_notified_on" | "authority_notified_on";

const TRACKING: Record<string, { column: TrackedColumn; sentLabel: string }> = {
  workers_compensation_claim: { column: "employer_notified_on", sentLabel: "Report sent" },
  osh_incident_notification: { column: "authority_notified_on", sentLabel: "Notified" },
};

/** Date a notice went out, recorded once and changeable. Recording it also writes to the timeline. */
function SentTracker({ item, column, sentLabel }: { item: IodCaseDetail; column: TrackedColumn; sentLabel: string }) {
  const update = useUpdateIodCase(item.uuid, "Notice date saved");
  const current = item[column];
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState(current ?? todayIsoDate());

  if (!editing) {
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
        {current ? (
          <span className="text-brand-navy">
            {sentLabel} <span className="font-medium">{formatOhDate(current)}</span>
          </span>
        ) : (
          <IodEmpty>Not sent yet</IodEmpty>
        )}
        <button type="button" onClick={() => setEditing(true)} className="font-medium text-brand-primary hover:underline">
          {current ? "Change date" : "Record as sent"}
        </button>
      </div>
    );
  }

  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        update.mutate({ [column]: date || null }, { onSuccess: () => setEditing(false) });
      }}
    >
      <div className="space-y-1">
        <Label htmlFor={`iod-${column}`} className="text-xs">
          Date sent
        </Label>
        <Input id={`iod-${column}`} type="date" max={todayIsoDate()} value={date} onChange={(e) => setDate(e.target.value)} className="h-8 w-40" />
      </div>
      <PrimaryButton type="submit" size="sm" disabled={update.isPending || !date}>
        Save
      </PrimaryButton>
      <SecondaryButton type="button" size="sm" onClick={() => setEditing(false)}>
        Cancel
      </SecondaryButton>
    </form>
  );
}

function NoticeRow({ item, notice }: { item: IodCaseDetail; notice: IodNotice }) {
  const tracking = TRACKING[notice.code];
  return (
    <li className="space-y-2.5 py-4 first:pt-0" data-testid={`oh-iod-notice-${notice.code}`}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h3 className="text-sm font-semibold text-brand-navy">{notice.label}</h3>
        <span className={notice.likely_required ? "text-xs font-medium text-amber-800" : "text-xs text-brand-muted"}>
          {notice.likely_required ? "Likely required" : "Not indicated for this case"}
        </span>
      </div>
      {notice.ready ? (
        <p className="flex items-center gap-1.5 text-[13px] text-emerald-800">
          <CheckCircle2 className="size-4" aria-hidden="true" /> All the data this notice needs is on the case.
        </p>
      ) : (
        <div className="space-y-1.5">
          <p className="flex items-center gap-1.5 text-[13px] text-amber-900">
            <CircleAlert className="size-4" aria-hidden="true" /> Still needed before you can submit:
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {notice.missing_fields.map((field) => (
              <li key={field} className="rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs text-amber-900">
                {missingFieldLabel(field)}
              </li>
            ))}
          </ul>
        </div>
      )}
      {tracking ? <SentTracker item={item} column={tracking.column} sentLabel={tracking.sentLabel} /> : null}
    </li>
  );
}

function ClaimReference({ item }: { item: IodCaseDetail }) {
  const update = useUpdateIodCase(item.uuid, "Claim reference saved");
  const [value, setValue] = useState(item.claim_reference);
  const dirty = value.trim() !== item.claim_reference;
  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (dirty) update.mutate({ claim_reference: value.trim() });
      }}
    >
      <div className="space-y-1">
        <Label htmlFor="iod-claim-reference" className="text-xs">
          Compensation claim reference
        </Label>
        <Input id="iod-claim-reference" value={value} maxLength={255} onChange={(e) => setValue(e.target.value)} className="h-8 w-64" />
      </div>
      <SecondaryButton type="submit" size="sm" disabled={!dirty || update.isPending}>
        Save
      </SecondaryButton>
    </form>
  );
}

type IodCaseNotificationsTabProps = { item: IodCaseDetail; pack: IodStatutoryPack | undefined; packFailed: boolean };

export function IodCaseNotificationsTab({ item, pack, packFailed }: IodCaseNotificationsTabProps) {
  return (
    <div className="divide-y divide-dash-border/80" data-testid="oh-iod-case-notifications">
      <IodSection
        title="Statutory notices"
        description="What the law may require for an injury on duty, and whether the case has the data for it."
        action={
          <SecondaryButton asChild size="sm">
            <a href={iodPackPdfUrl(item.uuid)} target="_blank" rel="noreferrer">
              <FileDown className="size-3.5" aria-hidden="true" /> Download pack
            </a>
          </SecondaryButton>
        }
      >
        {packFailed ? (
          <p className="text-[13px] text-red-700">Could not load the notice checklist. Link this worker to an employment record and try again.</p>
        ) : null}
        <ul className="divide-y divide-dash-border/60">
          {(pack?.notifications ?? []).map((notice) => (
            <NoticeRow key={notice.code} item={item} notice={notice} />
          ))}
        </ul>
        {pack ? <p className="mt-4 text-xs text-brand-muted">{pack.notice}</p> : null}
      </IodSection>
      <IodSection title="Claim tracking" description="Quote this reference when you follow up with the insurer or compensation fund.">
        <ClaimReference item={item} />
      </IodSection>
    </div>
  );
}
