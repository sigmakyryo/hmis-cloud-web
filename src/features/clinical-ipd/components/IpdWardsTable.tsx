"use client";

import { ArrowRight } from "lucide-react";

import type { IpdWard, IpdWardClass } from "@/features/clinical-ipd/types/clinical-ipd.types";
import { cn } from "@/lib/utils";

const WARD_CLASS_LABEL: Record<IpdWardClass, string> = {
  general: "General",
  icu: "ICU",
  maternity: "Maternity",
  other: "Other",
};

const HEAD = "px-4 pb-2.5 pt-4 text-left text-[11.5px] font-semibold tracking-[0.06em] text-dash-muted uppercase";

type IpdWardsTableProps = {
  wards: IpdWard[];
  onOpen: (ward: IpdWard) => void;
};

export function IpdWardsTable({ wards, onOpen }: IpdWardsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[32rem] border-collapse" data-testid="ipd-wards-table" aria-label="Wards">
        <thead>
          <tr className="border-b border-dash-border">
            <th scope="col" className={cn(HEAD, "pl-5 md:pl-8")}>
              Ward
            </th>
            <th scope="col" className={HEAD}>
              Class
            </th>
            <th scope="col" className={cn(HEAD, "pr-5 text-right md:pr-8")}>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {wards.map((ward) => (
            <tr
              key={ward.uuid}
              className="group cursor-pointer border-b border-dash-border/70 transition-colors hover:bg-dash-canvas/60"
              onClick={() => onOpen(ward)}
            >
              <td className="py-3.5 pr-4 pl-5 md:pl-8">
                <p className="text-[14px] font-semibold text-brand-navy">{ward.name}</p>
                <p className="mt-0.5 text-[12.5px] text-dash-muted">{ward.code}</p>
              </td>
              <td className="px-4 py-3.5 text-[13.5px] text-brand-navy">{WARD_CLASS_LABEL[ward.ward_class]}</td>
              <td className="py-3.5 pr-5 pl-4 text-right md:pr-8">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onOpen(ward);
                  }}
                  className="inline-flex items-center gap-1 text-[13px] font-semibold text-brand-primary hover:underline"
                >
                  Open
                  <ArrowRight className="size-3.5" aria-hidden />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
