import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ListPagePaginationProps = {
  page: number;
  pageSize: number;
  totalCount: number;
  hasPrevious: boolean;
  hasNext: boolean;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
  className?: string;
};

function buildPageItems(page: number, totalPages: number): Array<number | "ellipsis"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const items: Array<number | "ellipsis"> = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);

  if (start > 2) {
    items.push("ellipsis");
  }

  for (let number = start; number <= end; number += 1) {
    items.push(number);
  }

  if (end < totalPages - 1) {
    items.push("ellipsis");
  }

  items.push(totalPages);
  return items;
}

export function ListPagePagination({
  page,
  pageSize,
  totalCount,
  hasPrevious,
  hasNext,
  onPageChange,
  isLoading = false,
  className,
}: ListPagePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const start = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalCount);
  const pageItems = buildPageItems(page, totalPages);

  const pageButtonClass =
    "h-6 min-w-6 rounded-md px-1.5 text-[12px] tabular-nums";

  return (
    <div
      className={cn(
        "flex h-9 shrink-0 items-center justify-between gap-3 border-t border-dash-border bg-white px-3 md:px-4",
        className,
      )}
    >
      <p className="min-w-0 truncate text-[12px] text-dash-muted">
        <span className="font-medium tabular-nums text-brand-navy">
          {start}–{end}
        </span>
        {" of "}
        <span className="tabular-nums">{totalCount}</span>
      </p>
      <div className="flex shrink-0 items-center gap-0.5">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label="Previous"
          className="size-6 rounded-md px-0 text-brand-slate hover:bg-dash-canvas"
          disabled={!hasPrevious || isLoading}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="size-3.5" />
        </Button>
        {pageItems.map((item, index) =>
          item === "ellipsis" ? (
            <span
              key={`ellipsis-${index}`}
              className="px-0.5 text-[12px] text-dash-muted"
            >
              …
            </span>
          ) : (
            <Button
              key={item}
              type="button"
              variant="ghost"
              size="sm"
              disabled={isLoading}
              className={cn(
                pageButtonClass,
                item === page
                  ? "bg-brand-primary text-white hover:bg-brand-primary-hover hover:text-white"
                  : "text-brand-slate hover:bg-dash-canvas",
              )}
              onClick={() => onPageChange(item)}
            >
              {item}
            </Button>
          ),
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label="Next"
          className="size-6 rounded-md px-0 text-brand-slate hover:bg-dash-canvas"
          disabled={!hasNext || isLoading}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
