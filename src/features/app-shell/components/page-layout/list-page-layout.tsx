import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type ListPageLayoutProps = {
  children: ReactNode;
  className?: string;
  "data-testid"?: string;
};

export function ListPageLayout({
  children,
  className,
  "data-testid": dataTestId,
}: ListPageLayoutProps) {
  return (
    <div
      className={cn(
        "flex h-full min-h-0 w-full flex-col overflow-auto bg-white pb-20 sm:pb-4",
        "[&>*:not([data-list-band])]:px-4 [&>*:not([data-list-band])]:py-4 [&>*:not([data-list-band])]:md:px-6",
        className,
      )}
      data-testid={dataTestId}
    >
      {children}
    </div>
  );
}
