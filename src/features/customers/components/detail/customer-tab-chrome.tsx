import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  PAGE_STAT_LABEL_CLASS,
  PAGE_STAT_VALUE_CLASS,
} from "@/features/app-shell/components/page-layout";
import { cn } from "@/lib/utils";

/** Pulls a band out to the edges of the detail tab padding. */
export const CUSTOMER_TAB_BLEED_CLASS = "-mx-4 sm:-mx-6";

export function CustomerTabActions({ children }: { children: ReactNode }) {
  return <div className="flex justify-end">{children}</div>;
}

type CustomerTabStatBandProps = {
  children: ReactNode;
  "data-testid"?: string;
};

export function CustomerTabStatBand({
  children,
  "data-testid": dataTestId,
}: CustomerTabStatBandProps) {
  return (
    <dl
      className={cn(
        CUSTOMER_TAB_BLEED_CLASS,
        "grid grid-cols-2 border-b border-dash-border sm:grid-cols-4 sm:divide-x sm:divide-dash-border",
      )}
      data-testid={dataTestId}
    >
      {children}
    </dl>
  );
}

type CustomerTabStatProps = {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  accent?: boolean;
};

export function CustomerTabStat({
  label,
  value,
  hint,
  accent = false,
}: CustomerTabStatProps) {
  return (
    <div className="min-w-0 px-4 py-4 sm:px-6">
      <dt className={PAGE_STAT_LABEL_CLASS}>{label}</dt>
      <dd
        className={cn(
          PAGE_STAT_VALUE_CLASS,
          "text-xl",
          accent && "text-brand-primary",
        )}
      >
        {value}
      </dd>
      {hint ? <p className="mt-1 text-[12px] text-dash-muted">{hint}</p> : null}
    </div>
  );
}

type CustomerTabErrorProps = {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
};

export function CustomerTabError({
  message,
  onRetry,
  retryLabel = "Try again",
}: CustomerTabErrorProps) {
  return (
    <div className="space-y-3">
      <p role="alert" className="text-sm text-red-700">
        {message}
      </p>
      {onRetry ? (
        <Button type="button" variant="outline" onClick={onRetry}>
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}
