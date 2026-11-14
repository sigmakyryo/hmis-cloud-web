"use client";

import Link from "next/link";
import { ChevronRight, ExternalLink, FileDown, MoreHorizontal, Pencil, RotateCcw, StickyNote } from "lucide-react";

import { PrimaryButton, SecondaryButton } from "@/components/ui/app-buttons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  DetailPageDescription,
  DetailPageHeaderSection,
  DetailPageTitle,
} from "@/features/app-shell/components/page-layout";
import { OhStatusChip } from "@/features/occupational-health/components/OhStatusChip";
import type { IodCaseDetail, IodStatutoryPack } from "@/features/occupational-health/iod-case/iod-case.types";
import {
  caseReference,
  incidentTitle,
  isCaseClosed,
  isLostTime,
  iodStatusLabel,
} from "@/features/occupational-health/iod-case/iod-case.utils";
import { iodPackPdfUrl } from "@/features/occupational-health/services/oh-ext.service";
import { humanizeOhCode } from "@/features/occupational-health/utils/oh-format";
import { ROUTES } from "@/constants/routes";
import { appFont } from "@/lib/fonts";

type IodCaseHeaderProps = {
  item: IodCaseDetail;
  pack: IodStatutoryPack | undefined;
  isSaving: boolean;
  onEdit: () => void;
  onAddNote: () => void;
  onClose: () => void;
  onReopen: () => void;
  onMarkUnderReview: () => void;
  onCopyLink: () => void;
};

/** Title, status and the case actions, kept together at the top so nothing has to be hunted for. */
export function IodCaseHeader({
  item,
  pack,
  isSaving,
  onEdit,
  onAddNote,
  onClose,
  onReopen,
  onMarkUnderReview,
  onCopyLink,
}: IodCaseHeaderProps) {
  const closed = isCaseClosed(item.status);
  const worker = pack?.employee.full_name.trim() ?? "";
  const context = [pack?.employee.job_title, pack?.employer.name, pack?.employee.site].filter(Boolean).join(" · ");
  const canOpenVisit = Boolean(item.visit_uuid && item.encounter_uuid);

  return (
    <DetailPageHeaderSection className="space-y-3 border-b-0">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-[13px] text-brand-muted">
        <Link href={ROUTES.occupationalHealthInjuries} className="hover:text-brand-navy">
          Injuries on duty
        </Link>
        <ChevronRight className="size-3.5" aria-hidden="true" />
        <span className="font-medium text-brand-navy">{caseReference(item)}</span>
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <DetailPageTitle className="whitespace-normal">
            {incidentTitle(item)}
          </DetailPageTitle>
          <DetailPageDescription>
            {item.customer_uuid ? (
              <Link
                href={ROUTES.occupationalHealthEmployee(item.customer_uuid)}
                className="font-medium text-brand-navy hover:underline"
              >
                {worker || "View worker"}
              </Link>
            ) : (
              <span className="font-medium text-brand-navy">{worker || "Worker not linked"}</span>
            )}
            {context ? ` · ${context}` : ""}
          </DetailPageDescription>
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <OhStatusChip value={item.status} label={iodStatusLabel(item.status)} />
            <OhStatusChip value={item.severity || "minor"} label={`${humanizeOhCode(item.severity || "minor")} severity`} />
            {isLostTime(item) ? <OhStatusChip value="alert" label="Lost-time injury" /> : null}
            {!item.work_related ? <OhStatusChip value="deferred" label="Not work related" /> : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2" data-testid="oh-iod-case-actions">
          {closed ? (
            <SecondaryButton type="button" size="sm" onClick={onReopen} disabled={isSaving}>
              <RotateCcw className="size-3.5" aria-hidden="true" /> Reopen case
            </SecondaryButton>
          ) : (
            <PrimaryButton type="button" size="sm" onClick={onClose} disabled={isSaving}>
              Close case
            </PrimaryButton>
          )}
          <SecondaryButton type="button" size="sm" onClick={onEdit}>
            <Pencil className="size-3.5" aria-hidden="true" /> Edit case
          </SecondaryButton>
          <SecondaryButton type="button" size="sm" onClick={onAddNote}>
            <StickyNote className="size-3.5" aria-hidden="true" /> Add note
          </SecondaryButton>
          <SecondaryButton asChild size="sm">
            <a href={iodPackPdfUrl(item.uuid)} target="_blank" rel="noreferrer">
              <FileDown className="size-3.5" aria-hidden="true" /> Notification pack
            </a>
          </SecondaryButton>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SecondaryButton type="button" size="sm" aria-label="More actions" className="px-2">
                <MoreHorizontal className="size-4" aria-hidden="true" />
              </SecondaryButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className={appFont.className}>
              {item.status === "open" ? (
                <DropdownMenuItem onSelect={onMarkUnderReview}>Mark as under review</DropdownMenuItem>
              ) : null}
              {canOpenVisit ? (
                <DropdownMenuItem asChild>
                  <Link href={ROUTES.occupationalHealthEncounter(item.visit_uuid ?? "", item.encounter_uuid ?? "")}>
                    <ExternalLink className="mr-2 size-3.5" aria-hidden="true" /> Open visit workspace
                  </Link>
                </DropdownMenuItem>
              ) : null}
              {item.customer_uuid ? (
                <DropdownMenuItem asChild>
                  <Link href={ROUTES.occupationalHealthEmployee(item.customer_uuid)}>View worker profile</Link>
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={onCopyLink}>Copy link to this case</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </DetailPageHeaderSection>
  );
}
