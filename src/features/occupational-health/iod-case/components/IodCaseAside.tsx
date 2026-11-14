import Link from "next/link";
import type { ReactNode } from "react";

import { DetailPageAsidePanelSection, PAGE_STAT_LABEL_CLASS } from "@/features/app-shell/components/page-layout";
import { IodEmpty } from "@/features/occupational-health/iod-case/components/IodCaseFields";
import type { IodCaseDetail, IodStatutoryPack } from "@/features/occupational-health/iod-case/iod-case.types";
import { initials, isCaseClosed } from "@/features/occupational-health/iod-case/iod-case.utils";
import { formatOhDate, humanizeOhCode } from "@/features/occupational-health/utils/oh-format";
import { ROUTES } from "@/constants/routes";
import { LinkedExposureEvent } from "@/features/exposure-management/components/LinkedExposureEvent";
import { cn } from "@/lib/utils";

function AsideBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3 py-5 first:pt-0 last:pb-0">
      <h2 className={PAGE_STAT_LABEL_CLASS}>{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-[13px]">
      <dt className="shrink-0 text-brand-muted">{label}</dt>
      <dd className="min-w-0 truncate text-right text-brand-navy">{children}</dd>
    </div>
  );
}

type Step = { key: string; label: string; date: string | null; state: "done" | "current" | "todo" };

function progressSteps(item: IodCaseDetail): Step[] {
  const closed = isCaseClosed(item.status);
  const review = item.status === "under_review";
  return [
    { key: "open", label: "Opened", date: item.created_at, state: "done" },
    { key: "review", label: "Under review", date: null, state: closed ? "done" : review ? "current" : "todo" },
    { key: "closed", label: "Closed", date: item.closed_on, state: closed ? "done" : "todo" },
  ];
}

/** A vertical track of where the case stands, ruled rather than boxed. */
function CaseProgress({ item }: { item: IodCaseDetail }) {
  const steps = progressSteps(item);
  return (
    <ol className="relative space-y-4" data-testid="oh-iod-case-progress">
      {steps.map((step, index) => (
        <li key={step.key} className="relative flex gap-3 pl-0.5">
          {index < steps.length - 1 ? (
            <span
              aria-hidden="true"
              className={cn("absolute left-[7px] top-4 h-[calc(100%+0.25rem)] w-px", step.state === "done" ? "bg-brand-primary" : "bg-dash-border")}
            />
          ) : null}
          <span
            aria-hidden="true"
            className={cn(
              "relative z-10 mt-0.5 size-3.5 shrink-0 rounded-full border-2",
              step.state === "done" && "border-brand-primary bg-brand-primary",
              step.state === "current" && "border-brand-primary bg-white",
              step.state === "todo" && "border-dash-border bg-white",
            )}
          />
          <div className="min-w-0 text-[13px]">
            <p className={cn("font-medium", step.state === "todo" ? "text-brand-muted" : "text-brand-navy")}>{step.label}</p>
            {step.date ? <p className="text-xs text-brand-muted">{formatOhDate(step.date.slice(0, 10))}</p> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

type IodCaseAsideProps = { item: IodCaseDetail; pack: IodStatutoryPack | undefined };

export function IodCaseAside({ item, pack }: IodCaseAsideProps) {
  const employee = pack?.employee;
  const name = employee?.full_name.trim() ?? "";
  const medical = pack?.medical;

  return (
    <DetailPageAsidePanelSection data-testid="oh-iod-case-aside" className="order-last xl:order-0">
      <div className="divide-y divide-dash-border/80">
        <AsideBlock title="Case progress">
          <CaseProgress item={item} />
        </AsideBlock>

        <AsideBlock title="Worker">
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-primary/10 text-sm font-semibold text-brand-primary"
            >
              {initials(name)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-brand-navy">{name || "Worker not linked"}</p>
              <p className="truncate text-xs text-brand-muted">{employee?.identifier || "No client ID on record"}</p>
            </div>
          </div>
          <dl className="space-y-1.5">
            <Row label="Employer">{pack?.employer.name || <IodEmpty>—</IodEmpty>}</Row>
            <Row label="Job title">{employee?.job_title || <IodEmpty>—</IodEmpty>}</Row>
            <Row label="Department">{employee?.department || <IodEmpty>—</IodEmpty>}</Row>
            <Row label="Site">{employee?.site || <IodEmpty>—</IodEmpty>}</Row>
            <Row label="Employee no.">{employee?.employee_number || <IodEmpty>—</IodEmpty>}</Row>
            <Row label="With employer since">{formatOhDate(employee?.employment_start_date)}</Row>
          </dl>
          {item.customer_uuid ? (
            <Link href={ROUTES.occupationalHealthEmployee(item.customer_uuid)} className="inline-block text-[13px] font-medium text-brand-primary hover:underline">
              View worker profile
            </Link>
          ) : null}
        </AsideBlock>

        <AsideBlock title="Fitness for work">
          {medical?.fitness_outcome ? (
            <dl className="space-y-1.5">
              <Row label="Outcome">{humanizeOhCode(medical.fitness_outcome)}</Row>
              <Row label="Certificate until">{formatOhDate(medical.certificate_valid_to)}</Row>
              <Row label="First treated">{formatOhDate(medical.first_treatment_date)}</Row>
              {medical.restrictions.length > 0 ? (
                <div className="pt-1 text-[13px]">
                  <p className="mb-1 text-brand-muted">Restrictions</p>
                  <ul className="list-disc space-y-0.5 pl-4 text-brand-navy">
                    {medical.restrictions.map((restriction) => (
                      <li key={restriction}>{restriction}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </dl>
          ) : (
            <p className="text-[13px] text-brand-muted">No current fitness certificate for this worker.</p>
          )}
        </AsideBlock>

        {item.source_visit_uuid && item.source_encounter_uuid ? (
          <AsideBlock title="Linked records">
            <Link
              href={ROUTES.clinicalOpdEncounter(item.source_visit_uuid, item.source_encounter_uuid)}
              className="inline-block text-[13px] font-medium text-brand-primary hover:underline"
              data-testid="oh-iod-case-opd-visit-link"
            >
              Open the OPD visit this was recorded from
            </Link>
          </AsideBlock>
        ) : null}

        <LinkedExposureEvent iodCaseUuid={item.uuid} wrap={(content) => <AsideBlock title="Exposure event">{content}</AsideBlock>} />

        <AsideBlock title="Case details">
          <dl className="space-y-1.5">
            <Row label="Reference">{item.she_reference || <IodEmpty>Not set</IodEmpty>}</Row>
            <Row label="Claim reference">{item.claim_reference || <IodEmpty>Not set</IodEmpty>}</Row>
            <Row label="Recorded">{formatOhDate(item.created_at?.slice(0, 10))}</Row>
            <Row label="Last updated">{formatOhDate(item.updated_at?.slice(0, 10))}</Row>
          </dl>
        </AsideBlock>
      </div>
    </DetailPageAsidePanelSection>
  );
}
