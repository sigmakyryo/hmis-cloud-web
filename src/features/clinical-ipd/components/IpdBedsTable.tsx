"use client";

import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { IpdBed, IpdBedStatus } from "@/features/clinical-ipd/types/clinical-ipd.types";
import { appFont } from "@/lib/fonts";
import { cn } from "@/lib/utils";

const BED_STATUS_LABEL: Record<IpdBedStatus, string> = {
  available: "Available",
  occupied: "Occupied",
  reserved: "Reserved",
  cleaning: "Cleaning",
  blocked: "Blocked",
  maintenance: "Maintenance",
};

const STATUS_DOT: Record<IpdBedStatus, string> = {
  available: "bg-emerald-600",
  occupied: "bg-brand-primary",
  reserved: "bg-amber-500",
  cleaning: "bg-amber-500",
  blocked: "bg-amber-500",
  maintenance: "bg-red-600",
};

const EDITABLE_STATUSES: IpdBedStatus[] = ["available", "reserved", "cleaning", "blocked", "maintenance"];

const GENDER_LABEL: Record<string, string> = {
  any: "Any",
  male: "Male",
  female: "Female",
};

const HEAD = "px-4 pb-2.5 pt-4 text-left text-[11.5px] font-semibold tracking-[0.06em] text-dash-muted uppercase";

type IpdBedsTableProps = {
  beds: IpdBed[];
  pendingBedUuid: string | null;
  onStatusChange: (bed: IpdBed, status: IpdBedStatus) => void;
};

export function IpdBedsTable({ beds, pendingBedUuid, onStatusChange }: IpdBedsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[36rem] border-collapse" data-testid="ipd-beds-table" aria-label="Beds">
        <thead>
          <tr className="border-b border-dash-border">
            <th scope="col" className={cn(HEAD, "pl-5 md:pl-8")}>
              Bed
            </th>
            <th scope="col" className={HEAD}>
              Who can use it
            </th>
            <th scope="col" className={HEAD}>
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {beds.map((bed) => (
            <tr key={bed.uuid} className="border-b border-dash-border/70 transition-colors hover:bg-dash-canvas/60">
              <td className="py-3.5 pr-4 pl-5 md:pl-8">
                <p className="text-[14px] font-semibold text-brand-navy">{bed.code}</p>
                {bed.label ? <p className="mt-0.5 text-[12.5px] text-dash-muted">{bed.label}</p> : null}
              </td>
              <td className="px-4 py-3.5 text-[13.5px] text-brand-navy">
                {GENDER_LABEL[bed.gender_restriction] ?? bed.gender_restriction}
              </td>
              <td className="px-4 py-3.5">
                <BedStatusControl
                  bed={bed}
                  pending={pendingBedUuid === bed.uuid}
                  onStatusChange={(status) => onStatusChange(bed, status)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BedStatusControl({
  bed,
  pending,
  onStatusChange,
}: {
  bed: IpdBed;
  pending: boolean;
  onStatusChange: (status: IpdBedStatus) => void;
}) {
  const label = BED_STATUS_LABEL[bed.status];
  const dot = <span aria-hidden className={cn("size-1.5 rounded-full", STATUS_DOT[bed.status])} />;

  if (bed.status === "occupied") {
    return (
      <span className="inline-flex items-center gap-2 text-[13.5px] text-brand-navy" title="Discharge or transfer before changing this bed.">
        {dot}
        {label}
      </span>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          disabled={pending}
          className="h-8 gap-2 px-2 text-[13.5px] font-medium text-brand-navy"
          aria-label={`Change status of ${bed.code}, currently ${label}`}
        >
          {dot}
          {label}
          <ChevronDown className="size-3.5 text-dash-muted" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className={cn(appFont.className, "w-44")}>
        {EDITABLE_STATUSES.map((status) => (
          <DropdownMenuItem key={status} disabled={status === bed.status} onClick={() => onStatusChange(status)}>
            <span aria-hidden className={cn("size-1.5 rounded-full", STATUS_DOT[status])} />
            {BED_STATUS_LABEL[status]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
