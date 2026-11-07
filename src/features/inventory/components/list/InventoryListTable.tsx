"use client";

import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type InventoryListTableColumn<T> = {
  key: string;
  label: string;
  headerClassName?: string;
  cellClassName?: string;
  render: (item: T) => ReactNode;
};

type InventoryListTableProps<T> = {
  items: T[];
  columns: InventoryListTableColumn<T>[];
  getRowKey: (item: T) => string;
  onRowClick?: (item: T) => void;
  footer?: ReactNode;
  className?: string;
  compact?: boolean;
};

export function InventoryListTable<T>({
  items,
  columns,
  getRowKey,
  onRowClick,
  footer,
  className,
}: InventoryListTableProps<T>) {
  const cellPadding = "px-3 py-1.5 align-middle";

  return (
    <div className={cn("w-full overflow-hidden", className)}>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-[13px] leading-tight">
          <thead>
            <tr className="border-b border-dash-border bg-white">
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={cn(
                    cellPadding,
                    "h-8 whitespace-nowrap border-b border-dash-border text-left text-[12px] font-medium text-dash-muted",
                    column.headerClassName,
                  )}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={getRowKey(item)}
                className={cn(
                  "border-b border-dash-border/70 transition-colors last:border-b-0 hover:bg-brand-tint/50",
                  onRowClick && "cursor-pointer",
                )}
                onClick={() => onRowClick?.(item)}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      cellPadding,
                      "text-[13px] text-brand-slate",
                      column.cellClassName,
                    )}
                  >
                    {column.render(item)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {footer ? (
        <div className="border-t border-dash-border px-3 py-2">
          {footer}
        </div>
      ) : null}
    </div>
  );
}

type InventoryListTableSkeletonColumn = {
  key: string;
  label: string;
  headerClassName?: string;
};

type InventoryListTableSkeletonProps = {
  columns: InventoryListTableSkeletonColumn[];
  rows?: number;
  className?: string;
};

export function InventoryListTableSkeleton({
  columns,
  rows = 8,
  className,
}: InventoryListTableSkeletonProps) {
  return (
    <div
      className={cn("w-full overflow-hidden", className)}
      data-testid="inventory-list-table-skeleton"
    >
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-[13px] leading-tight">
          <thead>
            <tr className="border-b border-dash-border bg-white">
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={cn(
                    "h-8 whitespace-nowrap border-b border-dash-border px-3 text-left align-middle text-[12px] font-medium text-dash-muted",
                    column.headerClassName,
                  )}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <tr key={rowIndex} className="border-b border-dash-border/70 last:border-b-0">
                {columns.map((column) => (
                  <td key={column.key} className="px-3 py-1.5 align-middle">
                    <Skeleton className="h-3.5 w-24" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type InventoryListPaginationProps = {
  page: number;
  pageSize: number;
  totalCount: number;
  hasPrevious: boolean;
  hasNext: boolean;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
};

export function InventoryListPagination({
  page,
  pageSize,
  totalCount,
  hasPrevious,
  hasNext,
  onPageChange,
  isLoading = false,
}: InventoryListPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const start = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalCount);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[13px] tabular-nums text-brand-muted">
        Showing {start}–{end} of {totalCount}
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!hasPrevious || isLoading}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </Button>
        <span className="text-sm text-brand-slate">
          Page {page} of {totalPages}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!hasNext || isLoading}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
