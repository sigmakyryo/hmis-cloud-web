import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import { ListPageDataTableHeaderCell } from "@/features/app-shell/components/page-layout";
import type { OhSort } from "@/features/occupational-health/components/dashboard/oh-table";
import { cn } from "@/lib/utils";

/** Column header that sorts on click and exposes aria-sort. */
export function OhSortHeader<K extends string>({
  label,
  column,
  sort,
  onSort,
  className,
}: {
  label: string;
  column: K;
  sort: OhSort<K>;
  onSort: (key: K) => void;
  className?: string;
}) {
  const active = sort.key === column;
  const Icon = !active ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <ListPageDataTableHeaderCell
      className={className}
      aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
    >
      <button
        type="button"
        className={cn(
          "-mx-1 inline-flex items-center gap-1 rounded px-1 py-0.5 hover:text-brand-navy focus-visible:outline-2 focus-visible:outline-brand-primary",
          active && "text-brand-navy",
        )}
        onClick={() => onSort(column)}
      >
        {label}
        <Icon className="size-3" aria-hidden />
      </button>
    </ListPageDataTableHeaderCell>
  );
}
