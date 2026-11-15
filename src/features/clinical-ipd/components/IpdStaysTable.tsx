"use client";

import { format, parseISO } from "date-fns";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { ROUTES } from "@/constants/routes";
import type { IpdStay, IpdStayStatus } from "@/features/clinical-ipd/types/clinical-ipd.types";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<IpdStayStatus, string> = {
  planned: "Planned",
  admitted: "Admitted",
  transferred: "Transferred",
  discharged: "Discharged",
  cancelled: "Cancelled",
};

const STATUS_DOT: Record<IpdStayStatus, string> = {
  planned: "bg-amber-500",
  admitted: "bg-brand-primary",
  transferred: "bg-amber-500",
  discharged: "bg-dash-muted",
  cancelled: "bg-red-600",
};

const SOURCE_LABEL: Record<IpdStay["admission_source"], string> = {
  direct: "Direct",
  opd_transfer: "From clinic",
  theatre_conversion: "From theatre",
};

const HEAD = "px-4 pb-2.5 pt-4 text-left text-[11.5px] font-semibold tracking-[0.06em] text-dash-muted uppercase";

function whenLabel(value: string): string {
  try {
    return format(parseISO(value), "d MMM, HH:mm");
  } catch {
    return value;
  }
}

type IpdStaysTableProps = {
  stays: IpdStay[];
};

export function IpdStaysTable({ stays }: IpdStaysTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[40rem] border-collapse" data-testid="ipd-stays-table" aria-label="Stays">
        <thead>
          <tr className="border-b border-dash-border">
            <th scope="col" className={cn(HEAD, "pl-5 md:pl-8")}>
              Patient
            </th>
            <th scope="col" className={HEAD}>
              Ward
            </th>
            <th scope="col" className={cn(HEAD, "hidden lg:table-cell")}>
              Clinician
            </th>
            <th scope="col" className={HEAD}>
              Status
            </th>
            <th scope="col" className={cn(HEAD, "pr-5 text-right md:pr-8")}>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {stays.map((stay) => (
            <tr key={stay.uuid} className="group border-b border-dash-border/70 transition-colors hover:bg-dash-canvas/60">
              <td className="py-3.5 pr-4 pl-5 md:pl-8">
                <p className="text-[14px] font-semibold text-brand-navy">{stay.customer_name}</p>
                <p className="mt-0.5 text-[12.5px] text-dash-muted">
                  {SOURCE_LABEL[stay.admission_source]} · {whenLabel(stay.admitted_at)}
                </p>
              </td>
              <td className="px-4 py-3.5">
                <p className="text-[13.5px] text-brand-navy">{stay.current_ward_name ?? "No ward"}</p>
                <p className="mt-0.5 text-[12.5px] text-dash-muted">{stay.current_bed_code ?? "No bed"}</p>
              </td>
              <td className="hidden px-4 py-3.5 text-[13px] text-brand-slate lg:table-cell">
                {stay.admitting_clinician_name}
              </td>
              <td className="px-4 py-3.5">
                <span className="inline-flex items-center gap-2 text-[13px] font-medium whitespace-nowrap text-brand-navy">
                  <span aria-hidden className={cn("size-2 rounded-full", STATUS_DOT[stay.status])} />
                  {STATUS_LABEL[stay.status]}
                </span>
              </td>
              <td className="py-3.5 pr-5 pl-4 text-right md:pr-8">
                <Link
                  href={ROUTES.clinicalIpdEncounter(stay.visit_uuid, stay.encounter_uuid)}
                  className="inline-flex items-center gap-1 text-[13px] font-semibold text-brand-primary opacity-70 transition-opacity group-hover:opacity-100 hover:underline focus-visible:opacity-100 focus-visible:underline focus-visible:outline-none"
                >
                  Open
                  <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
