import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type ListPageLayoutProps = {
  children: ReactNode;
  className?: string;
  "data-testid"?: string;
  /** Pin the header and pagination, and scroll the table rows. */
  fill?: boolean;
};

export function ListPageLayout({
  children,
  className,
  "data-testid": dataTestId,
  fill = false,
}: ListPageLayoutProps) {
  return (
    <div
      data-list-fill={fill ? "" : undefined}
      className={cn(
        fill
          ? "flex h-auto min-h-0 w-full flex-1 flex-col overflow-hidden bg-white"
          : "flex h-full min-h-0 w-full flex-col overflow-auto bg-white pb-20 sm:pb-4",
        "[&>*:not([data-list-band])]:px-4 [&>*:not([data-list-band])]:py-4 [&>*:not([data-list-band])]:md:px-6",
        className,
      )}
      data-testid={dataTestId}
    >
      {children}
    </div>
  );
}
