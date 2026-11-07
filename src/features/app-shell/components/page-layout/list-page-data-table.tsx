import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { cn } from "@/lib/utils";

export type ListPageDataTableVariant = "card" | "plain";

type ListPageDataTableProps = {
  children: ReactNode;
  className?: string;
  variant?: ListPageDataTableVariant;
};

export function ListPageDataTable({
  children,
  className,
  variant = "plain",
}: ListPageDataTableProps) {
  return (
    <div
      className={cn(
        variant === "card"
          ? "overflow-hidden rounded-xl border border-dash-border bg-dash-panel"
          : "w-full overflow-hidden",
        className,
      )}
    >
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-[13px] leading-tight">
          {children}
        </table>
      </div>
    </div>
  );
}

export function ListPageDataTableHeader({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <thead className={cn(className)}>{children}</thead>;
}

export function ListPageDataTableHeaderRow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <tr
      className={cn(
        "border-b border-dash-border bg-white",
        className,
      )}
    >
      {children}
    </tr>
  );
}

export function ListPageDataTableHeaderCell({
  className,
  ...props
}: ComponentPropsWithoutRef<"th">) {
  return (
    <th
      scope="col"
      className={cn(
        "h-8 whitespace-nowrap px-3 text-left align-middle text-[12px] font-medium text-dash-muted",
        className,
      )}
      {...props}
    />
  );
}

export function ListPageDataTableBody({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <tbody className={cn(className)}>
      {children}
    </tbody>
  );
}

export function ListPageDataTableRow({
  className,
  ...props
}: ComponentPropsWithoutRef<"tr">) {
  return (
    <tr
      className={cn(
        "border-b border-dash-border/70 transition-colors last:border-b-0 hover:bg-brand-tint/50",
        className,
      )}
      {...props}
    />
  );
}

export function ListPageDataTableCell({
  className,
  ...props
}: ComponentPropsWithoutRef<"td">) {
  return (
    <td
      className={cn("px-3 py-1.5 align-middle text-[13px] text-brand-slate", className)}
      {...props}
    />
  );
}
