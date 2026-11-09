"use client";

import type { ReactNode } from "react";

import {
  ListPageHeaderSection,
  ListPageLayout,
} from "@/features/app-shell/components/page-layout";

export function ImmPageShell({
  title,
  description,
  actions,
  testId,
  children,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
  testId: string;
  children: ReactNode;
}) {
  return (
    <ListPageLayout data-testid={testId}>
      <ListPageHeaderSection className="bg-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-brand-navy">{title}</h1>
            <p className="text-[13px] text-dash-muted">{description}</p>
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      </ListPageHeaderSection>
      <div className="space-y-4">{children}</div>
    </ListPageLayout>
  );
}
