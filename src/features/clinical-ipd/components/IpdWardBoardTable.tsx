"use client";

import { format, parseISO } from "date-fns";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import type { IpdBedStatus, IpdCensusRow, IpdWardClass } from "@/features/clinical-ipd/types/clinical-ipd.types";
import { cn } from "@/lib/utils";

const BED_STATUS_LABEL: Record<IpdBedStatus, string> = {
  available: "Available",
  occupied: "Occupied",
  blocked: "Blocked",
  maintenance: "Maintenance",
  reserved: "Reserved",
  cleaning: "Cleaning",
};

const STATUS_DOT: Record<IpdBedStatus, string> = {
  available: "bg-emerald-600",
  occupied: "bg-brand-primary",
  blocked: "bg-amber-500",
  maintenance: "bg-red-600",
  reserved: "bg-amber-500",
  cleaning: "bg-amber-500",
};

const WARD_CLASS_LABEL: Record<IpdWardClass, string> = {
  general: "General",
  icu: "ICU",
  maternity: "Maternity",
  other: "Other",
};

const HEAD = "px-4 pb-2.5 pt-4 text-left text-[11.5px] font-semibold tracking-[0.06em] text-dash-muted uppercase";

function admittedLabel(value: string): string {
  try {
    return format(parseISO(value), "d MMM, HH:mm");
  } catch {
    return value;
  }
}

function rowHref(row: IpdCensusRow): string | null {
  if (row.stay?.visit_uuid && row.stay.encounter_uuid) {
    return ROUTES.clinicalIpdEncounter(row.stay.visit_uuid, row.stay.encounter_uuid);
  }
  return null;
}

function BoardRow({
  row,
  onTransfer,
  onDischarge,
  onAdmit,
  onOpen,
}: {
  row: IpdCensusRow;
  onTransfer: (row: IpdCensusRow) => void;
  onDischarge: (row: IpdCensusRow) => void;
  onAdmit: (row: IpdCensusRow) => void;
  onOpen: (href: string) => void;
}) {
  const href = rowHref(row);
  const patient = row.stay?.customer;
  const occupied = Boolean(row.stay);
  const canAdmit = row.bed_status === "available";

  return (
    <tr
      className={cn(
        "group border-b border-dash-border/70 transition-colors hover:bg-dash-canvas/60",
        (href || canAdmit) && "cursor-pointer",
      )}
      onClick={() => {
        if (href) onOpen(href);
        else if (canAdmit) onAdmit(row);
      }}
    >
      <td className="py-3.5 pr-4 pl-5 md:pl-8">
        <p className="text-[14px] font-semibold text-brand-navy">{row.ward_code}-{row.bed_code}</p>
        <p className="mt-0.5 text-[12.5px] text-dash-muted">
          {row.ward_name} · {WARD_CLASS_LABEL[row.ward_class]}
        </p>
      </td>
      <td className="px-4 py-3.5">
        {patient ? (
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold text-brand-navy">{patient.display_name}</p>
            <p className="mt-0.5 truncate text-[12.5px] text-dash-muted">
              {[patient.file_number, row.stay?.admitted_at ? admittedLabel(row.stay.admitted_at) : ""].filter(Boolean).join(" · ")}
            </p>
          </div>
        ) : (
          <span className="text-[13px] text-dash-muted">Empty</span>
        )}
      </td>
      <td className="hidden px-4 py-3.5 text-[13px] text-brand-slate lg:table-cell">
        {row.stay?.clinician_name || ""}
      </td>
      <td className="px-4 py-3.5">
        <span className="inline-flex items-center gap-2 text-[13px] font-medium whitespace-nowrap text-brand-navy">
          <span aria-hidden className={cn("size-2 rounded-full", STATUS_DOT[row.bed_status])} />
          {BED_STATUS_LABEL[row.bed_status]}
        </span>
      </td>
      <td className="py-3.5 pr-5 pl-4 text-right md:pr-8">
        <div className="inline-flex items-center justify-end gap-3" onClick={(event) => event.stopPropagation()}>
          {occupied ? (
            <>
              <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => onTransfer(row)}>
                Transfer
              </Button>
              <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => onDischarge(row)}>
                Discharge
              </Button>
            </>
          ) : null}
          {href ? (
            <Link
              href={href}
              className="inline-flex items-center gap-1 text-[13px] font-semibold text-brand-primary opacity-70 transition-opacity group-hover:opacity-100 hover:underline focus-visible:opacity-100 focus-visible:underline focus-visible:outline-none"
            >
              Open
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
          ) : null}
          {canAdmit ? (
            <button
              type="button"
              onClick={() => onAdmit(row)}
              className="inline-flex items-center gap-1 text-[13px] font-semibold text-brand-primary opacity-70 transition-opacity group-hover:opacity-100 hover:underline focus-visible:opacity-100 focus-visible:underline focus-visible:outline-none"
            >
              Admit
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </button>
          ) : null}
        </div>
      </td>
    </tr>
  );
}

/** Census as a list: bed, who is in it, and what to do next. */
export function IpdWardBoardTable({
  rows,
  onTransfer,
  onDischarge,
  onAdmit,
}: {
  rows: IpdCensusRow[];
  onTransfer: (row: IpdCensusRow) => void;
  onDischarge: (row: IpdCensusRow) => void;
  onAdmit: (row: IpdCensusRow) => void;
}) {
  const router = useRouter();

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[40rem] border-collapse" data-testid="ipd-ward-board-table">
        <thead>
          <tr className="border-b border-dash-border">
            <th scope="col" className={cn(HEAD, "pl-5 md:pl-8")}>Bed</th>
            <th scope="col" className={HEAD}>Patient</th>
            <th scope="col" className={cn(HEAD, "hidden lg:table-cell")}>Clinician</th>
            <th scope="col" className={HEAD}>Status</th>
            <th scope="col" className={cn(HEAD, "pr-5 text-right md:pr-8")}>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <BoardRow
              key={row.bed_uuid}
              row={row}
              onTransfer={onTransfer}
              onDischarge={onDischarge}
              onAdmit={onAdmit}
              onOpen={(href) => router.push(href)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
