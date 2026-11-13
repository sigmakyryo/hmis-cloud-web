import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type DetailPageLayoutProps = {
  children: ReactNode;
  className?: string;
  "data-testid"?: string;
  /**
   * When true, the page body does not scroll as a whole. Children manage
   * their own overflow (theatre's split sidebar and main panes).
   */
  lockScroll?: boolean;
};

export function DetailPageLayout({
  children,
  className,
  "data-testid": dataTestId,
  lockScroll = false,
}: DetailPageLayoutProps) {
  return (
    <div
      data-page-surface="card"
      className={cn("flex min-h-0 w-full flex-1 flex-col", className)}
      data-testid={dataTestId}
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
        <div
          className={cn(
            "min-h-0 flex-1",
            lockScroll
              ? "flex flex-col overflow-hidden"
              : "overflow-auto pb-20 xl:pb-0",
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
