import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type ListPageTableSectionProps = {
  children: ReactNode;
  className?: string;
};

const filledTableSectionClass = [
  "[[data-list-fill]_&]:flex",
  "[[data-list-fill]_&]:min-h-0",
  "[[data-list-fill]_&]:flex-1",
  "[[data-list-fill]_&]:flex-col",
  "[[data-list-fill]_&]:overflow-hidden",
  "[[data-list-fill]_&]:[&>[data-list-table]]:flex",
  "[[data-list-fill]_&]:[&>[data-list-table]]:min-h-0",
  "[[data-list-fill]_&]:[&>[data-list-table]]:flex-1",
  "[[data-list-fill]_&]:[&>[data-list-table]]:flex-col",
  "[[data-list-fill]_&]:[&>[data-list-table]]:overflow-hidden",
  "[[data-list-fill]_&]:[&_[data-list-table-scroll]]:min-h-0",
  "[[data-list-fill]_&]:[&_[data-list-table-scroll]]:flex-1",
  "[[data-list-fill]_&]:[&_[data-list-table-scroll]]:!overflow-auto",
  "[[data-list-fill]_&]:[&_thead]:sticky",
  "[[data-list-fill]_&]:[&_thead]:top-0",
  "[[data-list-fill]_&]:[&_thead]:z-10",
  "[[data-list-fill]_&]:[&_thead]:bg-white",
  "[[data-list-fill]_&]:[&_th]:bg-white",
].join(" ");

export function ListPageTableSection({
  children,
  className,
}: ListPageTableSectionProps) {
  return (
    <div data-list-band className={cn(filledTableSectionClass, className)}>
      {children}
    </div>
  );
}

type ListPageDataSectionsStackProps = {
  children: ReactNode;
  className?: string;
};

/** Groups stats and toolbar sections with consistent spacing. */
export function ListPageDataSectionsStack({
  children,
  className,
}: ListPageDataSectionsStackProps) {
  return (
    <div
      data-list-band
      className={cn("[[data-list-fill]_&]:flex [[data-list-fill]_&]:min-h-0 [[data-list-fill]_&]:flex-1 [[data-list-fill]_&]:flex-col", className)}
    >
      {children}
    </div>
  );
}
