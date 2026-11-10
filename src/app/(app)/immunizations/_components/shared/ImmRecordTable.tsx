"use client";

import type { ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import {
  ListPageDataTable,
  ListPageDataTableBody,
  ListPageDataTableHeader,
  ListPageDataTableHeaderCell,
  ListPageDataTableHeaderRow,
  ListPagePagination,
  ListPageTableSection,
} from "@/features/app-shell/components/page-layout";
import { cn } from "@/lib/utils";
import type { ImmListControls } from "./use-imm-list";

export type ImmColumn =
  | string
  | {
      label: string;
      sortKey?: string;
      align?: "right";
      header?: ReactNode;
      className?: string;
    };

function columnLabel(column: ImmColumn): string {
  return typeof column === "string" ? column : column.label;
}

function SortHeader({ label, sortKey, list, alignRight }: { label: string; sortKey: string; list: ImmListControls; alignRight: boolean }) {
  const active = list.sort?.key === sortKey ? list.sort.direction : null;
  const Icon = active === "asc" ? ArrowUp : active === "desc" ? ArrowDown : ArrowUpDown;
  return (
    <button
      type="button"
      onClick={() => list.toggleSort(sortKey)}
      aria-label={`Sort by ${label}`}
      className={cn(
        "group inline-flex items-center gap-1 rounded transition-colors hover:text-brand-navy",
        active && "text-brand-navy",
        alignRight && "flex-row-reverse",
      )}
    >
      {label}
      <Icon className={cn("size-3", active ? "opacity-100" : "opacity-0 group-hover:opacity-60")} aria-hidden />
    </button>
  );
}

/**
 * Plain clients-style table. A column named "Actions" is right-aligned. Pass `list`
 * from `useImmList` for sortable headers and the pagination footer.
 */
export function ImmRecordTable({
  columns,
  children,
  list,
}: {
  columns: ImmColumn[];
  children: ReactNode;
  list?: ImmListControls;
}) {
  return (
    <ListPageTableSection>
      <ListPageDataTable>
        <ListPageDataTableHeader>
          <ListPageDataTableHeaderRow>
            {columns.map((column, index) => {
              const label = columnLabel(column);
              const config = typeof column === "string" ? null : column;
              const alignRight = label === "Actions" || config?.align === "right";
              return (
                <ListPageDataTableHeaderCell
                  key={`${label}-${index}`}
                  aria-sort={
                    list && config?.sortKey && list.sort?.key === config.sortKey
                      ? list.sort.direction === "asc"
                        ? "ascending"
                        : "descending"
                      : undefined
                  }
                  className={cn(
                    index === 0 && "pl-4 md:pl-6",
                    alignRight && "text-right",
                    label === "Actions" && "pr-4 md:pr-6",
                    config?.className,
                  )}
                >
                  {config?.header ??
                    (list && config?.sortKey ? (
                      <SortHeader label={label} sortKey={config.sortKey} list={list} alignRight={alignRight} />
                    ) : (
                      label
                    ))}
                </ListPageDataTableHeaderCell>
              );
            })}
          </ListPageDataTableHeaderRow>
        </ListPageDataTableHeader>
        <ListPageDataTableBody>{children}</ListPageDataTableBody>
      </ListPageDataTable>
      {list && list.matched > list.pageSize ? (
        <ListPagePagination
          page={list.page}
          pageSize={list.pageSize}
          totalCount={list.matched}
          hasPrevious={list.page > 1}
          hasNext={list.page * list.pageSize < list.matched}
          onPageChange={list.setPage}
        />
      ) : null}
    </ListPageTableSection>
  );
}

/** Two-line primary cell: name on top, code or detail below. */
export function ImmPrimaryCell({ title, detail }: { title: ReactNode; detail?: ReactNode }) {
  return (
    <>
      <p className="font-medium text-brand-navy">{title}</p>
      {detail ? <p className="text-[12px] text-dash-muted">{detail}</p> : null}
    </>
  );
}

const STATUS_TONE: Record<string, string> = {
  overdue: "bg-red-50 text-red-700",
  urgent: "bg-red-50 text-red-700",
  expired: "bg-red-50 text-red-700",
  recalled: "bg-red-50 text-red-700",
  not_cleared: "bg-red-50 text-red-700",
  non_responder: "bg-red-50 text-red-700",
  fail: "bg-red-50 text-red-700",
  refused: "bg-red-50 text-red-700",
  due: "bg-amber-50 text-amber-800",
  high: "bg-amber-50 text-amber-800",
  medium: "bg-amber-50 text-amber-800",
  expiring: "bg-amber-50 text-amber-800",
  pending: "bg-amber-50 text-amber-800",
  low_stock: "bg-amber-50 text-amber-800",
  conditional: "bg-amber-50 text-amber-800",
  in_progress: "bg-sky-50 text-sky-700",
  planned: "bg-sky-50 text-sky-700",
  stub: "bg-sky-50 text-sky-700",
  open: "bg-sky-50 text-sky-700",
  up_to_date: "bg-emerald-50 text-emerald-700",
  cleared: "bg-emerald-50 text-emerald-700",
  complete: "bg-emerald-50 text-emerald-700",
  done: "bg-emerald-50 text-emerald-700",
  pass: "bg-emerald-50 text-emerald-700",
  in_stock: "bg-emerald-50 text-emerald-700",
  published: "bg-emerald-50 text-emerald-700",
  low: "bg-emerald-50 text-emerald-700",
  given: "bg-emerald-50 text-emerald-700",
};

/** Small status pill matching the clients table badges. */
export function ImmStatusBadge({ status, label }: { status: string; label?: string }) {
  const key = status.toLowerCase();
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[12px] font-medium",
        STATUS_TONE[key] ?? "bg-dash-canvas text-brand-slate",
      )}
    >
      {label ?? humanize(status)}
    </span>
  );
}

export function humanize(value: string): string {
  const text = value.replace(/_/g, " ").trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "—";
}

/** Text action used in the right-aligned Actions column. */
export function ImmRowAction({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className="text-[13px] font-medium text-brand-primary hover:underline disabled:opacity-50"
    >
      {children}
    </button>
  );
}

/** Row checkbox that does not trigger the row click. */
export function ImmSelectBox({
  checked,
  indeterminate = false,
  onChange,
  label,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <input
      type="checkbox"
      aria-label={label}
      checked={checked}
      ref={(node) => {
        if (node) node.indeterminate = indeterminate;
      }}
      onClick={(event) => event.stopPropagation()}
      onChange={onChange}
      className="size-3.5 cursor-pointer accent-brand-primary"
    />
  );
}
